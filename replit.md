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

## Frontend Design System (v2 — Dark Mode)

Full dark-mode redesign with a Vizuara AI-inspired aesthetic:
- **Palette**: Deep midnight navy `#070d1f` background, indigo/violet gradient accents (`#6366f1` → `#8b5cf6`), cyan highlights
- **Typography**: Inter font, letter-spacing tightened on headings
- **Components**: Glassmorphic `.glass` cards, `.metric-card` stat tiles, `.table-wrap/.table` for data tables
- **Buttons**: `.btn-primary` (indigo→violet gradient glow), `.btn-secondary`, `.btn-ghost`, `.btn-danger`
- **Badges**: `.badge-brand/violet/cyan/green/amber/red/orange/slate`
- **Inputs**: Dark `.input` with focus glow ring, icon support via `.has-icon-left/.has-icon-right`
- **Sidebar**: Fixed dark sidebar with gradient active indicator bar and collapsible mode
- **Animations**: `animate-fade-in`, `animate-slide-up`, glow pulse, spinner

### Key Design Files
- `frontend/src/index.css` — Complete dark design system (CSS variables, all utility classes)
- `frontend/tailwind.config.js` — Brand color tokens, dark surfaces, glow shadows, Inter font
- `frontend/src/components/DashboardLayout.tsx` — Sidebar + topbar shell (all roles)
- `frontend/src/features/auth/Login.tsx` — Split branding panel + glassmorphic login card
- `frontend/src/features/admin/SRCChairDashboard.tsx` — Admin overview with gradient stat cards
- `frontend/src/features/proposals/PIDashboard.tsx` — PI proposal management
- `frontend/src/features/reviews/ReviewerHome.tsx` — Reviewer workload overview
- `frontend/src/features/reviews/ReviewerDashboard.tsx` — Full reviewer assignments list
- `frontend/src/components/dashboard/StatusChart.tsx` — Dark donut chart with glow legend
- `frontend/src/components/dashboard/ActivityTimeline.tsx` — Dark vertical activity feed
- `frontend/src/components/dashboard/CycleProgress.tsx` — Grant cycle stage progress bar

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
