# Backend Deployment

Use these settings for production:

```text
ENVIRONMENT=production
SECRET_KEY=<strong-random-secret>
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
CORS_ORIGINS=https://your-frontend-domain.example
AUTO_CREATE_TABLES=false
```

Install dependencies and run migrations:

```powershell
pip install -r requirements.txt
alembic -c alembic.ini upgrade head
```

Run the API with an ASGI server:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For managed platforms, set the same environment variables in the platform dashboard and use the command above as the start command.

