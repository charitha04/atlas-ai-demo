"""
FastAPI backend exposing the DMS chatbot logic (Stephen Wade Group).

Quickstart:
  cd nextgen-sm-demo/backend
  pip install -r requirements.txt
  cp .env.example .env          # then fill in your ANTHROPIC_API_KEY
  uvicorn api:app --reload --port 8000
"""
import os
import re
import json
import logging
import threading
from pathlib import Path

import duckdb
import joblib
import numpy as np
import pandas as pd
import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables from backend/.env (or the process environment)
load_dotenv(Path(__file__).resolve().parent / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------
# Paths & availability flags
#
# DMS_DATA_DIR  – set this env var to the absolute path of your
#                 dms_data/ folder when running outside chatbot_files/.
#                 Defaults to a dms_data/ folder next to this file.
# ---------------------------------------------------------------
PROJECT_DIR = Path(__file__).resolve().parent
_dms_env = os.getenv("DMS_DATA_DIR")
DMS_PARQUET_DIR_DEFAULT = _dms_env if _dms_env else str(PROJECT_DIR / "dms_data")
DMS_PARQUET_AVAILABLE = Path(DMS_PARQUET_DIR_DEFAULT).exists()

_retention_env = os.getenv("RETENTION_DATA_DIR")
_retention_base = Path(_retention_env) if _retention_env else PROJECT_DIR
RETENTION_DATA_PATH = str(_retention_base / "synthetic_customer_retention.csv")
RETENTION_MODEL_PATH = str(_retention_base / "retention_model.joblib")
RETENTION_DATA_AVAILABLE = Path(RETENTION_DATA_PATH).exists()
RETENTION_MODEL_AVAILABLE = Path(RETENTION_MODEL_PATH).exists()

# ---------------------------------------------------------------
# LLM client (Anthropic only)
# ---------------------------------------------------------------
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise RuntimeError(
        "ANTHROPIC_API_KEY is not set. "
        "Add it to backend/.env or export it in your shell before starting the server."
    )

anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

MODEL_OPTIONS: dict[str, dict] = {
    "Atlas AI": {"provider": "anthropic", "model": "claude-opus-4-6"},
}

DEFAULT_MODEL_NAME = next(iter(MODEL_OPTIONS)) if MODEL_OPTIONS else "No API key set"

RESULT_LIMIT = 200


# ---------------------------------------------------------------
# DMS date range cache — loaded once at startup
# ---------------------------------------------------------------
def _load_dms_date_ranges() -> dict[str, dict]:
    """Query min/max dates from each DMS table so we can tell users what period we have data for."""
    if not DMS_PARQUET_AVAILABLE:
        return {}
    ranges: dict[str, dict] = {}
    _table_date_cols = {
        "dms_service": "open_date",
        "dms_appointments": "appointment_date",
        "dms_sales": "booked_date",
        "dms_inventory": "inventory_date",
    }
    try:
        con = duckdb.connect()
        _create_dms_parquet_views(con, DMS_PARQUET_DIR_DEFAULT)
        for table, date_col in _table_date_cols.items():
            try:
                row = con.execute(
                    f"SELECT MIN({date_col}), MAX({date_col}) FROM {table}"
                ).fetchone()
                if row and row[0] and row[1]:
                    ranges[table] = {"min": str(row[0]), "max": str(row[1])}
            except Exception:
                pass
        con.close()
    except Exception:
        pass
    return ranges


# DMS_DATE_RANGES is populated after _create_dms_parquet_views is defined below.
DMS_DATE_RANGES: dict[str, dict] = {}
FORBIDDEN = r"\b(drop|delete|update|insert|alter|create|truncate|attach|detach|copy|grant|revoke)\b"

# ---------------------------------------------------------------
# Retention feature columns (must match training order)
# ---------------------------------------------------------------
RETENTION_FEATURE_COLUMNS = [
    "times_went_to_dealer",
    "times_went_to_other_repair_shops",
    "days_since_last_visit",
    "avg_spend_per_visit",
    "appointment_no_show_rate",
    "vehicle_age_years",
    "service_visits_last_90d",
]


def load_retention_data() -> pd.DataFrame | None:
    if not RETENTION_DATA_AVAILABLE:
        return None
    df = pd.read_csv(RETENTION_DATA_PATH)
    if RETENTION_MODEL_AVAILABLE:
        payload = joblib.load(RETENTION_MODEL_PATH)
        model = payload.get("model")
        feature_columns = payload.get("feature_columns", RETENTION_FEATURE_COLUMNS)
        missing = [c for c in feature_columns if c not in df.columns]
        if not missing and model is not None:
            preds = model.predict(df[feature_columns])
            df["predicted_retention_score"] = np.clip(np.round(preds), 0, 100).astype(int)
            df["retention_risk"] = pd.cut(
                df["predicted_retention_score"],
                bins=[-1, 39, 79, 100],
                labels=["high_risk", "medium_risk", "low_risk"],
            )
    return df


retention_df = load_retention_data()

# ---------------------------------------------------------------
# Legacy empty DataFrames (for parity with app_4.py)
# ---------------------------------------------------------------
dms_vehicle_df = pd.DataFrame(
    columns=["vin", "account_accountid", "account_authenticomaccountid", "account_lastupdated"]
)
dms_open_ro_df = pd.DataFrame(
    columns=["vin", "ro_number", "open_date", "repair_order_mileage",
             "operation_codes", "operation_code_descriptions", "ro_status"]
)

# ---------------------------------------------------------------
# Table documentation
# ---------------------------------------------------------------
TABLE_DOCS: dict[str, dict] = {
    "customer_retention": {
        "description": "Synthetic customer retention dataset with ML-predicted retention scores.",
        "columns": {
            "rooftop_id": "Rooftop/dealership UUID identifier.",
            "rooftop_name": "Dealership name (e.g. Stephen Wade Nissan).",
            "dms_id": "DMS dealer identifier.",
            "imei": "Device IMEI number (unique per customer/device, 15-digit).",
            "times_went_to_dealer": "Number of dealer visits.",
            "times_went_to_other_repair_shops": "Number of non-dealer visits.",
            "days_since_last_visit": "Days since last service visit.",
            "avg_spend_per_visit": "Average spend per dealer visit.",
            "appointment_no_show_rate": "No-show rate for appointments (0–1).",
            "vehicle_age_years": "Vehicle age in years.",
            "service_visits_last_90d": "Service visits in the last 90 days.",
            "retention_score": "Original synthetic target score (0–100).",
            "predicted_retention_score": "ML-predicted retention score (0–100).",
            "retention_risk": "Risk bucket derived from predicted_retention_score.",
        },
    },
    "dms_appointments": {
        "description": "DMS appointment records. Each row is a scheduled service appointment.",
        "columns": {
            "vin": "Vehicle Identification Number.",
            "customer_number": "DMS customer identifier.",
            "customer_name": "Full name of the customer.",
            "appointment_number": "Appointment identifier in the DMS.",
            "appointment_time": "Scheduled appointment time.",
            "appointment_mileage": "Odometer/mileage captured at appointment time.",
            "operation_code_description": "What service was booked (main field for service type search).",
            "service_advisor_name": "Name of the service advisor.",
            "make": "Vehicle make.", "model": "Vehicle model.", "year": "Vehicle model year.",
            "exterior_color": "Exterior color.", "dealer_name": "Dealer name.",
            "dv_dealer_id": "Dealer identifier.", "city": "Customer city.",
            "state": "Customer state.", "zip": "Customer zip code.",
            "appointment_date_raw": "Appointment date as raw string.", "appointment_date": "Appointment date (DATE).",
            "appointment_create_date_raw": "Create date (raw).", "appointment_create_date": "Create date (DATE).",
        },
    },
    "dms_service": {
        "description": "DMS service repair-order records.",
        "columns": {
            "vin": "Vehicle Identification Number.", "customer_number": "DMS customer identifier.",
            "customer_name": "Full name of the customer.", "ro_number": "Repair order number.",
            "open_date_raw": "RO open date (raw).", "open_date": "RO open date (DATE).",
            "close_date_raw": "RO close date (raw).", "close_date": "RO close date (DATE).",
            "ro_mileage": "Mileage at open.", "mileage_out": "Mileage at close.",
            "operation_codes": "Pipe-delimited operation codes.",
            "operation_code_descriptions": "Pipe-delimited service descriptions (main field).",
            "part_description": "Parts used.", "part_number": "Part numbers.",
            "service_advisor_name": "Service advisor.", "payment_method": "Payment method.",
            "stock_number": "Stock number.", "make": "Vehicle make.", "model": "Vehicle model.",
            "year": "Year.", "exterior_color": "Exterior color.", "new_or_used": "N=new, U=used.",
            "dealer_name": "Dealer name.", "dv_dealer_id": "Dealer ID.",
            "city": "City.", "state": "State.", "zip": "ZIP.",
            "customer_labor_sale": "Labor sale.", "customer_parts_sale": "Parts sale.",
            "customer_total_cost": "Total cost.", "customer_total_sale": "Total sale.",
            "total_sale": "Grand total sale.", "total_cost": "Grand total cost.",
            "warranty_total_sale": "Warranty sale.", "internal_total_sale": "Internal sale.",
        },
    },
    "dms_inventory": {
        "description": "DMS inventory records. Each row is a vehicle on or off the lot.",
        "columns": {
            "vin": "VIN.", "stock_number": "Stock number.", "make": "Make.", "model": "Model.",
            "year": "Year.", "trim": "Trim.", "vehicle_status": "Inventory status.", "location": "Lot/location.",
            "description": "Description.", "odometer": "Odometer.", "list_price": "Listed price.",
            "internet_price": "Internet price.", "msrp": "MSRP.", "exterior_color": "Exterior color.",
            "interior_color": "Interior color.", "fuel_type": "Fuel type.", "transmission": "Transmission.",
            "dealer_name": "Dealer.", "dv_dealer_id": "Dealer ID.",
            "inventory_date_raw": "Inventory date (raw).", "inventory_date": "Inventory date (DATE).",
            "sold_date_raw": "Sold date (raw).", "sold_date": "Sold date (DATE, null if not sold).",
            "purchase_date_raw": "Purchase date (raw).", "purchase_date": "Purchase date (DATE).",
        },
    },
    "dms_sales": {
        "description": "DMS sales transaction records.",
        "columns": {
            "vin": "VIN.", "customer_number": "Buyer DMS ID.", "customer_name": "Buyer name.",
            "stock_number": "Stock number.", "make": "Make.", "model": "Model.", "year": "Year.",
            "mileage": "Mileage at sale.", "list_price": "List price.", "gross_profit": "Gross profit.",
            "total_profit": "Total profit.", "front_gross": "Front-end gross.", "back_gross": "Back-end gross.",
            "city": "City.", "state": "State.", "dealer_name": "Dealer.", "dv_dealer_id": "Dealer ID.",
            "booked_date_raw": "Booked date (raw).", "booked_date": "Booked date (DATE).",
            "accounting_date_raw": "Accounting date (raw).", "accounting_date": "Accounting date (DATE).",
        },
    },
    "dms_events": {
        "description": "Unified DMS activity stream across appointments, service, inventory, and sales.",
        "columns": {
            "source_dataset": "Which dataset: appointments, service, inventory, or sales.",
            "vin": "VIN.", "customer_number": "Customer ID.", "customer_name": "Customer name.",
            "event_date_raw": "Event date (raw).", "event_date": "Event date (DATE).",
            "ro_number": "RO number (service only).", "appointment_number": "Appointment number (appointments only).",
            "service_description": "Service/operation description.",
            "make": "Make.", "model": "Model.", "year": "Year.",
            "dealer_name": "Dealer.", "dv_dealer_id": "Dealer ID.",
        },
    },
}

DMS_TABLE_ALIASES: dict[str, str] = {
    "service": "dms_service", "appointments": "dms_appointments", "appointment": "dms_appointments",
    "inventory": "dms_inventory", "sales": "dms_sales", "events": "dms_events",
    "activity": "dms_events", "retention": "customer_retention", "churn": "customer_retention",
    "retention score": "customer_retention",
}

# ---------------------------------------------------------------
# SQL helpers
# ---------------------------------------------------------------
DMS_DATE_FORMAT = "%m/%d/%Y"


def _escape_sql_string(value: str) -> str:
    return (value or "").replace("'", "''")


def _quote_sql_identifier(identifier: str) -> str:
    return '"' + str(identifier).replace('"', '""') + '"'


def _normalize_sql_identifier(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", str(name)).strip("_").lower()
    if not s:
        return "col"
    if s[0].isdigit():
        s = f"col_{s}"
    return s


def _create_dms_parquet_views(con: duckdb.DuckDBPyConnection, dms_parquet_dir: str) -> dict:
    base = Path(dms_parquet_dir).expanduser()
    if not base.exists() or not base.is_dir():
        return {"loaded": False, "error": f"DMS parquet directory not found: {base}"}

    def parquet_glob(subdir: str) -> str:
        return _escape_sql_string(str(base / subdir / "*.parquet"))

    def date_expr(raw_col: str, alias: str) -> str:
        raw_q = _quote_sql_identifier(raw_col)
        return f"CAST(try_strptime(NULLIF({raw_q}, ''), '{DMS_DATE_FORMAT}') AS DATE) AS {alias}"

    def raw_expr(raw_col: str, alias: str) -> str:
        return f"{_quote_sql_identifier(raw_col)} AS {alias}"

    con.execute(f"""
        CREATE OR REPLACE VIEW dms_appointments AS
        SELECT
            {raw_expr("VIN","vin")}, {raw_expr("Customer Number","customer_number")},
            {raw_expr("Full Name","customer_name")}, {raw_expr("Appointment Number","appointment_number")},
            {raw_expr("Appointment Time","appointment_time")}, {raw_expr("Appointment Mileage","appointment_mileage")},
            {raw_expr("Operation Code Description","operation_code_description")},
            {raw_expr("Service Advisor Name","service_advisor_name")},
            {raw_expr("Make","make")}, {raw_expr("Model","model")}, {raw_expr("Year","year")},
            {raw_expr("Exterior Color","exterior_color")}, {raw_expr("dealer_name","dealer_name")},
            {raw_expr("DV Dealer ID","dv_dealer_id")}, {raw_expr("City","city")},
            {raw_expr("State","state")}, {raw_expr("Zip","zip")},
            {raw_expr("Appointment Date","appointment_date_raw")}, {date_expr("Appointment Date","appointment_date")},
            {raw_expr("Appointment Create Date","appointment_create_date_raw")},
            {date_expr("Appointment Create Date","appointment_create_date")},
            {raw_expr("RO Number","ro_number")},
            {raw_expr("Promise Date","promise_date_raw")}, {date_expr("Promise Date","promise_date")},
            {raw_expr("Promise Time","promise_time")},
            {raw_expr("Estimate Amount","estimate_amount")},
            {raw_expr("Loaner Flag","loaner_flag")},
            {raw_expr("Waiting Flag","waiting_flag")},
            {raw_expr("Sale Type","sale_type")}
        FROM read_parquet('{parquet_glob("appointments")}')
    """)

    con.execute(f"""
        CREATE OR REPLACE VIEW dms_service AS
        SELECT
            {raw_expr("VIN","vin")}, {raw_expr("Customer Number","customer_number")},
            {raw_expr("Full Name","customer_name")}, {raw_expr("RO Number","ro_number")},
            {raw_expr("RO Status","ro_status")}, {raw_expr("RO Department","ro_department")},
            {raw_expr("Open Date","open_date_raw")}, {date_expr("Open Date","open_date")},
            {raw_expr("Close Date","close_date_raw")}, {date_expr("Close Date","close_date")},
            {raw_expr("Promise Date","promise_date_raw")}, {date_expr("Promise Date","promise_date")},
            {raw_expr("Pickup Date","pickup_date_raw")}, {date_expr("Pickup Date","pickup_date")},
            {raw_expr("RO Mileage","ro_mileage")}, {raw_expr("Mileage Out","mileage_out")},
            {raw_expr("Operation Codes","operation_codes")},
            {raw_expr("Operation Code Descriptions","operation_code_descriptions")},
            {raw_expr("Operation Sale Types","operation_sale_types")},
            {raw_expr("Recommendations","recommendations")},
            {raw_expr("Recommended Operation Codes","recommended_operation_codes")},
            {raw_expr("Part Description","part_description")}, {raw_expr("Part Number","part_number")},
            {raw_expr("Service Advisor Name","service_advisor_name")},
            {raw_expr("Tech Name","tech_name")}, {raw_expr("Tech Number","tech_number")},
            {raw_expr("Labor Bill Hours","labor_bill_hours")},
            {raw_expr("Labor Tech Hours","labor_tech_hours")},
            {raw_expr("Labor Bill Rate","labor_bill_rate")},
            {raw_expr("Labor Tech Rate","labor_tech_rate")},
            {raw_expr("Appointment Flag","appointment_flag")},
            {raw_expr("Upsell","upsell")},
            {raw_expr("Payment Method","payment_method")},
            {raw_expr("Stock Number","stock_number")}, {raw_expr("Make","make")},
            {raw_expr("Model","model")}, {raw_expr("Year","year")},
            {raw_expr("Exterior Color","exterior_color")}, {raw_expr("New/Used","new_or_used")},
            {raw_expr("dealer_name","dealer_name")}, {raw_expr("DV Dealer ID","dv_dealer_id")},
            {raw_expr("City","city")}, {raw_expr("State","state")}, {raw_expr("Zip","zip")},
            {raw_expr("Customer Labor Sale","customer_labor_sale")},
            {raw_expr("Customer Parts Sale","customer_parts_sale")},
            {raw_expr("Customer Misc Sale","customer_misc_sale")},
            {raw_expr("Customer Sublet Sale","customer_sublet_sale")},
            {raw_expr("Customer Total Cost","customer_total_cost")},
            {raw_expr("Customer Total Sale","customer_total_sale")},
            {raw_expr("Total Sale","total_sale")}, {raw_expr("Total Cost","total_cost")},
            {raw_expr("Total Labor Sale","total_labor_sale")},
            {raw_expr("Total Parts Sale","total_parts_sale")},
            {raw_expr("Total Misc Sale","total_misc_sale")},
            {raw_expr("Total Sublet Sale","total_sublet_sale")},
            {raw_expr("Total Gas/Oil/Grease Sale","total_gas_oil_grease_sale")},
            {raw_expr("Warranty Total Sale","warranty_total_sale")},
            {raw_expr("Warranty Labor Sale","warranty_labor_sale")},
            {raw_expr("Warranty Parts Sale","warranty_parts_sale")},
            {raw_expr("Internal Total Sale","internal_total_sale")},
            {raw_expr("Internal Labor Sale","internal_labor_sale")},
            {raw_expr("Internal Parts Sale","internal_parts_sale")}
        FROM read_parquet('{parquet_glob("service")}')
    """)

    con.execute(f"""
        CREATE OR REPLACE VIEW dms_inventory AS
        SELECT
            {raw_expr("VIN","vin")}, {raw_expr("Stock Number","stock_number")},
            {raw_expr("Make","make")}, {raw_expr("Model","model")}, {raw_expr("Year","year")},
            {raw_expr("Trim","trim")}, {raw_expr("Vehicle Status","vehicle_status")},
            {raw_expr("Vehicle Type","vehicle_type")}, {raw_expr("Category","category")},
            {raw_expr("Certification","certification")},
            {raw_expr("Location","location")}, {raw_expr("Description","description")},
            {raw_expr("Odometer","odometer")}, {raw_expr("List Price","list_price")},
            {raw_expr("Internet Price","internet_price")}, {raw_expr("MSRP","msrp")},
            {raw_expr("Cost","cost")}, {raw_expr("Wholesale","wholesale")},
            {raw_expr("Exterior Color","exterior_color")}, {raw_expr("Interior Color","interior_color")},
            {raw_expr("Fuel Type","fuel_type")}, {raw_expr("Transmission","transmission")},
            {raw_expr("Open RO Number","open_ro_number")},
            {raw_expr("dealer_name","dealer_name")}, {raw_expr("DV Dealer ID","dv_dealer_id")},
            {raw_expr("Inventory Date","inventory_date_raw")}, {date_expr("Inventory Date","inventory_date")},
            {raw_expr("Sold Date","sold_date_raw")}, {date_expr("Sold Date","sold_date")},
            {raw_expr("Purchase Date","purchase_date_raw")}, {date_expr("Purchase Date","purchase_date")}
        FROM read_parquet('{parquet_glob("inventory")}')
    """)

    con.execute(f"""
        CREATE OR REPLACE VIEW dms_sales AS
        SELECT
            {raw_expr("VIN","vin")}, {raw_expr("Customer Number","customer_number")},
            {raw_expr("Full Name","customer_name")}, {raw_expr("Stock Number","stock_number")},
            {raw_expr("Deal Number","deal_number")}, {raw_expr("Deal Status","deal_status")},
            {raw_expr("Deal Type","deal_type")}, {raw_expr("Sale Type","sale_type")},
            {raw_expr("New/Used","new_or_used")},
            {raw_expr("Make","make")}, {raw_expr("Model","model")}, {raw_expr("Year","year")},
            {raw_expr("Mileage","mileage")}, {raw_expr("Sales Price","sales_price")},
            {raw_expr("List Price","list_price")}, {raw_expr("MSRP","msrp")},
            {raw_expr("Front Gross","front_gross")}, {raw_expr("Back Gross","back_gross")},
            {raw_expr("Gross Profit","gross_profit")}, {raw_expr("Total Profit","total_profit")},
            {raw_expr("Finance Profit","finance_profit")},
            {raw_expr("Finance Reserve","finance_reserve")},
            {raw_expr("Total Warranty Profit","total_warranty_profit")},
            {raw_expr("Salesman 1 Name","salesman_1_name")},
            {raw_expr("Salesman 2 Name","salesman_2_name")},
            {raw_expr("Finance Manager Name","finance_manager_name")},
            {raw_expr("Closing Manager Name","closing_manager_name")},
            {raw_expr("City","city")}, {raw_expr("State","state")},
            {raw_expr("dealer_name","dealer_name")}, {raw_expr("DV Dealer ID","dv_dealer_id")},
            {raw_expr("Contract Date","contract_date_raw")}, {date_expr("Contract Date","contract_date")},
            {raw_expr("Delivery Date","delivery_date_raw")}, {date_expr("Delivery Date","delivery_date")},
            {raw_expr("Booked Date","booked_date_raw")}, {date_expr("Booked Date","booked_date")},
            {raw_expr("Accounting Date","accounting_date_raw")}, {date_expr("Accounting Date","accounting_date")}
        FROM read_parquet('{parquet_glob("sales")}')
    """)

    con.execute("""
        CREATE OR REPLACE VIEW dms_events AS
        SELECT 'appointments' AS source_dataset, vin, customer_number, customer_name,
               appointment_date AS event_date, appointment_date_raw AS event_date_raw,
               NULL AS ro_number, appointment_number,
               operation_code_description AS service_description,
               make, model, year, dealer_name, dv_dealer_id
        FROM dms_appointments
        UNION ALL
        SELECT 'service', vin, customer_number, customer_name,
               COALESCE(close_date, open_date), COALESCE(close_date_raw, open_date_raw),
               ro_number, NULL, operation_code_descriptions, make, model, year, dealer_name, dv_dealer_id
        FROM dms_service
        UNION ALL
        SELECT 'inventory', vin, NULL, NULL,
               COALESCE(sold_date, inventory_date), COALESCE(sold_date_raw, inventory_date_raw),
               NULL, NULL, description, make, model, year, dealer_name, dv_dealer_id
        FROM dms_inventory
        UNION ALL
        SELECT 'sales', vin, customer_number, customer_name,
               COALESCE(booked_date, accounting_date), COALESCE(booked_date_raw, accounting_date_raw),
               NULL, NULL, NULL, make, model, year, dealer_name, dv_dealer_id
        FROM dms_sales
    """)

    return {"loaded": True, "error": None, "base_dir": str(base)}


def _register_dms_parquet_views(con: duckdb.DuckDBPyConnection) -> tuple[bool, str | None]:
    result = _create_dms_parquet_views(con, DMS_PARQUET_DIR_DEFAULT)
    return bool(result.get("loaded")), result.get("error")


# Now that _create_dms_parquet_views is defined, populate the date ranges cache.
DMS_DATE_RANGES.update(_load_dms_date_ranges())


def _create_connection() -> duckdb.DuckDBPyConnection:
    """Create a fresh DuckDB connection with all views registered."""
    con = duckdb.connect()
    con.register("dms_vehicle_data", dms_vehicle_df)
    con.register("dms_open_ro", dms_open_ro_df)
    if retention_df is not None:
        con.register("customer_retention", retention_df)
    if DMS_PARQUET_AVAILABLE:
        _register_dms_parquet_views(con)
    return con


# ---------------------------------------------------------------
# Persistent connection pool (one connection per thread)
# Avoids re-building views on every query while staying thread-safe.
# ---------------------------------------------------------------
_thread_local = threading.local()
_thread_local_lock = threading.Lock()


def _get_connection() -> duckdb.DuckDBPyConnection:
    """Return a thread-local DuckDB connection, creating it once per thread."""
    if not getattr(_thread_local, "con", None):
        _thread_local.con = _create_connection()
    return _thread_local.con


# ---------------------------------------------------------------
# SQL validation
# ---------------------------------------------------------------
def validate_sql(sql: str) -> str:
    s = (sql or "").strip().strip(";")
    if not re.match(r"(?is)^\s*(select|with)\b", s):
        raise ValueError("Only SELECT queries are allowed")
    if re.search(FORBIDDEN, s, flags=re.IGNORECASE):
        raise ValueError("Forbidden SQL detected")
    lower = s.lower()
    if "customer_data" in lower:
        raise ValueError(
            "Unknown table name customer_data. Use DMS tables or customer_retention."
        )
    is_aggregate = any(k in lower for k in ["count(", "avg(", "min(", "max(", "sum("]) or "group by" in lower
    if not is_aggregate and "limit" not in lower:
        s += f" LIMIT {RESULT_LIMIT}"
    return s + ";"


# ---------------------------------------------------------------
# Metadata handler
# ---------------------------------------------------------------
METADATA_QUESTION_PATTERNS = [
    r"\blist\s+(all\s+)?tables\b", r"\bshow\s+(all\s+)?tables\b", r"\bschema\b",
    r"\bdata\s+dictionary\b", r"\blist\s+(all\s+)?columns\b", r"\bshow\s+(all\s+)?columns\b",
    r"\bcolumn\s+names\b", r"\bcolumn\s+types\b", r"\bdata\s+types?\b",
]


def _is_metadata_question(question: str) -> bool:
    q = (question or "").strip().lower()
    return bool(q) and any(re.search(p, q, flags=re.IGNORECASE) for p in METADATA_QUESTION_PATTERNS)


def _detect_target_table(question: str) -> str | None:
    q = (question or "").strip().lower()
    if not q:
        return None
    for table_name in TABLE_DOCS:
        if table_name.lower() in q:
            return table_name
    for alias, table_name in DMS_TABLE_ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", q, flags=re.IGNORECASE):
            return table_name
    return None


def _load_table_columns(con: duckdb.DuckDBPyConnection, table_name: str) -> pd.DataFrame:
    return con.execute(
        """
        SELECT column_name, data_type, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'main' AND table_name = ?
        ORDER BY ordinal_position
        """,
        [table_name],
    ).df()


def _try_cast_money_sql(expr: str) -> str:
    return f"try_cast(regexp_replace(regexp_replace(NULLIF({expr}, ''), '\\\\$', '', 'g'), ',', '', 'g') AS DOUBLE)"


def _compute_table_insights(con: duckdb.DuckDBPyConnection, table_name: str) -> list[str]:
    insights: list[str] = []

    if table_name == "dms_service":
        try:
            stats = con.execute("""
                SELECT COUNT(*) AS row_count, COUNT(DISTINCT vin) AS distinct_vins,
                       COUNT(DISTINCT customer_number) AS distinct_customers,
                       MIN(open_date) AS earliest_date, MAX(open_date) AS latest_date
                FROM dms_service
            """).df()
            if not stats.empty:
                r = stats.iloc[0]
                insights.append(f"- Total repair orders: {int(r.get('row_count', 0)):,}")
                insights.append(f"- Distinct VINs: {int(r.get('distinct_vins', 0)):,}")
                insights.append(f"- Distinct customers: {int(r.get('distinct_customers', 0)):,}")
                insights.append(f"- Date range: {r.get('earliest_date')} to {r.get('latest_date')}")
        except Exception:
            pass

        try:
            top_services = con.execute("""
                SELECT operation_code_descriptions AS service_type, COUNT(*) AS cnt
                FROM dms_service
                WHERE operation_code_descriptions IS NOT NULL AND operation_code_descriptions <> ''
                GROUP BY operation_code_descriptions ORDER BY cnt DESC LIMIT 5
            """).df()
            if not top_services.empty:
                insights.append("- Top service types:")
                for _, row in top_services.iterrows():
                    insights.append(f"  {row['service_type']}: {int(row['cnt']):,}")
        except Exception:
            pass

    elif table_name == "dms_appointments":
        try:
            stats = con.execute("""
                SELECT COUNT(*) AS row_count, COUNT(DISTINCT vin) AS distinct_vins,
                       COUNT(DISTINCT customer_number) AS distinct_customers,
                       MIN(appointment_date) AS earliest_date, MAX(appointment_date) AS latest_date
                FROM dms_appointments
            """).df()
            if not stats.empty:
                r = stats.iloc[0]
                insights.append(f"- Total appointments: {int(r.get('row_count', 0)):,}")
                insights.append(f"- Distinct VINs: {int(r.get('distinct_vins', 0)):,}")
                insights.append(f"- Distinct customers: {int(r.get('distinct_customers', 0)):,}")
                insights.append(f"- Date range: {r.get('earliest_date')} to {r.get('latest_date')}")
        except Exception:
            pass

    elif table_name == "dms_inventory":
        try:
            stats = con.execute("""
                SELECT COUNT(*) AS row_count, COUNT(DISTINCT vin) AS distinct_vins,
                       MIN(inventory_date) AS earliest_date, MAX(inventory_date) AS latest_date,
                       SUM(CASE WHEN sold_date IS NOT NULL THEN 1 ELSE 0 END) AS sold_count
                FROM dms_inventory
            """).df()
            if not stats.empty:
                r = stats.iloc[0]
                insights.append(f"- Total inventory records: {int(r.get('row_count', 0)):,}")
                insights.append(f"- Distinct VINs: {int(r.get('distinct_vins', 0)):,}")
                insights.append(f"- Sold vehicles: {int(r.get('sold_count', 0)):,}")
                insights.append(f"- Date range: {r.get('earliest_date')} to {r.get('latest_date')}")
        except Exception:
            pass

    elif table_name == "dms_sales":
        try:
            stats = con.execute(f"""
                SELECT COUNT(*) AS row_count, COUNT(DISTINCT vin) AS distinct_vins,
                       MIN(booked_date) AS earliest_date, MAX(booked_date) AS latest_date,
                       ROUND(AVG({_try_cast_money_sql('total_profit')}), 2) AS avg_profit
                FROM dms_sales
            """).df()
            if not stats.empty:
                r = stats.iloc[0]
                insights.append(f"- Total sales: {int(r.get('row_count', 0)):,}")
                insights.append(f"- Distinct VINs: {int(r.get('distinct_vins', 0)):,}")
                insights.append(f"- Date range: {r.get('earliest_date')} to {r.get('latest_date')}")
                if r.get('avg_profit') is not None:
                    insights.append(f"- Average profit per deal: ${r['avg_profit']:,.2f}")
        except Exception:
            pass

    elif table_name == "dms_events":
        try:
            stats = con.execute("""
                SELECT COUNT(*) AS row_count, COUNT(DISTINCT vin) AS distinct_vins,
                       MIN(event_date) AS earliest_date, MAX(event_date) AS latest_date
                FROM dms_events
            """).df()
            if not stats.empty:
                r = stats.iloc[0]
                insights.append(f"- Total events: {int(r.get('row_count', 0)):,}")
                insights.append(f"- Distinct VINs: {int(r.get('distinct_vins', 0)):,}")
                insights.append(f"- Date range: {r.get('earliest_date')} to {r.get('latest_date')}")
        except Exception:
            pass

    elif table_name == "customer_retention":
        if retention_df is not None:
            try:
                score_col = "predicted_retention_score" if "predicted_retention_score" in retention_df.columns else "retention_score"
                stats = con.execute(f"""
                    SELECT COUNT(*) AS row_count, ROUND(AVG({score_col}), 1) AS avg_score,
                           SUM(CASE WHEN {score_col} < 40 THEN 1 ELSE 0 END) AS high_risk,
                           SUM(CASE WHEN {score_col} >= 80 THEN 1 ELSE 0 END) AS low_risk
                    FROM customer_retention
                """).df()
                if not stats.empty:
                    r = stats.iloc[0]
                    insights.append(f"- Total customers: {int(r.get('row_count', 0)):,}")
                    insights.append(f"- Average retention score: {r.get('avg_score')}")
                    insights.append(f"- High risk (score < 40): {int(r.get('high_risk', 0)):,}")
                    insights.append(f"- Low risk (score >= 80): {int(r.get('low_risk', 0)):,}")
            except Exception:
                pass

    return insights


def _answer_metadata_question(question: str) -> tuple[str, str]:
    q = (question or "").strip()
    target_table = _detect_target_table(q)
    con = _create_connection()
    debug_sql_parts: list[str] = []

    try:
        if not target_table:
            available_tables: list[tuple[str, str]] = []
            if DMS_PARQUET_AVAILABLE:
                available_tables.extend([
                    ("dms_service", "DMS service repair orders."),
                    ("dms_appointments", "DMS appointments."),
                    ("dms_inventory", "DMS inventory."),
                    ("dms_sales", "DMS sales."),
                    ("dms_events", "Unified DMS activity stream."),
                ])
                if retention_df is not None:
                    available_tables.append(("customer_retention", "Customer retention dataset with ML scores."))

            table_rows: list[tuple[str, int | None, str]] = []
            for tname, desc in available_tables:
                try:
                    cnt = int(con.execute(f"SELECT COUNT(*) FROM {tname}").fetchone()[0])
                    table_rows.append((tname, cnt, desc))
                except Exception:
                    table_rows.append((tname, None, desc))

            lines: list[str] = []
            lines.append("I can answer questions using dealership operational data (DMS exports). This includes appointments, service repair orders, inventory, and sales records.")
            for tname, cnt, desc in table_rows:
                cnt_str = f"{cnt:,}" if isinstance(cnt, int) else "N/A"
                lines.append(f"- {tname} ({cnt_str} rows): {desc}")
            lines.append("")
            lines.append("Ask specific questions like: 'How many repair orders were closed in January?' or 'Which service advisor handled the most ROs?'")
            return "\n".join(lines), "\n".join(debug_sql_parts) or "metadata"

        if target_table not in TABLE_DOCS:
            cols_df = _load_table_columns(con, target_table)
            if cols_df.empty:
                return (f"I couldn't find a table named {target_table}.", "metadata")
            lines = [f"Table {target_table} columns:"]
            for r in cols_df.itertuples(index=False):
                lines.append(f"- {r.column_name} ({r.data_type})")
            return "\n".join(lines), "metadata"

        table_doc = TABLE_DOCS[target_table]
        cols_df = _load_table_columns(con, target_table)
        lines: list[str] = []
        lines.append(f"Table: {target_table}")
        lines.append(table_doc.get("description", "").strip())
        lines.append("")
        lines.append("Columns and meaning:")
        docs_by_column = dict(table_doc.get("columns", {}))
        if cols_df.empty:
            for col_name, desc in docs_by_column.items():
                lines.append(f"- {col_name}: {desc}")
        else:
            for r in cols_df.itertuples(index=False):
                desc = docs_by_column.get(r.column_name, "No description available.")
                lines.append(f"- {r.column_name} ({r.data_type}): {desc}")
        lines.append("")
        lines.append("Insights:")
        insights = _compute_table_insights(con, target_table)
        lines.extend(insights if insights else ["- No computed insights available."])
        return "\n".join(lines), "metadata"
    finally:
        con.close()


# ---------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------
def build_prompt(question: str, conversation_history: list[dict] | None = None) -> str:
    dms_tables_block = ""
    dms_schema_block = ""
    dms_notes_block = ""
    dms_rules_table_list = ""
    if DMS_PARQUET_AVAILABLE:
        dms_tables_block = """
1) dms_appointments (DMS appointments from local Parquet)
2) dms_service (DMS service repair orders from local Parquet)
3) dms_inventory (DMS inventory from local Parquet)
4) dms_sales (DMS sales from local Parquet)
5) dms_events (unified DMS activity stream across the above)
""".rstrip()
        dms_rules_table_list = "dms_appointments, dms_service, dms_inventory, dms_sales, dms_events"
        dms_schema_block = """
━━━━━━━━━━━━━━━━━ TABLE SCHEMAS ━━━━━━━━━━━━━━━━━

dms_service (repair orders — one row per operation line per RO):
  Identity:     vin, customer_number, customer_name, ro_number
  Status:       ro_status ('Open'|'Closed'), ro_department
  Dates:        open_date (DATE), close_date (DATE), promise_date (DATE), pickup_date (DATE)
  Tech/Advisor: service_advisor_name, tech_name, tech_number
  Hours:        labor_bill_hours, labor_tech_hours (VARCHAR — cast to DOUBLE for math)
  Rates:        labor_bill_rate, labor_tech_rate (VARCHAR — cast to DOUBLE)
  Operations:   operation_codes (pipe-delimited e.g. 'ELOF|MPI'), operation_code_descriptions,
                operation_sale_types (pipe-delimited e.g. 'C|C' — C=customer, W=warranty, I=internal)
  Declined:     recommendations, recommended_operation_codes (services advisor suggested but customer declined)
  Flags:        appointment_flag ('Y'/'N'), upsell ('Y'/'N')
  Parts:        part_description, part_number
  Payment:      payment_method
  Vehicle:      make, model, year, exterior_color, new_or_used, stock_number, ro_mileage, mileage_out
  Revenue (all VARCHAR — use try_cast(x AS DOUBLE)):
    customer_labor_sale, customer_parts_sale, customer_misc_sale, customer_sublet_sale,
    customer_total_sale (= customer-pay revenue per line)
    total_sale, total_cost (= total RO line revenue)
    total_labor_sale, total_parts_sale, total_misc_sale, total_sublet_sale
    total_gas_oil_grease_sale
    warranty_total_sale, warranty_labor_sale, warranty_parts_sale
    internal_total_sale, internal_labor_sale, internal_parts_sale
  Location:     dealer_name, dv_dealer_id, city, state, zip

dms_appointments (booked appointments — one row per appointment):
  Identity:     vin, customer_number, customer_name, appointment_number
  Dates:        appointment_date (DATE), appointment_create_date (DATE), promise_date (DATE)
  Times:        appointment_time, promise_time
  Advisor:      service_advisor_name
  Service:      operation_code_description (what was booked)
  Flags:        loaner_flag ('Y'/'N'), waiting_flag ('Y'/'N')
  RO link:      ro_number (ALWAYS EMPTY in this dataset — do NOT use to detect show-ups; use VIN+date join to dms_service instead)
  Estimate:     estimate_amount (VARCHAR)
  Sale type:    sale_type
  Vehicle:      make, model, year, exterior_color, appointment_mileage
  Location:     dealer_name, dv_dealer_id, city, state, zip

dms_inventory (vehicle inventory snapshot — one row per stock number):
  Identity:     vin, stock_number
  Vehicle:      make, model, year, trim, description, vehicle_type, category
  Status:       vehicle_status (e.g. 'In Stock', 'Sold', 'On Order'), certification ('Certified'|'')
  Odometer:     odometer (INTEGER)
  Pricing (all VARCHAR — cast to DOUBLE):
    list_price, internet_price, msrp, cost, wholesale
  Colors:       exterior_color, interior_color
  Specs:        fuel_type, transmission
  Dates:        inventory_date (DATE), sold_date (DATE), purchase_date (DATE)
  Service link: open_ro_number (VINs with an open RO in the shop)
  Location:     location, dealer_name, dv_dealer_id

dms_sales (vehicle sales — one row per deal):
  Identity:     vin, customer_number, customer_name, stock_number, deal_number
  Deal:         deal_status, deal_type, sale_type, new_or_used
  Vehicle:      make, model, year, mileage
  Pricing (all VARCHAR — cast to DOUBLE):
    sales_price, list_price, msrp
    front_gross, back_gross, gross_profit, total_profit
    finance_profit, finance_reserve, total_warranty_profit
  People:       salesman_1_name, salesman_2_name, finance_manager_name, closing_manager_name
  Dates:        booked_date (DATE), accounting_date (DATE), contract_date (DATE), delivery_date (DATE)
  Location:     city, state, dealer_name, dv_dealer_id

dms_events (unified activity stream across all 4 tables):
  source_dataset, vin, customer_number, customer_name
  event_date (DATE), ro_number, appointment_number, service_description
  make, model, year, dealer_name, dv_dealer_id

━━━━━━━━━━━━━━━━━ SQL EXAMPLES BY QUESTION TYPE ━━━━━━━━━━━━━━━━━

-- SERVICE REVENUE TODAY / MOST RECENT DAY
WITH anchor AS (SELECT MAX(close_date) AS latest FROM dms_service WHERE ro_status ILIKE '%clos%')
SELECT ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)),2) AS revenue,
       COUNT(DISTINCT ro_number) AS ro_count
FROM dms_service WHERE close_date = (SELECT latest FROM anchor) AND ro_status ILIKE '%clos%'

-- SERVICE REVENUE THIS WEEK VS LAST WEEK
WITH anchor AS (SELECT MAX(close_date) AS latest FROM dms_service WHERE ro_status ILIKE '%clos%'),
     week_start AS (SELECT DATE_TRUNC('week', (SELECT latest FROM anchor)) AS ws)
SELECT
  CASE WHEN close_date >= (SELECT ws FROM week_start) THEN 'This Week' ELSE 'Last Week' END AS week_label,
  COUNT(DISTINCT ro_number) AS total_ros,
  ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)),2) AS customer_pay_revenue
FROM dms_service
WHERE close_date >= (SELECT ws FROM week_start) - INTERVAL 7 DAY
  AND close_date < (SELECT ws FROM week_start) + INTERVAL 7 DAY
  AND ro_status ILIKE '%clos%'
GROUP BY 1 ORDER BY 1

-- AVERAGE RO VALUE (effective revenue per closed RO)
WITH anchor AS (SELECT DATE_TRUNC('month', MAX(close_date)) AS month_start FROM dms_service WHERE ro_status ILIKE '%clos%')
SELECT ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)) / NULLIF(COUNT(DISTINCT ro_number),0),2) AS avg_ro_value,
       COUNT(DISTINCT ro_number) AS total_ros
FROM dms_service
WHERE close_date >= (SELECT month_start FROM anchor) AND ro_status ILIKE '%clos%'

-- EFFECTIVE LABOR RATE (total labor revenue ÷ billed hours)
WITH anchor AS (SELECT DATE_TRUNC('month', MAX(close_date)) AS m FROM dms_service WHERE ro_status ILIKE '%clos%')
SELECT ROUND(SUM(try_cast(total_labor_sale AS DOUBLE)) / NULLIF(SUM(try_cast(labor_bill_hours AS DOUBLE)),0),2) AS effective_labor_rate,
       ROUND(SUM(try_cast(labor_bill_hours AS DOUBLE)),1) AS total_billed_hours,
       ROUND(SUM(try_cast(total_labor_sale AS DOUBLE)),2) AS total_labor_revenue
FROM dms_service
WHERE close_date >= (SELECT m FROM anchor) AND ro_status ILIKE '%clos%'

-- TOP ADVISOR BY REVENUE
WITH anchor AS (SELECT DATE_TRUNC('month', MAX(close_date)) AS m FROM dms_service WHERE ro_status ILIKE '%clos%')
SELECT service_advisor_name,
       COUNT(DISTINCT ro_number) AS ro_count,
       ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)),2) AS revenue
FROM dms_service
WHERE close_date >= (SELECT m FROM anchor) AND ro_status ILIKE '%clos%'
GROUP BY service_advisor_name ORDER BY revenue DESC LIMIT 10

-- OPEN ROs OVER 3 DAYS OLD (stalled)
WITH anchor AS (SELECT MAX(open_date) AS latest FROM dms_service)
SELECT DISTINCT ro_number, customer_name, vin, make, model, year, service_advisor_name,
       open_date, DATEDIFF('day', open_date, (SELECT latest FROM anchor)) AS days_open
FROM dms_service
WHERE ro_status NOT ILIKE '%clos%' AND open_date IS NOT NULL
  AND DATEDIFF('day', open_date, (SELECT latest FROM anchor)) > 3
ORDER BY days_open DESC

-- OPEN ROs CURRENTLY IN PROGRESS (count + list)
SELECT DISTINCT ro_number, customer_name, vin, make, model, year, open_date,
       service_advisor_name, tech_name, ro_department
FROM dms_service WHERE ro_status NOT ILIKE '%clos%'
ORDER BY open_date

-- TECHNICIAN WITH MOST OPEN JOBS
SELECT tech_name, COUNT(DISTINCT ro_number) AS open_jobs
FROM dms_service WHERE ro_status NOT ILIKE '%clos%' AND tech_name IS NOT NULL AND tech_name != ''
GROUP BY tech_name ORDER BY open_jobs DESC LIMIT 10

-- AVERAGE CYCLE TIME (open to close in days)
WITH anchor AS (SELECT DATE_TRUNC('week', MAX(close_date)) AS wk FROM dms_service WHERE ro_status ILIKE '%clos%')
SELECT ROUND(AVG(DATEDIFF('day', open_date, close_date)),1) AS avg_cycle_days,
       COUNT(DISTINCT ro_number) AS ro_count
FROM dms_service
WHERE close_date >= (SELECT wk FROM anchor) AND ro_status ILIKE '%clos%'
  AND open_date IS NOT NULL AND close_date IS NOT NULL

-- APPOINTMENT SHOW RATE
-- NOTE: ro_number in dms_appointments is always empty. Detect show-ups by joining to dms_service on VIN + date window.
WITH anchor AS (SELECT DATE_TRUNC('week', MAX(appointment_date)) AS wk FROM dms_appointments)
SELECT
  COUNT(DISTINCT a.appointment_number) AS total_appointments,
  COUNT(DISTINCT CASE WHEN s.ro_number IS NOT NULL THEN a.appointment_number END) AS showed_up,
  COUNT(DISTINCT CASE WHEN s.ro_number IS NULL THEN a.appointment_number END) AS no_shows,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN s.ro_number IS NOT NULL THEN a.appointment_number END)
        / NULLIF(COUNT(DISTINCT a.appointment_number), 0), 1) AS show_rate_pct
FROM dms_appointments a
LEFT JOIN dms_service s ON a.vin = s.vin
  AND s.open_date BETWEEN a.appointment_date - INTERVAL 3 DAY AND a.appointment_date + INTERVAL 3 DAY
WHERE a.appointment_date >= (SELECT wk FROM anchor)

-- NO-SHOWS PER ADVISOR
-- NOTE: ro_number in dms_appointments is always empty. Use VIN+date join to dms_service to detect no-shows.
WITH anchor AS (SELECT DATE_TRUNC('week', MAX(appointment_date)) AS wk FROM dms_appointments)
SELECT a.service_advisor_name,
       COUNT(DISTINCT a.appointment_number) AS total_booked,
       COUNT(DISTINCT CASE WHEN s.ro_number IS NULL THEN a.appointment_number END) AS no_shows,
       COUNT(DISTINCT CASE WHEN s.ro_number IS NOT NULL THEN a.appointment_number END) AS showed_up
FROM dms_appointments a
LEFT JOIN dms_service s ON a.vin = s.vin
  AND s.open_date BETWEEN a.appointment_date - INTERVAL 3 DAY AND a.appointment_date + INTERVAL 3 DAY
WHERE a.appointment_date >= (SELECT wk FROM anchor)
GROUP BY a.service_advisor_name ORDER BY no_shows DESC

-- APPOINTMENTS SCHEDULED FOR TOMORROW / NEXT DAY
WITH anchor AS (SELECT MAX(appointment_date) AS latest FROM dms_appointments)
SELECT appointment_date, service_advisor_name, customer_name, vin, make, model,
       operation_code_description, appointment_time, loaner_flag, waiting_flag
FROM dms_appointments
WHERE appointment_date = (SELECT latest + INTERVAL 1 DAY FROM anchor)
ORDER BY appointment_time

-- BREAK DOWN APPOINTMENTS BY ADVISOR (busiest day)
WITH anchor AS (SELECT MAX(appointment_date) AS latest FROM dms_appointments)
SELECT service_advisor_name, COUNT(DISTINCT appointment_number) AS appointments
FROM dms_appointments WHERE appointment_date = (SELECT latest FROM anchor)
GROUP BY service_advisor_name ORDER BY appointments DESC

-- BUSIEST DAY OF THE WEEK
SELECT DAYNAME(appointment_date) AS day_of_week,
       COUNT(DISTINCT appointment_number) AS total_appointments
FROM dms_appointments GROUP BY 1 ORDER BY 2 DESC

-- OIL CHANGES BOOKED THIS WEEK
WITH anchor AS (SELECT DATE_TRUNC('week', MAX(appointment_date)) AS wk FROM dms_appointments)
SELECT COUNT(DISTINCT appointment_number) AS oil_change_appointments
FROM dms_appointments
WHERE appointment_date >= (SELECT wk FROM anchor)
  AND operation_code_description ILIKE '%oil%'

-- HOW FAR OUT ARE WE BOOKED (max future appointment date)
SELECT MAX(appointment_date) AS furthest_booked_date,
       DATEDIFF('day', MIN(appointment_date), MAX(appointment_date)) AS booking_window_days
FROM dms_appointments WHERE appointment_date IS NOT NULL

-- CUSTOMERS WHO CANCELLED TWICE IN 60 DAYS (appointments with no RO, repeated)
WITH anchor AS (SELECT MAX(appointment_date) AS latest FROM dms_appointments),
no_shows AS (
  SELECT customer_number, customer_name, COUNT(DISTINCT appointment_number) AS no_show_count
  FROM dms_appointments
  WHERE (ro_number IS NULL OR ro_number = '')
    AND appointment_date >= (SELECT latest - INTERVAL 60 DAY FROM anchor)
  GROUP BY customer_number, customer_name HAVING COUNT(DISTINCT appointment_number) >= 2
)
SELECT * FROM no_shows ORDER BY no_show_count DESC

-- INVENTORY HEALTH: HOW MANY UNITS CURRENTLY IN STOCK
-- IMPORTANT: vehicle_status='' means ACTIVE/IN STOCK. vehicle_status='NOT IN INVENTORY' means GONE.
-- NEVER filter vehicle_status ILIKE '%stock%' — it returns 0 because the value is empty string, not 'In Stock'.
-- ALWAYS use: vehicle_status NOT ILIKE '%not in%'
-- vehicle_type: 'N'=New, 'U'=Used, 'D'=Demo
SELECT
  COUNT(DISTINCT vin) AS total_units,
  SUM(CASE WHEN vehicle_type = 'N' THEN 1 ELSE 0 END) AS new_units,
  SUM(CASE WHEN vehicle_type = 'U' THEN 1 ELSE 0 END) AS used_units,
  SUM(CASE WHEN vehicle_type = 'D' THEN 1 ELSE 0 END) AS demo_units
FROM dms_inventory
WHERE vehicle_status NOT ILIKE '%not in%'

-- AVERAGE DAYS IN INVENTORY (for units currently in stock)
WITH anchor AS (SELECT MAX(inventory_date) AS latest FROM dms_inventory WHERE inventory_date < DATE '2027-01-01')
SELECT ROUND(AVG(DATEDIFF('day', inventory_date, (SELECT latest FROM anchor))),1) AS avg_days_in_inventory,
       COUNT(DISTINCT vin) AS unit_count
FROM dms_inventory
WHERE vehicle_status NOT ILIKE '%not in%' AND inventory_date IS NOT NULL

-- AGED INVENTORY OVER 60 DAYS
WITH anchor AS (SELECT MAX(inventory_date) AS latest FROM dms_inventory WHERE inventory_date < DATE '2027-01-01')
SELECT stock_number, vin, year, make, model, trim, exterior_color, odometer,
       list_price, inventory_date,
       DATEDIFF('day', inventory_date, (SELECT latest FROM anchor)) AS days_in_inventory
FROM dms_inventory
WHERE vehicle_status NOT ILIKE '%not in%' AND inventory_date IS NOT NULL
  AND DATEDIFF('day', inventory_date, (SELECT latest FROM anchor)) > 60
ORDER BY days_in_inventory DESC

-- TOTAL INVENTORY VALUE
SELECT COUNT(DISTINCT vin) AS units,
       ROUND(SUM(try_cast(list_price AS DOUBLE)),2) AS total_list_value,
       ROUND(SUM(try_cast(cost AS DOUBLE)),2) AS total_cost_value
FROM dms_inventory WHERE vehicle_status NOT ILIKE '%not in%'

-- CERTIFIED VS NON-CERTIFIED
SELECT CASE WHEN certification ILIKE '%certif%' THEN 'Certified' ELSE 'Non-Certified' END AS type,
       COUNT(DISTINCT vin) AS units
FROM dms_inventory WHERE vehicle_status NOT ILIKE '%not in%' GROUP BY 1

-- INVENTORY UNITS UNDER $15,000 WITH UNDER 50K MILES
SELECT stock_number, vin, year, make, model, odometer, list_price, internet_price
FROM dms_inventory
WHERE vehicle_status NOT ILIKE '%not in%'
  AND try_cast(list_price AS DOUBLE) BETWEEN 1 AND 15000
  AND odometer < 50000
ORDER BY try_cast(list_price AS DOUBLE)

-- FASTEST TURNING MODELS (sold quickest relative to time in inventory)
SELECT i.make, i.model,
       ROUND(AVG(DATEDIFF('day', i.inventory_date, s.booked_date)),1) AS avg_days_to_sell,
       COUNT(DISTINCT i.vin) AS units_sold
FROM dms_inventory i JOIN dms_sales s ON i.vin = s.vin
WHERE i.inventory_date IS NOT NULL AND s.booked_date IS NOT NULL
GROUP BY i.make, i.model HAVING COUNT(DISTINCT i.vin) >= 3 ORDER BY avg_days_to_sell

-- CUSTOMER-PAY VS WARRANTY MIX
WITH anchor AS (SELECT DATE_TRUNC('month', MAX(close_date)) AS m FROM dms_service WHERE ro_status ILIKE '%clos%')
SELECT
  ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)),2) AS customer_pay_revenue,
  ROUND(SUM(try_cast(warranty_total_sale AS DOUBLE)),2) AS warranty_revenue,
  ROUND(SUM(try_cast(internal_total_sale AS DOUBLE)),2) AS internal_revenue,
  ROUND(100.0 * SUM(try_cast(customer_total_sale AS DOUBLE))
        / NULLIF(SUM(try_cast(total_sale AS DOUBLE)),0), 1) AS customer_pay_pct
FROM dms_service WHERE close_date >= (SELECT m FROM anchor) AND ro_status ILIKE '%clos%'

-- DECLINED SERVICES (recommendations not taken)
SELECT DISTINCT ro_number, customer_name, vin, make, model, service_advisor_name,
       recommendations, open_date
FROM dms_service
WHERE recommendations IS NOT NULL AND TRIM(recommendations) != ''
ORDER BY open_date DESC LIMIT 50

-- CUSTOMERS WHO DECLINED SERVICE AND HAVE OPEN RECALLS
SELECT DISTINCT s.customer_name, s.vin, s.make, s.model, s.year,
       s.recommendations AS declined_service, s.open_date
FROM dms_service s
WHERE s.recommendations IS NOT NULL AND TRIM(s.recommendations) != ''
  AND s.operation_code_descriptions ILIKE '%recall%'
ORDER BY s.open_date DESC

-- HIGH-VALUE CUSTOMERS WHO HAVEN'T RETURNED IN 6 MONTHS
WITH anchor AS (SELECT MAX(close_date) AS latest FROM dms_service WHERE ro_status ILIKE '%clos%'),
customer_stats AS (
  SELECT customer_number, customer_name,
         MAX(close_date) AS last_visit,
         COUNT(DISTINCT ro_number) AS total_visits,
         ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)),2) AS lifetime_spend
  FROM dms_service WHERE ro_status ILIKE '%clos%' GROUP BY customer_number, customer_name
)
SELECT customer_name, last_visit, total_visits, lifetime_spend,
       DATEDIFF('day', last_visit, (SELECT latest FROM anchor)) AS days_since_last_visit
FROM customer_stats
WHERE lifetime_spend > 500
  AND DATEDIFF('day', last_visit, (SELECT latest FROM anchor)) > 180
ORDER BY lifetime_spend DESC LIMIT 50

-- CUSTOMERS WHO SERVICED 3+ TIMES BUT NEVER BOUGHT (loyalty without purchase)
WITH service_counts AS (
  SELECT customer_number, customer_name, COUNT(DISTINCT ro_number) AS service_visits
  FROM dms_service GROUP BY customer_number, customer_name HAVING COUNT(DISTINCT ro_number) >= 3
),
buyers AS (SELECT DISTINCT customer_number FROM dms_sales)
SELECT sc.customer_name, sc.service_visits
FROM service_counts sc
LEFT JOIN buyers b ON sc.customer_number = b.customer_number
WHERE b.customer_number IS NULL
ORDER BY sc.service_visits DESC LIMIT 50

-- VEHICLES SERVICED HERE BUT PURCHASED ELSEWHERE (VIN in service but not in sales)
SELECT DISTINCT s.customer_name, s.vin, s.make, s.model, s.year,
       COUNT(DISTINCT s.ro_number) AS service_count,
       MAX(s.close_date) AS last_service
FROM dms_service s
LEFT JOIN dms_sales sa ON s.vin = sa.vin
WHERE sa.vin IS NULL AND s.ro_status ILIKE '%clos%'
GROUP BY s.customer_name, s.vin, s.make, s.model, s.year ORDER BY service_count DESC LIMIT 50

-- INVENTORY VEHICLES WITH OPEN ROs IN THE SHOP
SELECT i.stock_number, i.vin, i.year, i.make, i.model, i.exterior_color,
       i.odometer, i.list_price, i.open_ro_number
FROM dms_inventory i
WHERE i.open_ro_number IS NOT NULL AND TRIM(i.open_ro_number) != ''
  AND i.vehicle_status NOT ILIKE '%not in%'

-- VEHICLES WITH MULTIPLE ROs IN 30 DAYS
WITH anchor AS (SELECT MAX(close_date) AS latest FROM dms_service WHERE ro_status ILIKE '%clos%')
SELECT vin, customer_name, make, model, COUNT(DISTINCT ro_number) AS ro_count,
       MIN(open_date) AS first_ro, MAX(close_date) AS last_ro
FROM dms_service
WHERE close_date >= (SELECT latest - INTERVAL 30 DAY FROM anchor) AND ro_status ILIKE '%clos%'
GROUP BY vin, customer_name, make, model HAVING COUNT(DISTINCT ro_number) > 1
ORDER BY ro_count DESC

-- CUSTOMERS WITH OPEN ROs AND FUTURE APPOINTMENTS
SELECT DISTINCT s.customer_name, s.vin, s.make, s.model, s.ro_number, s.open_date AS ro_open_date,
       a.appointment_date, a.service_advisor_name
FROM dms_service s
JOIN dms_appointments a ON s.vin = a.vin
WHERE s.ro_status NOT ILIKE '%clos%'
  AND a.appointment_date > (SELECT MAX(close_date) FROM dms_service WHERE ro_status ILIKE '%clos%')

-- APPOINTMENTS WITH NO RO OPENED (no-shows / walk-aways)
-- ro_number in dms_appointments is always empty — use LEFT JOIN to dms_service to find no-shows
SELECT a.appointment_number, a.customer_name, a.vin, a.make, a.model,
       a.appointment_date, a.service_advisor_name, a.operation_code_description
FROM dms_appointments a
LEFT JOIN dms_service s ON a.vin = s.vin
  AND s.open_date BETWEEN a.appointment_date - INTERVAL 3 DAY AND a.appointment_date + INTERVAL 3 DAY
WHERE s.ro_number IS NULL
ORDER BY a.appointment_date DESC LIMIT 50

-- RETENTION RATE: CUSTOMERS RETURNED WITHIN 6 MONTHS
WITH first_visits AS (
  SELECT customer_number, MIN(close_date) AS first_visit FROM dms_service
  WHERE ro_status ILIKE '%clos%' GROUP BY customer_number
),
return_visits AS (
  SELECT s.customer_number FROM dms_service s
  JOIN first_visits f ON s.customer_number = f.customer_number
  WHERE s.close_date > f.first_visit
    AND s.close_date <= f.first_visit + INTERVAL 180 DAY
    AND s.ro_status ILIKE '%clos%'
  GROUP BY s.customer_number
)
SELECT COUNT(DISTINCT f.customer_number) AS total_customers,
       COUNT(DISTINCT r.customer_number) AS returned_within_6mo,
       ROUND(100.0 * COUNT(DISTINCT r.customer_number) / NULLIF(COUNT(DISTINCT f.customer_number),0),1) AS retention_rate_pct
FROM first_visits f LEFT JOIN return_visits r ON f.customer_number = r.customer_number

-- TECHNICIAN PRODUCTIVITY (billed hours vs tech hours)
WITH anchor AS (SELECT DATE_TRUNC('month', MAX(close_date)) AS m FROM dms_service WHERE ro_status ILIKE '%clos%')
SELECT tech_name,
       COUNT(DISTINCT ro_number) AS ro_count,
       ROUND(SUM(try_cast(labor_bill_hours AS DOUBLE)),1) AS billed_hours,
       ROUND(SUM(try_cast(labor_tech_hours AS DOUBLE)),1) AS tech_hours,
       ROUND(SUM(try_cast(labor_bill_hours AS DOUBLE)) / NULLIF(SUM(try_cast(labor_tech_hours AS DOUBLE)),0),2) AS efficiency_ratio
FROM dms_service WHERE close_date >= (SELECT m FROM anchor) AND ro_status ILIKE '%clos%'
  AND tech_name IS NOT NULL AND tech_name != ''
GROUP BY tech_name ORDER BY billed_hours DESC

-- MOST COMMONLY UPSOLD SERVICES
SELECT operation_code_descriptions,
       COUNT(DISTINCT ro_number) AS upsell_count
FROM dms_service
WHERE upsell ILIKE '%y%' AND operation_code_descriptions IS NOT NULL
GROUP BY operation_code_descriptions ORDER BY upsell_count DESC LIMIT 20

-- SALES PERFORMANCE: TOP SALESPERSON
WITH anchor AS (SELECT DATE_TRUNC('month', MAX(booked_date)) AS m FROM dms_sales)
SELECT salesman_1_name AS salesperson,
       COUNT(DISTINCT deal_number) AS deals,
       ROUND(SUM(try_cast(gross_profit AS DOUBLE)),2) AS total_gross,
       ROUND(AVG(try_cast(gross_profit AS DOUBLE)),2) AS avg_gross_per_deal
FROM dms_sales WHERE booked_date >= (SELECT m FROM anchor)
GROUP BY salesman_1_name ORDER BY total_gross DESC LIMIT 10

-- NEW VS USED BREAKDOWN
WITH anchor AS (SELECT DATE_TRUNC('month', MAX(booked_date)) AS m FROM dms_sales)
SELECT new_or_used, COUNT(DISTINCT deal_number) AS deals,
       ROUND(SUM(try_cast(total_profit AS DOUBLE)),2) AS total_profit
FROM dms_sales WHERE booked_date >= (SELECT m FROM anchor)
GROUP BY new_or_used

-- PACE: ARE WE AHEAD OR BEHIND LAST MONTH?
WITH anchor AS (SELECT MAX(close_date) AS latest FROM dms_service WHERE ro_status ILIKE '%clos%'),
this_month AS (
  SELECT COUNT(DISTINCT ro_number) AS ros,
         ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)),2) AS revenue,
         DAY((SELECT latest FROM anchor)) AS days_elapsed
  FROM dms_service
  WHERE close_date >= DATE_TRUNC('month', (SELECT latest FROM anchor))
    AND ro_status ILIKE '%clos%'
),
last_month AS (
  SELECT COUNT(DISTINCT ro_number) AS ros,
         ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)),2) AS revenue
  FROM dms_service
  WHERE close_date >= DATE_TRUNC('month', (SELECT latest FROM anchor)) - INTERVAL 1 MONTH
    AND close_date < DATE_TRUNC('month', (SELECT latest FROM anchor))
    AND ro_status ILIKE '%clos%'
)
SELECT
  t.ros AS this_month_ros, l.ros AS last_month_ros,
  t.revenue AS this_month_revenue, l.revenue AS last_month_revenue,
  ROUND(100.0 * (t.revenue - l.revenue) / NULLIF(l.revenue,0), 1) AS revenue_change_pct,
  t.days_elapsed AS days_into_month
FROM this_month t, last_month l

-- MULTI-PART QUESTION: two separate aggregates from different tables in one query
-- Example: "how many appointments were made last month and how many services were closed last month?"
-- RULE: When a question asks for aggregates from TWO different tables, ALWAYS use a CTE combining both into ONE query that returns all answers in a single row.
WITH
anchor_appt AS (
  SELECT DATE_TRUNC('month', MAX(appointment_date)) - INTERVAL 1 MONTH AS m_start,
         DATE_TRUNC('month', MAX(appointment_date)) AS m_end
  FROM dms_appointments
),
anchor_svc AS (
  SELECT DATE_TRUNC('month', MAX(close_date)) - INTERVAL 1 MONTH AS m_start,
         DATE_TRUNC('month', MAX(close_date)) AS m_end
  FROM dms_service WHERE ro_status ILIKE '%clos%'
),
appts AS (
  SELECT COUNT(DISTINCT appointment_number) AS appointments_last_month
  FROM dms_appointments a, anchor_appt aa
  WHERE a.appointment_date >= aa.m_start AND a.appointment_date < aa.m_end
),
services AS (
  SELECT COUNT(DISTINCT ro_number) AS services_closed_last_month
  FROM dms_service s, anchor_svc sa
  WHERE s.close_date >= sa.m_start AND s.close_date < sa.m_end AND s.ro_status ILIKE '%clos%'
)
SELECT a.appointments_last_month, s.services_closed_last_month FROM appts a, services s

-- MULTI-PART: "how many sales and how many service ROs this month?"
WITH
sales_this_month AS (
  SELECT COUNT(DISTINCT deal_number) AS sales_count
  FROM dms_sales WHERE booked_date >= DATE_TRUNC('month', (SELECT MAX(booked_date) FROM dms_sales))
),
service_this_month AS (
  SELECT COUNT(DISTINCT ro_number) AS ro_count,
         ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)),2) AS revenue
  FROM dms_service
  WHERE close_date >= DATE_TRUNC('month', (SELECT MAX(close_date) FROM dms_service WHERE ro_status ILIKE '%clos%'))
    AND ro_status ILIKE '%clos%'
)
SELECT s.sales_count, sr.ro_count, sr.revenue FROM sales_this_month s, service_this_month sr
""".strip()
        dms_notes_block = """
━━━━━━━━━━━━━━━━━ SEARCH & QUERY RULES ━━━━━━━━━━━━━━━━━

- ALWAYS use ILIKE for all text matching: dealer_name, make, model, customer_name, service fields, statuses
- Money columns (customer_total_sale, total_sale, list_price, gross_profit, front_gross, etc.) are VARCHAR — always wrap in try_cast(x AS DOUBLE) before SUM/AVG/comparison
- Hours columns (labor_bill_hours, labor_tech_hours) are VARCHAR — always try_cast to DOUBLE
- Date columns are DATE type — use them directly for comparisons; do not use the *_raw columns
- NEVER use CURRENT_DATE — always anchor to MAX(date) in the relevant table
- ro_status for closed ROs: use ro_status ILIKE '%clos%' (not exact equality)
- ro_status for open ROs: use ro_status NOT ILIKE '%clos%'
- operation_code_descriptions is pipe-delimited (e.g. 'ELOF|MPI') — use ILIKE '%keyword%'
- In dms_inventory: vehicle_status is EMPTY STRING '' for active/in-stock units; 'NOT IN INVENTORY' for units no longer on the lot. NEVER use vehicle_status ILIKE '%stock%' — it returns 0. Use: vehicle_status NOT ILIKE '%not in%' OR vehicle_status = '' to mean "in stock/active"
- customer_number is the join key for appointments, service, and sales (NOT in inventory)
- Primary cross-table join key: VIN
- CRITICAL: ro_number in dms_appointments is ALWAYS EMPTY in this dataset — NEVER use it to detect show-ups or no-shows
- To detect show-ups/no-shows: LEFT JOIN dms_appointments to dms_service ON vin=vin AND s.open_date BETWEEN a.appointment_date - INTERVAL 3 DAY AND a.appointment_date + INTERVAL 3 DAY — a matching service row = showed up, no match = no-show
- To detect appointment-based ROs: dms_service.appointment_flag ILIKE '%y%'
- Known dealer: 'Stephen Wade Nissan' — always match with ILIKE
- dms_inventory has a file_date (DATE) column representing the snapshot date — use as proxy for "today" when computing days in inventory

━━━━━━━━━━━━━━━━━ SYNONYMS ━━━━━━━━━━━━━━━━━

VAGUE DEALER QUESTIONS → interpret as follows:
  "How are we looking today?" → service revenue + RO count for MAX close_date day in dms_service
  "Anything stuck in the shop?" → open ROs older than 3 days (ro_status NOT ILIKE '%clos%', days_open > 3)
  "What's hurting us right now?" → open ROs > 3 days old + recent low show-rate advisors
  "Are we busy tomorrow?" → appointment count for MAX(appointment_date)+1 day
  "Who's killing it this month?" → top advisor by revenue this month (dms_service)
  "Why are we slow this week?" → RO count this week vs last week comparison
  "What's aging in inventory?" → units in dms_inventory with days in inventory > 60
  "Do we have any problem customers?" → customers with 2+ no-shows OR unpaid ROs
  "How are we doing?" → summary: RO count + revenue for current month vs last month

Service synonyms → dms_service.operation_code_descriptions ILIKE '%keyword%':
  oil change / lube / giffy lube / jiffy lube / oil and filter → ILIKE '%oil%' OR '%lube%'
  tires / tire rotation / flat tire → ILIKE '%tire%'
  brakes / brake job / brake pads → ILIKE '%brake%'
  inspection / mpi / multi-point / check-up → ILIKE '%inspect%' OR '%mpi%'
  recall / safety fix / recall repair → ILIKE '%recall%'
  transmission / trans service → ILIKE '%trans%'
  A/C / air conditioning / cooling → ILIKE '%cool%' OR '%A/C%' OR '%air cond%'
  alignment → ILIKE '%align%'
  battery → ILIKE '%battery%' OR '%batter%'
  repair shop / car shop / mechanic → generic dms_service (no operation filter)

Appointment synonyms → dms_appointments:
  booking / scheduled / coming in / booked → appointment

Sales synonyms → dms_sales:
  bought / purchased / deal / transaction / sold / unit sold → vehicle sale
  gross / front end / back end / F&I / finance profit → front_gross, back_gross, finance_profit
  floor / flooring / floor plan → dms_inventory

Inventory synonyms → dms_inventory:
  on the lot / in stock / available cars / units on hand → vehicle_status NOT ILIKE '%not in%' (empty string = active; 'NOT IN INVENTORY' = gone)
  days on lot / aged / stale / sitting → DATEDIFF from inventory_date
  certified / CPO / certified pre-owned → certification ILIKE '%certif%'
  new → new_or_used ILIKE '%new%' (in dms_sales) or vehicle_type ILIKE '%new%' (in dms_inventory)
  used → new_or_used ILIKE '%use%'

Customer synonyms:
  buyer / owner / client / guest / contact / driver → customer_name or customer_number

People synonyms:
  advisor / SA / service writer / writer → service_advisor_name
  tech / technician / mechanic → tech_name
  salesperson / sales rep / salesman → salesman_1_name
  F&I / finance manager / finance person → finance_manager_name
  GM / general manager / dealer principal → no column; answer with aggregate summary

Time synonyms — ALWAYS anchor to MAX(date_col) in the table, NEVER use CURRENT_DATE:
  today / yesterday / this morning → MAX day in relevant date column
  this week / current week → week containing MAX date
  last week / previous week → week before MAX date
  this month / current month → month of MAX date
  last month / previous month → month before MAX date
  year to date / YTD → from Jan 1 of MAX year to MAX date
  recent / latest / newest → ORDER BY date DESC LIMIT N
  trend → group by month (DATE_TRUNC('month', date_col)) and ORDER BY month
  "over the last 6 months" → MAX date - INTERVAL 6 MONTH to MAX date
""".strip()
        if RETENTION_DATA_AVAILABLE:
            dms_tables_block += "\n6) customer_retention (synthetic retention dataset)"
            dms_rules_table_list += ", customer_retention"
            dms_schema_block += """

customer_retention columns:
- rooftop_id, rooftop_name, dms_id, imei
- times_went_to_dealer, times_went_to_other_repair_shops
- days_since_last_visit, avg_spend_per_visit, appointment_no_show_rate
- vehicle_age_years, service_visits_last_90d
- retention_score (original synthetic target)
- predicted_retention_score (ML prediction, if model loaded)
- retention_risk (high_risk|medium_risk|low_risk)
""".strip()
            dms_notes_block += """

Retention rules:
- Prefer predicted_retention_score when available; otherwise use retention_score.
- retention_risk is derived from predicted_retention_score buckets: <40 high_risk, 40-79 medium_risk, >=80 low_risk.
""".strip()
    else:
        dms_tables_block = """
1) dms_vehicle_data (legacy DMS vehicle/account data loaded from JSON)
2) dms_open_ro (legacy open repair orders loaded from JSON)
""".rstrip()
        dms_rules_table_list = "dms_vehicle_data, dms_open_ro"

    # Build conversation context
    conversation_context_block = ""
    if conversation_history:
        history_lines: list[str] = []
        recent_messages = conversation_history[-8:]
        for msg in recent_messages:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            content = msg.get("content", "")
            sql_used = msg.get("sql", "")
            history_lines.append(f"{role_label}: {content}")
            if sql_used:
                history_lines.append(f"  (SQL used: {sql_used})")
        conversation_context_block = f"""
Conversation history (use this to resolve references like "those", "that", "them", "the list", etc.):
{chr(10).join(history_lines)}

The current question below may be a follow-up. If it references previous results, generate SQL that fulfills the follow-up intent based on the conversation above.
"""

    # Build a data coverage block so the LLM knows what date ranges are actually available
    data_coverage_lines: list[str] = []
    _range_labels = {
        "dms_service": "dms_service (open_date)",
        "dms_appointments": "dms_appointments (appointment_date)",
        "dms_sales": "dms_sales (booked_date)",
        "dms_inventory": "dms_inventory (inventory_date)",
    }
    for table, label in _range_labels.items():
        info = DMS_DATE_RANGES.get(table)
        if info:
            data_coverage_lines.append(f"- {label}: {info['min']} to {info['max']}")
    data_coverage_block = ""
    if data_coverage_lines:
        latest_service = DMS_DATE_RANGES.get("dms_service", {}).get("max", "")
        data_coverage_block = f"""
IMPORTANT — data coverage (the data does NOT extend to today's date):
{chr(10).join(data_coverage_lines)}

When the user says "this week", "last week", "this month", "last month", "recent", "latest", etc.,
use the LATEST DATE IN THE DATA as the reference point, NOT CURRENT_DATE or today.
The latest date in dms_service is {latest_service or "unknown"}.

Pattern for "this week vs last week" comparisons (use MAX date in data as anchor):
  WITH anchor AS (SELECT MAX(open_date) AS latest FROM dms_service)
  SELECT
    CASE WHEN open_date >= DATE_TRUNC('week', (SELECT latest FROM anchor))
         THEN 'This Week' ELSE 'Last Week' END AS week_period,
    COUNT(DISTINCT ro_number) AS total_ros,
    ROUND(SUM(try_cast(customer_total_sale AS DOUBLE)), 2) AS total_revenue
  FROM dms_service
  WHERE open_date >= DATE_TRUNC('week', (SELECT latest FROM anchor)) - INTERVAL 7 DAY
    AND open_date < DATE_TRUNC('week', (SELECT latest FROM anchor)) + INTERVAL 7 DAY
  GROUP BY 1 ORDER BY 1;

Use the same anchor approach for "this month vs last month", "this year vs last year", etc.
""".strip()

    return f"""
You are a text-to-SQL assistant for DuckDB.

Tables:
{dms_tables_block}

{dms_schema_block}
{dms_notes_block}

{data_coverage_block}

Rules:
- Output ONLY a single SQL SELECT query
- Use ONLY these table names: {dms_rules_table_list}
- If the user asks about what data/tables/columns exist, you MAY query:
  - information_schema.tables
  - information_schema.columns
- No explanations, no markdown
- Limit results unless aggregate
- When the user asks for a "list" or asks to "show" data, return ALL relevant columns (not just IDs). Include identifiers like imei, customer_name, vin, rooftop_name, etc. along with the relevant data columns.
{conversation_context_block}
Question:
{question}

SQL:
""".strip()


# ---------------------------------------------------------------
# LLM calls (model_name passed per-request)
# ---------------------------------------------------------------
def _call_provider(
    system_prompt: str,
    user_prompt: str,
    model_name: str,
    temperature: float = 0,
    max_tokens: int = 2048,
) -> str:
    config = MODEL_OPTIONS.get(model_name) or next(iter(MODEL_OPTIONS.values()))
    model = config["model"]

    resp = anthropic_client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        temperature=temperature,
    )
    return resp.content[0].text.strip()


def _call_llm_for_sql(prompt: str, model_name: str) -> str:
    # SQL rarely exceeds ~300 tokens; lower max_tokens means faster API response.
    return _call_provider(
        system_prompt="Translate natural language into SQL. Return only a SQL SELECT query.",
        user_prompt=prompt,
        model_name=model_name,
        temperature=0,
        max_tokens=600,
    )


def run_question(
    question: str,
    model_name: str,
    conversation_history: list[dict] | None = None,
) -> tuple[str, pd.DataFrame]:
    prompt = build_prompt(question, conversation_history=conversation_history)
    raw_sql = _call_llm_for_sql(prompt, model_name)
    logger.info("[SQL] Raw: %s", raw_sql)
    sql = validate_sql(raw_sql)
    logger.info("[SQL] Validated: %s", sql)

    con = _get_connection()
    result_df = con.execute(sql).df()

    # Retry once with relaxed filters if we got empty results
    if result_df.empty:
        logger.info("[SQL] Empty result — retrying with relaxed filters")
        retry_prompt = (
            build_prompt(question, conversation_history=conversation_history)
            + "\n\nNOTE: The previous query returned 0 rows. "
            "Relax strict filters: remove specific date conditions, use ILIKE instead of =, "
            "try broader LIKE '%keyword%' patterns, remove extra WHERE clauses. "
            "If joining tables, try a LEFT JOIN. Return a broader query."
        )
        try:
            raw_sql2 = _call_llm_for_sql(retry_prompt, model_name)
            sql2 = validate_sql(raw_sql2)
            con2 = _get_connection()
            result_df2 = con2.execute(sql2).df()
            if not result_df2.empty:
                logger.info("[SQL] Retry succeeded with %d rows", len(result_df2))
                return sql2, result_df2
        except Exception as retry_exc:
            logger.warning("[SQL] Retry failed: %s", retry_exc)

    return sql, result_df


def _format_date_friendly(date_str: str) -> str:
    """Convert '2024-01-02' to 'Jan 2, 2024'."""
    try:
        from datetime import datetime
        return datetime.strptime(str(date_str), "%Y-%m-%d").strftime("%b %d, %Y")
    except Exception:
        return str(date_str)


def _build_no_results_message(question: str) -> str:
    """Return a friendly 'no results' message with the exact available date range."""
    q = (question or "").lower()

    _time_words = [
        "today", "yesterday", "this week", "last week", "this month", "last month",
        "this year", "last year", "recent", "latest", "tonight", "morning", "pacing",
    ]
    asked_about_time = any(w in q for w in _time_words)

    if any(kw in q for kw in ["appoint", "booking", "scheduled"]):
        priority = ["dms_appointments", "dms_service"]
    elif any(kw in q for kw in ["sale", "sold", "profit", "deal"]):
        priority = ["dms_sales", "dms_service"]
    elif any(kw in q for kw in ["inventory", "stock", "lot", "unit"]):
        priority = ["dms_inventory"]
    elif any(kw in q for kw in ["revenue", "service", "repair", "ro ", "advisor", "tech"]):
        priority = ["dms_service", "dms_appointments"]
    else:
        priority = ["dms_service", "dms_appointments", "dms_sales"]

    label_map = {
        "dms_service": "service records",
        "dms_appointments": "appointment records",
        "dms_sales": "sales records",
        "dms_inventory": "inventory records",
    }

    all_ranges = []
    for table, label in label_map.items():
        info = DMS_DATE_RANGES.get(table)
        if info:
            all_ranges.append(f"{label}: {_format_date_friendly(info['min'])} to {_format_date_friendly(info['max'])}")

    for table in priority:
        info = DMS_DATE_RANGES.get(table)
        if info:
            label = label_map.get(table, "records")
            min_date = _format_date_friendly(info["min"])
            max_date = _format_date_friendly(info["max"])

            if asked_about_time:
                return (
                    f"I couldn't find results for that timeframe. "
                    f"My {label} only go from {min_date} to {max_date} — "
                    f"I can only answer questions within that window. "
                    f"Try rephrasing with a date that falls in that range!"
                )
            return (
                f"I couldn't find any results for that. "
                f"Just so you know, I have {label} from {min_date} to {max_date}. "
                f"Try adjusting the timeframe or rephrasing your question."
            )

    if all_ranges:
        ranges_text = ", ".join(all_ranges)
        return (
            f"I couldn't find any results for that. "
            f"Here's what data I have: {ranges_text}. "
            f"Try asking within one of those date ranges."
        )

    return (
        "I couldn't find any results for that. "
        "Try broadening the date range or rephrasing your question."
    )


# ---------------------------------------------------------------
# Out-of-scope detection
# ---------------------------------------------------------------
_GREETING_PATTERNS = [
    r"^\s*(hi|hey|hello|howdy|hiya|yo)\s*[!.,]?\s*$",
    r"^\s*how are you\b",
    r"^\s*good\s*(morning|afternoon|evening|day)\s*[!.,]?\s*$",
    r"^\s*what'?s\s+up\s*[!.,]?\s*$",
    r"^\s*greetings?\s*[!.,]?\s*$",
    r"^\s*sup\s*[!.,]?\s*$",
]

_GREETING_RESPONSES = [
    "Hey! I'm Atlas AI, your dealership data assistant. Ask me anything about service, appointments, inventory, or sales and I'll pull the numbers for you.",
    "Hello! Ready to dig into your dealership data. Ask me about service revenue, inventory, appointments, or sales — I've got the numbers.",
    "Hi there! I'm Atlas AI. What would you like to know about your service, inventory, or sales data today?",
]

def _is_greeting(question: str) -> bool:
    q = (question or "").strip().lower()
    return any(re.search(p, q, re.IGNORECASE) for p in _GREETING_PATTERNS)


def _build_greeting_response() -> str:
    import random
    return random.choice(_GREETING_RESPONSES)


_OUT_OF_SCOPE_PATTERNS = [
    r"\b(weather|temperature|forecast|news|sports|stock\s+market|crypto|bitcoin)\b",
    r"\b(recipe|cook|food|restaurant|hotel|flight|travel|vacation)\b",
    r"\b(write\s+(me\s+)?(a\s+)?(poem|story|essay|letter|code))\b",
    r"\b(what\s+is\s+the\s+capital|when\s+was\s+\w+\s+born|where\s+is\s+\w+\s+located)\b",
    r"\b(translate|language|math|equation|physics|chemistry)\b",
    r"\b(movie|music|song|artist|actor|celebrity|game|sport\s+score)\b",
    r"\b(president|politics|election|government|country)\b",
    r"\b(instagram|twitter|facebook|social\s+media|tiktok)\b",
]

_DEALERSHIP_KEYWORDS = [
    "repair", "service", "oil", "tire", "brake", "appointment", "customer", "vehicle",
    "car", "truck", "vin", "ro ", "repair order", "invoice", "sale", "sold", "inventory",
    "stock", "advisor", "technician", "dealership", "dealer", "nissan", "retention",
    "revenue", "profit", "parts", "maintenance", "inspection", "mileage", "recall",
    "stephen wade", "dms", "how many", "how much", "list", "show", "count", "average",
    "top ", "which", "who", "when", "compare", "week", "month", "year", "last", "recent",
    "yesterday", "today", "jiffy", "shop", "mechanic", "lube", "fix", "fixed",
]


def _is_out_of_scope(question: str) -> bool:
    q = (question or "").lower()
    if any(kw in q for kw in _DEALERSHIP_KEYWORDS):
        return False
    return any(re.search(p, q, re.IGNORECASE) for p in _OUT_OF_SCOPE_PATTERNS)


def _build_out_of_scope_message() -> str:
    """Tell the user what the bot can and cannot answer, with actual data ranges."""
    table_labels = {
        "dms_service": "Service & Repair Orders",
        "dms_appointments": "Appointments",
        "dms_sales": "Vehicle Sales",
        "dms_inventory": "Inventory",
    }
    lines: list[str] = []
    for table, label in table_labels.items():
        info = DMS_DATE_RANGES.get(table)
        if info:
            min_d = _format_date_friendly(info["min"])
            max_d = _format_date_friendly(info["max"])
            lines.append(f"  - {label}: {min_d} to {max_d}")

    data_block = "\n".join(lines) if lines else "  - Dealership operational data"
    return (
        "I'm Atlas AI, a dealership assistant. I can only answer questions about this dealership's data.\n\n"
        f"Here's what I have access to:\n{data_block}\n\n"
        "Try asking things like:\n"
        "  - How many repair orders were closed last month?\n"
        "  - Which service advisor handled the most ROs?\n"
        "  - Show me recent vehicle sales\n"
        "  - How many appointments did we have this week?"
    )


def _format_result_sample_for_llm(out: pd.DataFrame, max_rows: int = 20) -> str:
    if out is None or out.empty:
        return ""
    safe_out = out.head(max_rows).copy()
    return safe_out.to_csv(index=False)


def to_natural_language_answer(question: str, sql: str, out: pd.DataFrame) -> str:
    q = (question or "").strip()
    if out is None or out.empty:
        return _build_no_results_message(q)

    if out.shape == (1, 1):
        val = out.iloc[0, 0]
        return f"The answer is {val}."

    cols_lower = [str(c).lower() for c in out.columns]
    if "vin" in cols_lower:
        vin_col = out.columns[cols_lower.index("vin")]
        unique_vins = int(out[vin_col].nunique(dropna=True))
        if unique_vins == 1:
            vin_value = out[vin_col].dropna().iloc[0]
            return f"Found activity for 1 VIN ({vin_value}) matching your question."
        return f"Found {unique_vins} VINs matching your question."

    if "ro_number" in cols_lower:
        ro_col = out.columns[cols_lower.index("ro_number")]
        unique_ros = int(out[ro_col].nunique(dropna=True))
        if unique_ros == 1:
            ro_value = out[ro_col].dropna().iloc[0]
            return f"Found 1 repair order matching your question (RO: {ro_value})."
        return f"Found {unique_ros} repair orders matching your question."

    n = len(out)
    return f"Found {n} result{'s' if n != 1 else ''} matching your question."


def _build_data_coverage_note() -> str:
    """Build a one-line data coverage note for inclusion in the answer prompt."""
    parts = []
    labels = {
        "dms_service": "service ROs",
        "dms_appointments": "appointments",
        "dms_sales": "sales",
        "dms_inventory": "inventory",
    }
    for table, label in labels.items():
        info = DMS_DATE_RANGES.get(table)
        if info:
            parts.append(f"{label}: {_format_date_friendly(info['min'])} to {_format_date_friendly(info['max'])}")
    if parts:
        return "Available data ranges: " + " | ".join(parts)
    return ""


def generate_detailed_answer(
    question: str,
    sql: str,
    out: pd.DataFrame,
    model_name: str,
) -> str:
    q = (question or "").strip()

    if out is None or out.empty:
        return _build_no_results_message(q)

    cols = [str(c) for c in out.columns]
    row_count = int(len(out))
    sample_csv = _format_result_sample_for_llm(out)
    coverage_note = _build_data_coverage_note()

    # Detect whether question uses relative time words so we can prompt Claude to clarify
    time_relative = any(w in q.lower() for w in [
        "today", "yesterday", "this week", "last week", "this month", "last month",
        "this year", "last year", "recent", "latest", "current", "now", "tonight",
        "this morning", "pacing", "ahead", "behind",
    ])

    time_clarification_rule = (
        "- IMPORTANT: This question uses a relative time word (today, last week, last month, etc.). "
        "The data does NOT go up to today's real date. Always start your answer by stating the actual "
        "date range used — e.g. 'For last month (Dec 2025 to Jan 2026)...' or 'Looking at the most "
        "recent week in the data (Jan 27 – Feb 2)...'. This way the user knows exactly what period "
        "the answer covers.\n"
    ) if time_relative else ""

    user_prompt = f"""
You are Atlas AI, a trusted advisor for this car dealership. You know the dealership's data inside-out and speak like a seasoned manager — direct, specific, and helpful.

Answer the question using ONLY the data below. No hallucinations — stick to the numbers provided.

{coverage_note}

RULES:
- Write in plain conversational prose. No markdown, no asterisks, no bullet points, no bold.
- 2 to 4 sentences max.
- Lead with the key number or finding right away (e.g. "We closed 847 repair orders last month...").
{time_clarification_rule}- Translate the data into business meaning — what does this number mean for the dealership?
- If results show a comparison (e.g. this week vs last week), highlight the trend and % change.
- If it's a list/show request, say what was found and that the full table is shown below.
- End with ONE short, specific action the dealership could take based on the data (only if it adds value — skip for simple count/list questions).
- Never mention SQL, queries, columns, or technical terms.

User question: {q}

Data:
- Total rows: {row_count}
- Columns: {cols}
- Sample (first {min(row_count, 20)} rows):
{sample_csv}
""".strip()

    try:
        return _call_provider(
            system_prompt="You explain query results clearly and accurately, grounded in the provided data.",
            user_prompt=user_prompt,
            model_name=model_name,
            temperature=0.2,
        )
    except Exception:
        return to_natural_language_answer(question, sql, out)


# ---------------------------------------------------------------
# Strategy mode
# ---------------------------------------------------------------
STRATEGY_QUESTION_PATTERNS = [
    r"\b(strateg|recommend|suggestion|advise|advice)\b",
    r"\b(how\s+(can|do|should)\s+(i|we)\s+(bring|win|get|retain|keep|reduce|improve|increase))\b",
    r"\b(what\s+(can|should|could)\s+(i|we)\s+(do|offer|give|provide|send|try))\b",
    r"\b(discount|coupon|offer|incentive|promotion|deal|loyalty\s+program)\b",
    r"\b(win\s+back|bring\s+(them|customers?|back)|re-?engage|re-?activate)\b",
    r"\b(reduce\s+churn|prevent\s+churn|stop\s+losing|losing\s+customers?)\b",
    r"\b(retention\s+strateg|churn\s+strateg|improve\s+retention)\b",
    r"\b(why\s+are\s+(customers?|they)\s+(leaving|churning|not\s+coming))\b",
    r"\b(action\s+plan|campaign|outreach|engagement)\b",
    r"\b(analys[ei]s?|insight|pattern|trend|root\s+cause)\b",
    r"\b(help\s+me\s+(understand|figure|plan|decide))\b",
    r"\b(tell\s+me\s+about)\b", r"\b(explain|describe|overview|summarize|summary)\b",
    r"\b(what\s+data\s+do\s+(you|we)\s+have)\b", r"\b(what\s+do\s+(you|we)\s+have)\b",
    r"\b(do\s+you\s+know\s+(anything\s+)?about)\b",
    r"\b(give\s+me\s+(an?\s+)?(overview|summary|breakdown))\b",
]

SQL_DATA_QUERY_PATTERNS = [
    r"\b(list\s+of|list\s+all|show\s+me|show\s+all|give\s+me\s+(a\s+)?list)\b",
    r"\b(how\s+many|count\s+of|number\s+of|total\s+number)\b",
    r"\b(top\s+\d+|bottom\s+\d+|first\s+\d+|last\s+\d+)\b",
    r"\b(average|sum|minimum|maximum|avg|min|max)\s+(of|for)\b",
    r"\b(who\s+(has|had|have|are|is|were|was))\b",
    r"\b(score\s+(is|above|below|greater|less|over|under))\b",
    r"\b(in\s+(january|february|march|april|may|june|july|august|september|october|november|december))\b",
    r"\b(since|before|after|during|last\s+\d+\s+days)\b",
]

STRATEGY_FOLLOWUP_PATTERNS = [
    r"\b(more\s+detail|elaborate|explain\s+(more|further|that|this|it))\b",
    r"\b(tell\s+me\s+more|go\s+deeper|expand\s+on)\b",
    r"\b(what\s+about|how\s+about)\b",
    r"\b(same\s+(for|thing)|do\s+the\s+same)\b",
    r"\b(in\s+detail|in\s+depth|break\s+(it|this|that)\s+down)\b",
    r"\b(what\s+else|anything\s+else|other\s+(ideas|suggestions|recommendations))\b",
]

_DATA_TOPIC_KEYWORDS = [
    "dms", "dms data", "service data", "appointment", "appointments",
    "inventory data", "sales data", "retention", "customer data", "repair order",
]


def _is_data_retrieval_query(question: str) -> bool:
    q = (question or "").strip().lower()
    return bool(q) and any(re.search(p, q, re.IGNORECASE) for p in SQL_DATA_QUERY_PATTERNS)


def _previous_answer_was_strategy(conversation_history: list[dict] | None) -> bool:
    if not conversation_history:
        return False
    for msg in reversed(conversation_history):
        if msg.get("role") == "assistant":
            return bool(msg.get("is_strategy", False))
    return False


def _is_strategy_question(question: str, conversation_history: list[dict] | None = None) -> bool:
    q = (question or "").strip().lower()
    if not q:
        return False
    if _is_data_retrieval_query(q):
        return False
    if any(re.search(p, q, re.IGNORECASE) for p in STRATEGY_QUESTION_PATTERNS):
        return True
    word_count = len(q.split())
    if word_count <= 10:
        if any(kw in q for kw in _DATA_TOPIC_KEYWORDS) and any(
            q.startswith(pfx) for pfx in ["what is", "what are", "what's", "how does", "how do"]
        ):
            return True
    if _previous_answer_was_strategy(conversation_history):
        if word_count <= 8:
            return True
        if any(re.search(p, q, re.IGNORECASE) for p in STRATEGY_FOLLOWUP_PATTERNS):
            return True
    return False


def _gather_analytics(con: duckdb.DuckDBPyConnection, topics: set[str]) -> dict:
    analytics: dict = {}

    if "retention" in topics and retention_df is not None:
        score_col = "predicted_retention_score" if "predicted_retention_score" in retention_df.columns else "retention_score"
        try:
            risk_dist = con.execute(f"""
                SELECT
                    CASE WHEN {score_col} < 40 THEN 'high_risk'
                         WHEN {score_col} < 80 THEN 'medium_risk'
                         ELSE 'low_risk' END AS risk_bucket,
                    COUNT(*) AS customer_count,
                    ROUND(AVG({score_col}), 1) AS avg_score
                FROM customer_retention GROUP BY risk_bucket ORDER BY avg_score
            """).df()
            analytics["risk_distribution"] = risk_dist.to_dict(orient="records")
        except Exception:
            pass

    for dataset, check_flag in [
        ("appointments", "appointments"), ("service", "service"),
        ("inventory", "inventory"), ("sales", "sales"),
    ]:
        if check_flag not in topics or not DMS_PARQUET_AVAILABLE:
            continue
        try:
            if dataset == "appointments":
                df = con.execute("""
                    SELECT COUNT(*) AS total, COUNT(DISTINCT vin) AS vins,
                           MIN(appointment_date) AS from_date, MAX(appointment_date) AS to_date
                    FROM dms_appointments
                """).df()
                analytics["appointment_overview"] = df.to_dict(orient="records")[0]
            elif dataset == "service":
                df = con.execute(f"""
                    SELECT COUNT(*) AS total_ros, COUNT(DISTINCT vin) AS vins,
                           ROUND(AVG({_try_cast_money_sql('customer_total_sale')}), 2) AS avg_sale,
                           MIN(open_date) AS from_date, MAX(open_date) AS to_date
                    FROM dms_service
                """).df()
                analytics["service_overview"] = df.to_dict(orient="records")[0]
            elif dataset == "inventory":
                df = con.execute("""
                    SELECT COUNT(*) AS total,
                           SUM(CASE WHEN sold_date IS NOT NULL THEN 1 ELSE 0 END) AS sold
                    FROM dms_inventory
                """).df()
                analytics["inventory_overview"] = df.to_dict(orient="records")[0]
            elif dataset == "sales":
                df = con.execute(f"""
                    SELECT COUNT(*) AS total,
                           ROUND(AVG({_try_cast_money_sql('total_profit')}), 2) AS avg_profit,
                           MIN(booked_date) AS from_date, MAX(booked_date) AS to_date
                    FROM dms_sales
                """).df()
                analytics["sales_overview"] = df.to_dict(orient="records")[0]
        except Exception:
            pass

    return analytics


def _detect_topics(question: str, conversation_history: list[dict] | None = None) -> set[str]:
    q = (question or "").lower()
    topics: set[str] = set()
    if any(kw in q for kw in ["dms", "dealership data", "all data", "everything"]):
        topics.update(["appointments", "service", "inventory", "sales"])
    if any(kw in q for kw in ["retention", "churn", "risk", "score", "loyalty"]):
        topics.add("retention")
    if any(kw in q for kw in ["appointment", "booking", "scheduled"]):
        topics.add("appointments")
    if any(kw in q for kw in ["service", "repair", "oil", "tire", "brake", "maintenance"]):
        topics.add("service")
    if any(kw in q for kw in ["inventory", "stock", "lot"]):
        topics.add("inventory")
    if any(kw in q for kw in ["sales", "sold", "profit", "revenue"]):
        topics.add("sales")
    if not topics:
        topics = {"appointments", "service", "inventory", "sales"}
    return topics


def _build_friendly_error_message(question: str, error: Exception) -> str:
    error_str = str(error)
    if "not found in FROM clause" in error_str or "Referenced column" in error_str:
        preamble = "I wasn't able to find the right columns to answer that question."
    elif "Table" in error_str and "does not exist" in error_str:
        preamble = "I couldn't find the right data source to answer that question."
    elif "Binder Error" in error_str or "Catalog Error" in error_str:
        preamble = "I ran into a problem building the query for that question."
    else:
        preamble = "Sorry, I wasn't able to answer that question with the data I have."

    suggestion_lines = ["", "Here are some things I can help with:"]
    if DMS_PARQUET_AVAILABLE:
        suggestion_lines.extend([
            "",
            "Service & Appointments (includes customer name, VIN, dealer, dates):",
            "- How many repair orders were closed last month?",
            "- Show customers who had oil change service",
            "- Which service advisor handled the most ROs?",
            "",
            "Inventory & Sales (vehicles, pricing, profit):",
            "- How many cars are currently in inventory?",
            "- Show recent vehicle sales with profit",
            "- What are the top-selling models?",
        ])
    if RETENTION_DATA_AVAILABLE:
        suggestion_lines.extend([
            "",
            "Customer Retention (retention scores, churn risk, visit counts):",
            "- List customers with retention score above 50",
            "- How many customers are high risk?",
        ])
    suggestion_lines.append("")
    suggestion_lines.append("Try rephrasing your question, or pick one of the examples above!")
    return preamble + "\n" + "\n".join(suggestion_lines)


def _generate_strategy_answer(
    question: str,
    model_name: str,
    conversation_history: list[dict] | None = None,
) -> str:
    topics = _detect_topics(question, conversation_history)
    con = _create_connection()
    try:
        analytics = _gather_analytics(con, topics)
    finally:
        con.close()
    analytics["_topics_detected"] = sorted(topics)

    conversation_block = ""
    if conversation_history:
        lines = []
        for msg in conversation_history[-6:]:
            label = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{label}: {msg.get('content', '')}")
        conversation_block = "\nPrevious conversation:\n" + "\n".join(lines) + "\n"

    analytics_json = json.dumps(analytics, indent=2, default=str)

    user_prompt = f"""
You are a dealership customer retention strategist and data analyst.

You have access to the following real data analytics from the dealership's database.
Use ONLY these numbers to ground your recommendations — do not invent statistics.
The data below is already filtered to what the user asked about. Focus your answer ONLY on the datasets provided — do not reference data that is not included below.

=== DATA ANALYTICS ===
{analytics_json}
=== END DATA ===
{conversation_block}
User question:
{question}

Instructions:
1. First, briefly summarize what the data reveals (key patterns, risk segments, behavioral signals).
2. Then provide specific, actionable recommendations based on the data. These can include:
   - Discount offers (e.g., "Offer 15% off oil changes to customers who haven't visited in 90+ days")
   - Co-op programs or service packages
   - Outreach campaigns (email, SMS, direct mail) with timing suggestions
   - Loyalty / rewards program ideas
   - Appointment reminder strategies for high no-show customers
   - Targeted offers based on vehicle age or service history
3. Prioritize recommendations by expected impact (address the largest at-risk segments first).
4. Be specific with numbers from the data (e.g., "Your 142 high-risk customers have an average of 180 days since their last visit — a time-sensitive reactivation offer would help").
5. Keep the tone professional but conversational.
6. Do NOT output SQL or code.

FORMATTING RULES (very important):
- Use simple HTML for structure. Use <h3> for section headings, <h4> for sub-headings.
- Use <ul><li> for bullet lists. Use <b> for bold emphasis.
- Use <br> for line breaks between sections.
- Do NOT use markdown syntax (no #, **, ---, - bullets). Output clean HTML only.
- Do NOT wrap in ```html``` code fences. Just output the HTML directly.
"""
    try:
        return _call_provider(
            system_prompt=(
                "You are an expert automotive dealership retention strategist. "
                "You analyze customer data and provide actionable, data-driven recommendations "
                "to improve customer retention, reduce churn, and increase service revenue. "
                "Always ground your advice in the specific numbers provided."
            ),
            user_prompt=user_prompt,
            model_name=model_name,
            temperature=0.4,
        )
    except Exception as exc:
        return (
            "I wasn't able to generate strategy recommendations right now. "
            f"Please try again.\n\nTechnical detail: {exc}"
        )


# ---------------------------------------------------------------
# Main answer_question
# ---------------------------------------------------------------
def answer_question(
    question: str,
    model_name: str,
    conversation_history: list[dict] | None = None,
) -> tuple[str, str, bool, list[dict]]:
    """Returns (answer_text, sql_used, is_strategy, rows).

    rows is a list of dicts (up to 200 rows) when a SQL query was executed,
    empty list otherwise (strategy mode, metadata, or error).
    """
    if _is_greeting(question):
        return _build_greeting_response(), "-- Greeting", False, []

    if _is_out_of_scope(question):
        return _build_out_of_scope_message(), "-- Out of scope", False, []

    if _is_strategy_question(question, conversation_history):
        answer = _generate_strategy_answer(question, model_name, conversation_history)
        return answer, "-- Strategy mode (no SQL executed)", True, []

    if _is_metadata_question(question):
        answer, sql = _answer_metadata_question(question)
        return answer, sql, False, []

    try:
        sql, result_df = run_question(question, model_name, conversation_history)
        answer = generate_detailed_answer(question, sql, result_df, model_name)
        rows = result_df.head(200).to_dict(orient="records")
        return answer, sql, False, rows
    except Exception as exc:
        logger.error("[QUERY ERROR] %s — %s", question, exc)
        return _build_friendly_error_message(question, exc), f"-- Query failed: {exc}", False, []


# ---------------------------------------------------------------
# Chart config generation
# ---------------------------------------------------------------

# Columns that indicate a row-level list result (not an aggregation) — skip chart
_LIST_INDICATOR_COLS = {
    "vin", "stock_number", "ro_number", "appointment_number", "deal_number",
    "customer_number", "customer_name", "imei", "part_number", "tech_number",
    "service_advisor_number", "salesman_1_number",
}

# Numeric columns that are identifiers or measurements — not meaningful chart axes
_ID_KEYWORDS = {"id", "uuid", "imei", "zip", "phone", "mileage", "odometer",
                "ro_mileage", "mileage_out", "appointment_mileage", "delivery_mileage"}

# Column name suffixes that are good aggregation y-axes
_GOOD_Y_SUFFIXES = (
    "count", "total", "revenue", "sale", "profit", "gross", "rate", "pct",
    "hours", "days", "visits", "ros", "deals", "units", "appointments",
    "avg", "sum", "min", "max", "amount", "value", "score", "efficiency",
)


def _is_meaningful_numeric(col: str) -> bool:
    col_l = col.lower()
    if any(k in col_l for k in _ID_KEYWORDS):
        return False
    # Prefer columns that look like aggregations
    return True


def _is_good_y_col(col: str) -> bool:
    """True if the column name looks like an aggregated metric (count, revenue, etc.)."""
    col_l = col.lower()
    return any(col_l.endswith(s) or s in col_l for s in _GOOD_Y_SUFFIXES)


def _is_date_like(series: pd.Series) -> bool:
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    sample = series.dropna().head(5).astype(str)
    return sum(bool(re.search(r"\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4}", v)) for v in sample) >= 3


def _is_list_result(df: pd.DataFrame) -> bool:
    """Return True if the DataFrame looks like a row-level list (not an aggregation)."""
    cols_lower = {c.lower() for c in df.columns}
    # If it contains any list-indicator column it's a detail list, not a summary
    if cols_lower & _LIST_INDICATOR_COLS:
        return True
    # If it has many columns (>7) it's almost certainly a list
    if len(df.columns) > 7:
        return True
    return False


def build_chart_config(df: pd.DataFrame, question: str) -> dict | None:
    """
    Analyse the result DataFrame and return a chart config dict, or None if no chart is appropriate.
    Config shape: { type, x_col, y_col, title }

    Only generates charts for aggregated results (counts, sums, averages grouped by a dimension).
    Never generates charts for row-level lists (inventory, RO lists, customer lists, etc.).
    """
    if df is None or df.empty or len(df) < 3:
        return None
    if df.shape == (1, 1):
        return None

    # Skip chart for detail/list results — they have no useful chart
    if _is_list_result(df):
        return None

    numeric_cols = [c for c in df.select_dtypes(include="number").columns if _is_meaningful_numeric(c)]
    if not numeric_cols:
        return None

    # Prefer columns that look like aggregated metrics; fall back to first numeric
    good_y_cols = [c for c in numeric_cols if _is_good_y_col(c)]
    y_col = good_y_cols[0] if good_y_cols else numeric_cols[0]

    text_cols = [c for c in df.columns if c not in df.select_dtypes(include="number").columns]
    # Exclude date-like columns from text_cols
    date_cols = [c for c in df.columns if _is_date_like(df[c])]
    text_cols = [c for c in text_cols if c not in date_cols]

    title = question.strip().capitalize()

    # Line chart: only when there's a date x-axis AND a meaningful numeric y
    if date_cols and good_y_cols:
        return {"type": "line", "x_col": date_cols[0], "y_col": y_col, "title": title}

    if not text_cols:
        return None

    x_col = text_cols[0]
    unique_vals = df[x_col].nunique()

    # Pie: ≤8 categories and exactly 1 meaningful numeric
    if unique_vals <= 8 and len(numeric_cols) == 1:
        return {"type": "pie", "x_col": x_col, "y_col": y_col, "title": title}

    # Horizontal bar: many categories (top rankings, advisors, models, etc.)
    if unique_vals > 10:
        return {"type": "bar_horizontal", "x_col": x_col, "y_col": y_col, "title": title}

    # Vertical bar: small number of categories with meaningful numeric
    return {"type": "bar", "x_col": x_col, "y_col": y_col, "title": title}


# ---------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------
def _prewarm() -> None:
    """Pre-warm the Anthropic TCP connection and thread-local DuckDB connection.

    Runs in a background thread at startup so the first real user query
    doesn't pay the cold-start penalty.
    """
    import time
    try:
        _get_connection()
        logger.info("[prewarm] DuckDB connection ready")
    except Exception as exc:
        logger.warning("[prewarm] DuckDB warm-up failed: %s", exc)

    try:
        anthropic_client.messages.create(
            model=next(iter(MODEL_OPTIONS.values()))["model"],
            max_tokens=1,
            system="ping",
            messages=[{"role": "user", "content": "ping"}],
        )
        logger.info("[prewarm] Anthropic connection ready")
    except Exception as exc:
        logger.warning("[prewarm] Anthropic warm-up failed: %s", exc)


threading.Thread(target=_prewarm, daemon=True, name="prewarm").start()

app = FastAPI(title="Ikon DMS Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    sql: str | None = None
    is_strategy: bool | None = None


class ChatRequest(BaseModel):
    question: str
    model_name: str | None = None
    conversation_history: list[ChatMessage] | None = None


class ChatResponse(BaseModel):
    answer: str
    sql_used: str
    is_strategy: bool
    model_used: str
    available_models: list[str]
    rows: list[dict] = []
    columns: list[str] = []
    chart_config: dict | None = None


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "dms_parquet_available": DMS_PARQUET_AVAILABLE,
        "retention_data_available": RETENTION_DATA_AVAILABLE,
        "available_models": list(MODEL_OPTIONS.keys()),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    model_name = request.model_name or DEFAULT_MODEL_NAME
    if model_name not in MODEL_OPTIONS:
        model_name = DEFAULT_MODEL_NAME

    history = (
        [m.model_dump() for m in request.conversation_history]
        if request.conversation_history
        else None
    )

    answer, sql_used, is_strategy, rows = answer_question(
        question=request.question,
        model_name=model_name,
        conversation_history=history,
    )

    columns = list(rows[0].keys()) if rows else []
    chart_config = None
    if rows and not is_strategy:
        rows_df = pd.DataFrame(rows)
        chart_config = build_chart_config(rows_df, request.question)

    return ChatResponse(
        answer=answer,
        sql_used=sql_used,
        is_strategy=is_strategy,
        model_used=model_name,
        available_models=list(MODEL_OPTIONS.keys()),
        rows=rows,
        columns=columns,
        chart_config=chart_config,
    )
