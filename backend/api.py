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


DMS_DATE_RANGES: dict[str, dict] = _load_dms_date_ranges()
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
            {date_expr("Appointment Create Date","appointment_create_date")}
        FROM read_parquet('{parquet_glob("appointments")}')
    """)

    con.execute(f"""
        CREATE OR REPLACE VIEW dms_service AS
        SELECT
            {raw_expr("VIN","vin")}, {raw_expr("Customer Number","customer_number")},
            {raw_expr("Full Name","customer_name")}, {raw_expr("RO Number","ro_number")},
            {raw_expr("Open Date","open_date_raw")}, {date_expr("Open Date","open_date")},
            {raw_expr("Close Date","close_date_raw")}, {date_expr("Close Date","close_date")},
            {raw_expr("RO Mileage","ro_mileage")}, {raw_expr("Mileage Out","mileage_out")},
            {raw_expr("Operation Codes","operation_codes")},
            {raw_expr("Operation Code Descriptions","operation_code_descriptions")},
            {raw_expr("Part Description","part_description")}, {raw_expr("Part Number","part_number")},
            {raw_expr("Service Advisor Name","service_advisor_name")}, {raw_expr("Payment Method","payment_method")},
            {raw_expr("Stock Number","stock_number")}, {raw_expr("Make","make")},
            {raw_expr("Model","model")}, {raw_expr("Year","year")},
            {raw_expr("Exterior Color","exterior_color")}, {raw_expr("New/Used","new_or_used")},
            {raw_expr("dealer_name","dealer_name")}, {raw_expr("DV Dealer ID","dv_dealer_id")},
            {raw_expr("City","city")}, {raw_expr("State","state")}, {raw_expr("Zip","zip")},
            {raw_expr("Customer Labor Sale","customer_labor_sale")},
            {raw_expr("Customer Parts Sale","customer_parts_sale")},
            {raw_expr("Customer Total Cost","customer_total_cost")},
            {raw_expr("Customer Total Sale","customer_total_sale")},
            {raw_expr("Total Sale","total_sale")}, {raw_expr("Total Cost","total_cost")},
            {raw_expr("Warranty Total Sale","warranty_total_sale")},
            {raw_expr("Internal Total Sale","internal_total_sale")}
        FROM read_parquet('{parquet_glob("service")}')
    """)

    con.execute(f"""
        CREATE OR REPLACE VIEW dms_inventory AS
        SELECT
            {raw_expr("VIN","vin")}, {raw_expr("Stock Number","stock_number")},
            {raw_expr("Make","make")}, {raw_expr("Model","model")}, {raw_expr("Year","year")},
            {raw_expr("Trim","trim")}, {raw_expr("Vehicle Status","vehicle_status")},
            {raw_expr("Location","location")}, {raw_expr("Description","description")},
            {raw_expr("Odometer","odometer")}, {raw_expr("List Price","list_price")},
            {raw_expr("Internet Price","internet_price")}, {raw_expr("MSRP","msrp")},
            {raw_expr("Exterior Color","exterior_color")}, {raw_expr("Interior Color","interior_color")},
            {raw_expr("Fuel Type","fuel_type")}, {raw_expr("Transmission","transmission")},
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
            {raw_expr("Make","make")}, {raw_expr("Model","model")}, {raw_expr("Year","year")},
            {raw_expr("Mileage","mileage")}, {raw_expr("List Price","list_price")},
            {raw_expr("Gross Profit","gross_profit")}, {raw_expr("Total Profit","total_profit")},
            {raw_expr("Front Gross","front_gross")}, {raw_expr("Back Gross","back_gross")},
            {raw_expr("City","city")}, {raw_expr("State","state")},
            {raw_expr("dealer_name","dealer_name")}, {raw_expr("DV Dealer ID","dv_dealer_id")},
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


def _create_connection() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.register("dms_vehicle_data", dms_vehicle_df)
    con.register("dms_open_ro", dms_open_ro_df)
    if retention_df is not None:
        con.register("customer_retention", retention_df)
    if DMS_PARQUET_AVAILABLE:
        _register_dms_parquet_views(con)
    return con


