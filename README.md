# Predictive Maintenance Hub

Industrial IoT and AI predictive maintenance platform for ESP32 telemetry, PostgreSQL storage, fault prediction, RUL estimation, recommendations, alerts, and reports.

## Project Structure

- `frontend/` - React, Vite, TypeScript, TailwindCSS, Recharts dashboard
- `backend/` - FastAPI, SQLAlchemy, JWT auth, PostgreSQL API
- `firmware/` - ESP32 REST telemetry sender
- `ml_engine/` - Scikit-Learn joblib models and scalers
- `database/` - PostgreSQL schema
- `reports/` - Generated report output directory
- `datasets/` - CSV datasets and training references

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000` and OpenAPI docs are available at `http://localhost:8000/docs`.

## Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The dashboard runs at `http://localhost:5173`.

## PostgreSQL

Create the database, then either let SQLAlchemy create tables at startup or run:

```powershell
psql -U postgres -d predictive_maintenance_hub -f database/schema.sql
```

## ESP32 Payload

Send live telemetry to:

```text
POST http://localhost:8000/api/telemetry
```

```json
{
  "device_id": "ESP32-001",
  "temperature": 72.4,
  "vibration": 3.1
}
```

## Core Tables

`users`, `devices`, `telemetry`, `predictions`, `alerts`, and `maintenance_logs`.

## Deployment

Backend production settings are environment-driven. Set at least:

```text
ENVIRONMENT=production
SECRET_KEY=<strong-random-secret>
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
CORS_ORIGINS=https://your-frontend-domain.example
AUTO_CREATE_TABLES=false
```

Run backend migrations before starting production:

```powershell
cd backend
pip install -r requirements.txt
alembic -c alembic.ini upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For the frontend, set `VITE_API_BASE_URL` to the deployed backend `/api` URL and run:

```powershell
cd frontend
npm ci
npm run build
```

Deploy the generated `frontend/dist/` directory with any static hosting provider.

Some ML artifacts are larger than GitHub's normal 100 MB file limit and are excluded from Git. See `ml_engine/models/README.md` for the list and restore them through Git LFS or external artifact storage before deploying prediction features that depend on them.
