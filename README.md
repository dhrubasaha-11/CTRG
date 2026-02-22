# CTRG Two-Stage Research Grant Review Management System

A comprehensive web-based platform for managing research grant proposals with a two-stage review process for NSU's SEPS and SRC.

## Features

### Core Functionality
- **Two-Stage Review Process**: Initial evaluation (Stage 1) and final evaluation after revision (Stage 2)
- **Role-Based Access Control**: Three user roles (PI, Reviewer, SRC Chair) with specific permissions
- **Complete Proposal Lifecycle**: From submission through reviews, revisions, and final decisions
- **Automated Email Notifications**: Reviewer assignments, revision requests, deadline reminders, and decisions
- **Background Task Processing**: Automated deadline checks and reminder emails
- **Comprehensive Audit Trail**: All actions logged for transparency and accountability
- **PDF Report Generation**: Downloadable review reports with all feedback

### User Roles

#### Principal Investigator (PI)
- Submit grant proposals
- View proposal status and feedback
- Upload revised proposals when requested
- Track revision deadlines

#### Reviewer
- View assigned proposals
- Submit Stage 1 reviews (8 scoring criteria)
- Submit Stage 2 reviews (revision assessment)
- Manage review workload

#### SRC Chair (Administrator)
- Manage grant cycles
- Assign reviewers to proposals
- Apply Stage 1 decisions (Accept/Reject/Tentatively Accept)
- Request and manage revisions
- Apply final decisions and grant amounts
- View comprehensive dashboard and statistics
- Manage users and reviewer profiles

## Technology Stack

### Backend
- **Django 6.0.1** - Python web framework
- **Django REST Framework** - RESTful API
- **Token Authentication** - Secure API access
- **Celery + Redis** - Background task processing
- **PostgreSQL** - Primary database (SQLite optional fallback)
- **ReportLab** - PDF generation

### Frontend
- **React 19.2.0** - UI library
- **TypeScript 5.9.3** - Type-safe development
- **Vite 7.2.4** - Fast build tool
- **TailwindCSS 4.1.18** - Utility-first CSS
- **React Router 7.13.0** - Client-side routing
- **Axios 1.13.4** - HTTP client
- **Formik + Yup** - Form management and validation

## Quick Start

### Prerequisites

- **Python 3.9+** (Python 3.11 recommended)
- **Node.js 18+** and npm
- **Git** (for cloning the repository)
- **PostgreSQL 17+**
- **Redis** (optional, for background tasks)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd NSUProject
```

### 2. Backend Setup

#### Mac/Linux
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env and update configuration (see EMAIL_SETUP.md for email config)
nano .env  # or use your preferred editor

# Run database migrations
python manage.py migrate

# Create auth token table
python manage.py migrate authtoken

# Setup initial data (groups and admin user)
python manage.py setup_initial_data

# Start backend server
python manage.py runserver
```

#### Windows
```batch
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
copy .env.example .env

# Edit .env with notepad
notepad .env

# Run migrations
python manage.py migrate
python manage.py migrate authtoken

# Setup initial data
python manage.py setup_initial_data

# Start backend server
python manage.py runserver
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start frontend development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173/
- **Backend API**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/

### Default Login Credentials

After running `setup_initial_data`:

```
Email: admin@nsu.edu
Password: admin123
```

**⚠️ IMPORTANT: Change the default password immediately!**

## Using Startup Scripts

For convenience, use the provided startup scripts:

### Mac/Linux

```bash
# Start backend
./start-backend.sh

# Start frontend (in a new terminal)
./start-frontend.sh
```

### Windows

```batch
# Start backend
start-backend.bat

# Start frontend (in a new terminal)
cd frontend
npm run dev
```

## Configuration

### Email Configuration

The system sends automated email notifications. See [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed configuration instructions.

**Quick setup for Gmail:**

1. Enable 2FA on your Gmail account
2. Generate an app password: https://myaccount.google.com/apppasswords
3. Update `backend/.env`:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-char-app-password
DEFAULT_FROM_EMAIL=CTRG Grant System <your-email@gmail.com>
```

For testing without sending real emails:

```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Background Tasks (Optional)

For automated deadline checks and email reminders:

1. Install and start Redis:
```bash
# Mac
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

2. Start Celery worker (in a new terminal):
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
celery -A config worker -l info
```

3. Start Celery Beat scheduler (in another terminal):
```bash
cd backend
source venv/bin/activate
celery -A config beat -l info
```

## Project Structure

```
NSUProject/
├── backend/                    # Django backend
│   ├── config/                 # Project settings and configuration
│   ├── users/                  # User authentication app
│   │   ├── models.py           # Custom User model
│   │   ├── views.py            # Authentication endpoints
│   │   ├── serializers.py      # User serializers
│   │   └── urls.py             # Auth URL routing
│   ├── proposals/              # Grant proposal management
│   │   ├── models.py           # Proposal, GrantCycle, Decision models
│   │   ├── views.py            # Proposal API endpoints
│   │   ├── services.py         # Business logic (email, validation)
│   │   ├── tasks.py            # Celery background tasks
│   │   └── reporting.py        # PDF report generation
│   ├── reviews/                # Review and reviewer management
│   │   ├── models.py           # ReviewerProfile, Assignment, Score models
│   │   ├── views.py            # Review API endpoints
│   │   └── serializers.py      # Review serializers
│   ├── .env                    # Environment configuration (gitignored)
│   ├── .env.example            # Environment template
│   ├── requirements.txt        # Python dependencies
│   └── manage.py               # Django management script
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── features/           # Feature-based components
│   │   │   ├── auth/           # Authentication (login, protected routes)
│   │   │   ├── proposals/      # PI proposal management
│   │   │   ├── reviews/        # Reviewer dashboards and forms
│   │   │   ├── admin/          # SRC Chair admin interface
│   │   │   └── cycles/         # Grant cycle management
│   │   ├── services/           # API client services
│   │   │   ├── api.ts          # Main API client
│   │   │   └── authService.ts  # Authentication service
│   │   ├── components/         # Reusable UI components
│   │   └── App.tsx             # Main application routing
│   ├── package.json            # npm dependencies
│   └── vite.config.ts          # Vite configuration
├── start-backend.sh            # Backend startup script (Mac/Linux)
├── start-backend.bat           # Backend startup script (Windows)
├── start-frontend.sh           # Frontend startup script
├── EMAIL_SETUP.md              # Email configuration guide
├── DEPLOYMENT.md               # Deployment instructions
└── README.md                   # This file
```

## API Documentation

The system provides a RESTful API with the following main endpoints:

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/user/` - Get current user
- `GET /api/auth/validate-token/` - Validate token + role redirect metadata
- `POST /api/auth/register/` - Create user (admin only)
- `POST /api/auth/change-password/` - Change password

