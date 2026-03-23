# CTRG Grant Management System

A two-stage research grant review management platform for North South University (NSU). Built for the Center for Transformative Research on Global Sustainability (CTRG), the School of Engineering and Physical Sciences (SEPS), and Sustainability & Environmental Policy Studies (SRC).

## Architecture

- **Backend**: Django 4.2 + Django REST Framework, running on `localhost:8000`
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS, running on `0.0.0.0:5000`
- **Database**: PostgreSQL (Replit built-in)
- **Auth**: DRF Token Authentication

## User Roles

- **Principal Investigator (PI)**: Submits proposals, uploads revisions
- **Reviewer**: Evaluates assigned proposals, submits scores
- **SRC Chair (Admin)**: Manages grant cycles, assigns reviewers, makes final decisions

## Development Setup

### Backend
- Settings in `backend/config/settings.py`
- Environment variables in `backend/.env`
- Runs on `localhost:8000`

### Frontend
- Proxies `/api` and `/media` requests to `localhost:8000` via Vite proxy
- Runs on `0.0.0.0:5000` (port 5000 required for Replit webview)
- `allowedHosts: true` set for Replit proxy compatibility

## Workflows

- **Start application**: `cd frontend && npm run dev` (webview, port 5000)
- **Backend API**: `cd backend && python manage.py runserver localhost:8000` (console)

## Key Files

- `backend/config/settings.py` — Django configuration
- `backend/.env` — Environment variables (database, CORS, etc.)
- `frontend/vite.config.ts` — Vite config with proxy and host settings
- `frontend/src/services/api.ts` — Axios API client
- `backend/requirements.txt` — Python dependencies

## Database

Using Replit's built-in PostgreSQL. Connection details from env:
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

Migrations are applied via: `cd backend && python manage.py migrate`