# ---------------------------------------------------------------
# SQL validation
# ---------------------------------------------------------------
def validate_sql(sql: str) -> str:
    s = (sql or "").strip().strip(";")
    if not re.match(r"(?is)^\s*select\b", s):
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
dms_appointments columns:
- vin, customer_number, customer_name, appointment_number
- appointment_date (DATE), appointment_date_raw (string m/d/YYYY)
- appointment_create_date (DATE), appointment_create_date_raw
- appointment_time, appointment_mileage
- operation_code_description (string: what service was booked, e.g. 'ELOF - EXPRESS LUBE, OIL & FILTER SERVICE')
- service_advisor_name
- make, model, year, exterior_color
- dealer_name, dv_dealer_id
- city, state, zip

dms_service columns:
- vin, customer_number, customer_name, ro_number
- open_date (DATE), open_date_raw (string m/d/YYYY)
- close_date (DATE), close_date_raw (string m/d/YYYY)
- ro_mileage, mileage_out
- operation_codes (pipe-delimited codes, e.g. 'TR|MPI')
- operation_code_descriptions (pipe-delimited text, e.g. 'REPAIR TIRE|MULTI POINT INSPECTION')
- part_description (pipe-and-caret-delimited, e.g. 'OIL FILTER^MOBIL SUPER SYN 0')
- part_number, service_advisor_name, payment_method
- stock_number, make, model, year, exterior_color, new_or_used
- dealer_name, dv_dealer_id, city, state, zip
- customer_labor_sale, customer_parts_sale, customer_total_cost, customer_total_sale
- total_sale, total_cost, warranty_total_sale, internal_total_sale

dms_inventory columns:
- vin, stock_number
- make, model, year, trim, description
- vehicle_status, location
- odometer
- list_price, internet_price, msrp
- exterior_color, interior_color, fuel_type, transmission
- inventory_date (DATE), inventory_date_raw
- sold_date (DATE, null if not sold), sold_date_raw
- purchase_date (DATE), purchase_date_raw
- dealer_name, dv_dealer_id

dms_sales columns:
- vin, customer_number, customer_name, stock_number
- make, model, year, mileage
- list_price, gross_profit, total_profit, front_gross, back_gross
- booked_date (DATE), booked_date_raw
- accounting_date (DATE), accounting_date_raw
- city, state, dealer_name, dv_dealer_id

dms_events columns (unified stream):
- source_dataset (appointments|service|inventory|sales)
- vin, customer_number, customer_name
- event_date (DATE), event_date_raw
- ro_number, appointment_number
- service_description (text describing the service/operation; from operation_code_description or operation_code_descriptions)
- make, model, year, dealer_name, dv_dealer_id
""".strip()
        dms_notes_block = """
IMPORTANT search rules:
- ALWAYS use ILIKE (not = or LIKE) when matching text columns like dealer_name, make, model, customer_name, operation_code_descriptions, etc. This ensures case-insensitive matching.
  Example: dealer_name ILIKE '%stephen wade nissan%' (NOT dealer_name = 'Stephen Wade Nissan')
  Example: make ILIKE '%nissan%'
- To find service types (oil change, tire, brake, etc.), use ILIKE on these columns:
  - dms_service.operation_code_descriptions ILIKE '%oil%' (main field for service ROs)
  - dms_service.part_description ILIKE '%oil%' (for parts used)
  - dms_appointments.operation_code_description ILIKE '%oil%' (for booked appointments)
  - dms_events.service_description ILIKE '%oil%' (unified view)
- Use '%keyword%' pattern: e.g. ILIKE '%oil%' matches 'LUBE, OIL & FILTER SERVICE'.
- Do NOT search columns named 'description' or 'complaint' in dms_service or dms_appointments; those are empty. Only use operation_code_descriptions, operation_code_description, part_description, or service_description.
- For date filtering, use the DATE columns (close_date, open_date, appointment_date, booked_date, etc.), not the *_raw string columns.
- Money columns (customer_total_sale, total_sale, list_price, gross_profit, etc.) may be strings. To sum/average, use: try_cast(column_name AS DOUBLE).
- customer_number is the DMS customer identifier (present in appointments, service, and sales; NOT in inventory).
- In dms_inventory, sold_date is mostly empty (most rows have no sold_date). Do NOT rely on sold_date IS NULL to mean "unsold". Instead, use vehicle_status or simply count all inventory rows for that dealer.
- Known dealer name in the data: 'Stephen Wade Nissan'. Always match with ILIKE.

CROSS-TABLE JOINS (very important — use these patterns when questions involve multiple datasets):

