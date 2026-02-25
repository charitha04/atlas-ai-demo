# DMS Chatbot Backend

FastAPI backend that powers the **Stephen Wade Nissan** Ask Atlas AI feature.
It reads real DMS data from local Parquet files and uses Anthropic Claude
to answer natural-language questions about the dealership.

## Setup

### 1. Install dependencies

```bash
cd nextgen-sm-demo/backend
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Optionally, point to your local DMS data folder:

```
DMS_DATA_DIR=/path/to/dms_data
RETENTION_DATA_DIR=/path/to/chatbot_files
```

> **Never commit `.env`** — it is listed in `.gitignore`.

### 3. Start the server

```bash
uvicorn api:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns status and available models |
| POST | `/chat` | Submit a question, get an answer |

### POST /chat — request body

```json
{
  "question": "How many repair orders last month?",
  "model_name": "Claude Sonnet 4 (Anthropic)",
  "conversation_history": []
}
```

## DMS data folder structure

The `DMS_DATA_DIR` must contain these subfolders with Parquet files:

```
dms_data/
├── appointments/   *.parquet
├── service/        *.parquet
├── inventory/      *.parquet
└── sales/          *.parquet
```
