# Frontend Deployment

Set the API URL for the deployed backend:

```text
VITE_API_BASE_URL=https://your-backend-domain.example/api
```

Build the static site:

```powershell
npm ci
npm run build
```

Deploy the generated `dist/` directory to your static hosting provider.