1. APPOINTMENT SHOW-UP / NO-SHOW RATE:
   To determine if a customer SHOWED UP after booking an appointment, LEFT JOIN dms_appointments to dms_service by VIN + matching dates.
   JOIN: dms_appointments.vin = dms_service.vin AND dms_appointments.appointment_date = dms_service.open_date
   A matching service record means the customer showed up. No match = no-show.
   Example:
     SELECT
       COUNT(DISTINCT a.appointment_number) AS total_appointments,
       COUNT(DISTINCT CASE WHEN s.ro_number IS NOT NULL THEN a.appointment_number END) AS showed_up,
       COUNT(DISTINCT CASE WHEN s.ro_number IS NULL THEN a.appointment_number END) AS no_shows
     FROM dms_appointments a
     LEFT JOIN dms_service s ON a.vin = s.vin AND a.appointment_date = s.open_date

2. CUSTOMERS WHO BOUGHT A CAR AND LATER CAME FOR SERVICE (post-sale retention):
   JOIN: dms_sales.vin = dms_service.vin AND dms_service.open_date > dms_sales.booked_date
   Use this for questions like "did buyers come back for service?", "post-sale service rate".

3. REPEAT SERVICE CUSTOMERS (customer loyalty):
   Group dms_service by customer_number (or vin) and COUNT(DISTINCT ro_number) to find repeat visitors.
   HAVING COUNT(DISTINCT ro_number) > 1 = repeat customer.
   Use for "how many repeat customers", "customer visit frequency", "loyal customers".

4. TIME BETWEEN SERVICE VISITS:
   Use LAG(open_date) OVER (PARTITION BY vin ORDER BY open_date) to get previous visit date per VIN.
   DATEDIFF('day', previous_date, open_date) gives days between visits.
   Use for "average time between visits", "how often do customers come back".

5. INVENTORY TO SALES (which inventory sold):
   JOIN: dms_inventory.vin = dms_sales.vin
   Use for "which inventory items sold", "days on lot before sale", "sell-through rate".
   Days on lot = DATEDIFF('day', dms_inventory.inventory_date, dms_sales.booked_date).

6. FULL VEHICLE TIMELINE:
   Use the dms_events view (already unified) to see ALL activity for a VIN across appointments, service, inventory, and sales in chronological order.
   Filter by vin and ORDER BY event_date.

7. SERVICE ADVISOR PERFORMANCE:
   Group dms_service by service_advisor_name to get RO counts, revenue per advisor.
   Join with dms_appointments to get show rates per advisor.

The primary join key across all DMS tables is VIN. customer_number is shared between appointments, service, and sales (NOT inventory).

SYNONYMS — understand these layman/alternate terms and map them to the correct columns/tables:

Service & Repair synonyms → use dms_service, filter on operation_code_descriptions ILIKE '%keyword%':
  "oil change", "lube", "lube job", "giffy lube", "jiffy lube", "oil and filter" → oil change service
  "tire rotation", "tires", "flat tire", "tire repair" → tire-related service
  "brake job", "brakes", "brake pads", "stopping power" → brake service
  "car shop", "repair shop", "fix shop", "mechanic", "body shop", "service center" → service visit
  "multi-point", "mpi", "inspection", "check-up", "checkup", "look over" → inspection
  "recall fix", "recall repair", "safety fix" → recall-related service

Appointment synonyms → use dms_appointments:
  "booking", "scheduled visit", "set up an appointment", "booked in", "coming in" → appointment

Sales synonyms → use dms_sales:
  "purchased", "bought", "deal", "transaction", "sold a car", "unit sold" → vehicle sale
  "gross", "front end", "back end", "F&I", "finance" → profit-related columns

Inventory synonyms → use dms_inventory:
  "on the lot", "in stock", "available cars", "floor plan", "units on hand" → inventory
  "days on lot", "aged unit", "stale inventory" → days since inventory_date

Customer synonyms → map to customer_name or customer_number:
  "buyer", "owner", "driver", "client", "guest", "contact" → customer

Time synonyms — ALWAYS anchor to latest date in data, not CURRENT_DATE:
  "yesterday", "last night", "today", "this morning" → most recent day in the relevant table
  "this week", "current week" → week containing MAX(date) in the table
  "last week", "previous week" → week before MAX(date)
  "this month", "current month" → month of MAX(date)
  "last month", "previous month" → month before MAX(date)
  "recent", "latest", "newest", "most recent" → ORDER BY date DESC LIMIT N
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
) -> str:
    config = MODEL_OPTIONS.get(model_name) or next(iter(MODEL_OPTIONS.values()))
    model = config["model"]

    resp = anthropic_client.messages.create(
        model=model,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        temperature=temperature,
    )
    return resp.content[0].text.strip()


