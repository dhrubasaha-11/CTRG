# CTRG Grant Review System

## Project Overview
A web-based system for managing the full lifecycle of CTRG research grant proposals at North South University (NSU), under SEPS and SRC. Replaces the manual process of proposal handling, reviewer assignment, two-stage review, revision handling, and final grant approval.

## Domain Glossary
- **CTRG** = Committee for Teaching and Research Grant
- **SRC** = Scientific Research Committee
- **SEPS** = School of Engineering and Physical Sciences
- **PI** = Principal Investigator (the applicant/researcher)
- **SRC Chair** = Administrator with full system control
- **Grant Cycle** = One CTRG call period (e.g., CTRG 2025-2026)
- **Stage 1** = Initial evaluation and scoring by reviewers
- **Stage 2** = Post-revision evaluation (only for tentatively accepted proposals)
- **Tentatively Accepted** = Proposal accepted pending revisions

## Tech Stack
- **Backend:** Django 5.x, Django REST Framework, PostgreSQL 16
- **State Machine:** django-fsm-2 (protected FSMField)
- **Auth:** djangorestframework-simplejwt (access + refresh tokens)
- **Async Tasks:** Celery + Redis
- **PDF Generation:** WeasyPrint via django-weasyprint
- **Audit:** django-fsm-log + django-simple-history
- **Frontend:** React 18, TypeScript, Vite
- **State Management:** TanStack Query (server state), Zustand (client state)
- **Forms:** React Hook Form + Zod validation
- **UI:** Tailwind CSS + shadcn/ui components
- **HTTP Client:** Axios with interceptors

## Project Structure
ctrg/
├── CLAUDE.md
├── agent_docs/                  # Detailed specs for Claude Code
│   ├── proposal_lifecycle.md
│   ├── permission_matrix.md
│   ├── api_endpoints.md
│   ├── database_schema.md
│   ├── email_notifications.md
│   └── scoring_forms.md
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── users/               # Custom User model, auth, roles
│   │   ├── cycles/              # Grant Cycle management
│   │   ├── proposals/           # Proposal CRUD, state machine, file uploads
│   │   ├── reviews/             # Review assignments, scoring, Stage 1 & 2
│   │   ├── notifications/       # Email triggers, Celery tasks, notification log
│   │   └── reports/             # PDF generation, cycle summaries
│   ├── common/                  # Shared: base models, mixins, utils, permissions
│   ├── templates/               # Email & PDF HTML templates
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios client, endpoint functions
│   │   ├── components/          # Shared UI components
│   │   ├── hooks/               # Custom hooks (useAuth, useProposals, etc.)
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── src-chair/
│   │   │   ├── reviewer/
│   │   │   └── pi/
│   │   ├── store/               # Zustand stores
│   │   ├── types/               # TypeScript interfaces
│   │   └── utils/
│   └── package.json
└── docker-compose.yml

## Commands
```bash
# Backend
cd backend && python manage.py runserver
python manage.py test apps/ --verbosity=2
python manage.py makemigrations && python manage.py migrate
celery -A config worker -l info

# Frontend
cd frontend && npm run dev
npm run build
npm run lint
npm run test

# Docker
docker-compose up -d  # PostgreSQL + Redis
```

## Conventions
- All models inherit from `common.models.TimeStampedModel` (created_at, updated_at)
- UUID primary keys on all models: `id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- Business logic goes in `services.py`, not in views or serializers
- State transitions ONLY through django-fsm-2 decorated methods, never direct field assignment
- Every API endpoint returns standardized error format: `{"detail": "...", "code": "ERROR_CODE"}`
- Frontend API calls go through `src/api/` module, never raw fetch/axios in components
- All file uploads validated server-side with python-magic (content type, not just extension)
- Every state transition triggers an audit log entry automatically via django-fsm-log

## Before Working On Specific Modules
- State transitions → read `agent_docs/proposal_lifecycle.md`
- Permissions/access control → read `agent_docs/permission_matrix.md`
- API design → read `agent_docs/api_endpoints.md`
- Database models → read `agent_docs/database_schema.md`
- Email system → read `agent_docs/email_notifications.md`
- Review scoring → read `agent_docs/scoring_forms.md`