### Proposals
- `GET /api/proposals/` - List all proposals
- `POST /api/proposals/` - Create proposal
- `GET /api/proposals/{id}/` - Get proposal details
- `POST /api/proposals/{id}/submit/` - Submit proposal
- `POST /api/proposals/{id}/submit_revision/` - Submit revision
- `POST /api/proposals/{id}/stage1_decision/` - Apply Stage 1 decision
- `POST /api/proposals/{id}/final_decision/` - Apply final decision

### Reviews
- `GET /api/assignments/` - List review assignments
- `POST /api/assignments/assign_reviewers/` - Assign reviewers
- `POST /api/assignments/auto_assign_reviewers/` - Auto-assign reviewers by workload/expertise
- `POST /api/assignments/{id}/submit_score/` - Submit Stage 1 review
- `POST /api/assignments/{id}/submit_stage2_review/` - Submit Stage 2 review

### Grant Cycles
- `GET /api/cycles/` - List grant cycles
- `POST /api/cycles/` - Create grant cycle
- `GET /api/cycles/active/` - Get active cycles

### Dashboard
- `GET /api/dashboard/src_chair/` - SRC Chair statistics
- `GET /api/dashboard/reviewer/` - Reviewer statistics
- `GET /api/dashboard/pi/` - PI statistics

All endpoints (except `/api/auth/login/`) require token authentication:

```
Authorization: Token <your-auth-token>
```

## Development

### Running Tests

```bash
cd backend
python manage.py test
```

### Creating a New User

Via Django shell:

```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

# Create PI user
pi = User.objects.create_user(
    username='pi.user',
    email='pi@nsu.edu',
    password='password123',
    first_name='John',
    last_name='Doe'
)
pi.groups.add(Group.objects.get(name='PI'))

# Create Reviewer user
reviewer = User.objects.create_user(
    username='reviewer.user',
    email='reviewer@nsu.edu',
    password='password123',
    first_name='Jane',
    last_name='Smith'
)
reviewer.groups.add(Group.objects.get(name='Reviewer'))
```

### Accessing Django Admin

1. Navigate to http://localhost:8000/admin/
2. Login with admin credentials
3. Manage users, proposals, reviews, and more

## Troubleshooting

### Backend won't start

**Error: ModuleNotFoundError**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt`

**Error: No module named 'environ'**
- Run `pip install django-environ`

**Database errors**
- Ensure PostgreSQL service is running and `.env` database settings are correct
- Run `python manage.py migrate`
- If you explicitly use SQLite fallback, delete `db.sqlite3` and migrate again

### Frontend won't start

**Error: Cannot find module**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**Port already in use**
- Stop other servers running on port 5173
- Or edit `vite.config.ts` to use a different port

### Email not sending

- Check `backend/logs/django.log` for errors
- Verify email configuration in `.env`
- See [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed troubleshooting

### Authentication errors

**401 Unauthorized**
- Ensure you're logged in
- Check that token is being sent in headers

**403 Forbidden**
- Check user has correct role/permissions
- SRC Chair actions require admin privileges

## Production Deployment

For production deployment:

1. **Set `DEBUG=False` in `.env`**
2. **Use PostgreSQL (default)** with managed backups
3. **Set strong `SECRET_KEY`**
4. **Configure proper email service** (SendGrid recommended)
5. **Use Gunicorn** for WSGI server
6. **Set up Redis** for Celery
7. **Enable HTTPS** and update security settings
8. **Set up proper logging and monitoring**
9. **Configure static file serving** (WhiteNoise or CDN)
10. **Regular backups** of database and media files

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed production deployment instructions.

## Security

- All API endpoints require authentication (except login)
- Token-based authentication with Django REST Framework
- Role-based access control via Django Groups
- Password validation with Django validators (min 8 characters)
- CORS configured for specific origins
- Environment variables for sensitive configuration
- Audit logging for all major actions

## Support

For issues, questions, or contributions:

1. Check this README and other documentation files
2. Review [EMAIL_SETUP.md](EMAIL_SETUP.md) for email issues
3. Check Django logs: `backend/logs/django.log`
4. Check browser console for frontend errors

## License

Copyright © 2026 NSU. All rights reserved.

## Acknowledgments

Built for North South University's Center for Transformative Research on Global Sustainability (CTRG) and Sustainability and Environmental Policy Studies (SEPS).

---

**Version**: 1.0.0
**Last Updated**: February 2026
**Maintained by**: NSU IT Team