def _call_llm_for_sql(prompt: str, model_name: str) -> str:
    return _call_provider(
        system_prompt="Translate natural language into SQL. Return only a SQL SELECT query.",
        user_prompt=prompt,
        model_name=model_name,
        temperature=0,
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

    con = _create_connection()
    try:
        result_df = con.execute(sql).df()
    finally:
        con.close()

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
            con2 = _create_connection()
            try:
                result_df2 = con2.execute(sql2).df()
            finally:
                con2.close()
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

    if any(kw in q for kw in ["appoint", "booking", "scheduled"]):
        priority = ["dms_appointments", "dms_service"]
    elif any(kw in q for kw in ["sale", "sold", "profit", "revenue", "booked"]):
        priority = ["dms_sales", "dms_service"]
    elif any(kw in q for kw in ["inventory", "stock", "lot"]):
        priority = ["dms_inventory"]
    else:
        priority = ["dms_service", "dms_appointments", "dms_sales"]

    for table in priority:
        info = DMS_DATE_RANGES.get(table)
        if info:
            label = {
                "dms_service": "service records",
                "dms_appointments": "appointment records",
                "dms_sales": "sales records",
                "dms_inventory": "inventory records",
            }.get(table, "records")
            min_date = _format_date_friendly(info["min"])
            max_date = _format_date_friendly(info["max"])
            return (
                f"I couldn't find any results for that. "
                f"Just so you know, I have {label} from {min_date} to {max_date}. "
                f"I can only answer questions within that date range. "
                f"Try adjusting the timeframe and ask again!"
            )

    return (
        "I couldn't find any results for that. "
        "Try broadening the date range or rephrasing your question."
    )


# ---------------------------------------------------------------
# Out-of-scope detection
# ---------------------------------------------------------------
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

    user_prompt = f"""
You are Atlas AI, a trusted advisor for this car dealership. You know the dealership's data inside-out and speak like a seasoned manager — direct, specific, and helpful.

Answer the question using ONLY the data below. No hallucinations — stick to the numbers provided.

RULES:
- Write in plain conversational prose. No markdown, no asterisks, no bullet points, no bold.
- 2 to 4 sentences max.
- Lead with the key number or finding right away (e.g. "We closed 847 repair orders last month...").
- Translate the data into business meaning — what does this number mean for the dealership?
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
_ID_KEYWORDS = {"id", "uuid", "vin", "imei", "number", "zip", "phone", "code", "ro_number"}


def _is_meaningful_numeric(col: str) -> bool:
    return not any(k in col.lower() for k in _ID_KEYWORDS)


def _is_date_like(series: pd.Series) -> bool:
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    sample = series.dropna().head(5).astype(str)
    return sum(bool(re.search(r"\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4}", v)) for v in sample) >= 3


def build_chart_config(df: pd.DataFrame, question: str) -> dict | None:
    """
    Analyse the result DataFrame and return a chart config dict, or None if no chart is appropriate.
    Config shape: { type, x_col, y_col, title }
    """
    if df is None or df.empty or len(df) < 3:
        return None
    # Single-value result — no chart
    if df.shape == (1, 1):
        return None

    numeric_cols = [c for c in df.select_dtypes(include="number").columns if _is_meaningful_numeric(c)]
    if not numeric_cols:
        return None

    y_col = numeric_cols[0]
    text_cols = [c for c in df.columns if c not in df.select_dtypes(include="number").columns]
    date_cols = [c for c in df.columns if _is_date_like(df[c])]

    title = question.strip().capitalize()

    # Line chart: date x-axis
    if date_cols:
        return {"type": "line", "x_col": date_cols[0], "y_col": y_col, "title": title}

    if not text_cols:
        return None

    x_col = text_cols[0]
    unique_vals = df[x_col].nunique()

    # Pie chart: categorical with ≤8 distinct values and 1 numeric column
    if unique_vals <= 8 and len(numeric_cols) == 1:
        return {"type": "pie", "x_col": x_col, "y_col": y_col, "title": title}

    # Horizontal bar: many categories
    if unique_vals > 10:
        return {"type": "bar_horizontal", "x_col": x_col, "y_col": y_col, "title": title}

    # Vertical bar: default
    return {"type": "bar", "x_col": x_col, "y_col": y_col, "title": title}


# ---------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------
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
