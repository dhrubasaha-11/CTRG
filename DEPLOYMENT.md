# CTRG Grant System - Local Deployment Guide

Complete guide for deploying the CTRG Two-Stage Research Grant Review Management System locally for development and testing.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [First-Time Setup](#first-time-setup)
3. [Configuration](#configuration)
4. [Database Initialization](#database-initialization)
5. [Running the Application](#running-the-application)
6. [Accessing the System](#accessing-the-system)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software

- **Python 3.9 or higher** (Python 3.11 recommended)
  - Check version: `python --version` or `python3 --version`
  - Download: https://www.python.org/downloads/

- **Node.js 18 or higher** and npm
  - Check version: `node --version`
  - Download: https://nodejs.org/

- **Git** (for cloning repository)
  - Check version: `git --version`
  - Download: https://git-scm.com/downloads

### Optional Software

- **Redis** (for background tasks and Celery)
  - Mac: `brew install redis`
  - Linux: `sudo apt-get install redis-server`
  - Windows: https://redis.io/docs/getting-started/installation/install-redis-on-windows/

- **PostgreSQL** (default database, required)
  - Download: https://www.postgresql.org/download/

---

## First-Time Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd NSUProject
```

### 2. Backend Setup

#### Step 2.1: Create Virtual Environment

**Mac/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

**Windows (Command Prompt):**
```cmd
cd backend
python -m venv venv
venv\Scripts\activate
```

**Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
```

> **Note:** You should see `(venv)` in your terminal prompt when the virtual environment is activated.

#### Step 2.2: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs:
- Django 6.0.1
- Django REST Framework
- django-environ (environment variables)
- Celery and Redis (background tasks)
- ReportLab (PDF generation)
- and other dependencies

#### Step 2.3: Configure Environment Variables

1. Copy the environment template:

```bash
# Mac/Linux
cp .env.example .env

# Windows
copy .env.example .env
```

2. Open `.env` in your favorite text editor
3. **Update the following critical settings:**

```env
# Django Secret Key - IMPORTANT: Change this!
SECRET_KEY=your-unique-secret-key-here

# Debug mode (True for development, False for production)
DEBUG=True

# Allowed hosts
ALLOWED_HOSTS=localhost,127.0.0.1

# Email configuration (see EMAIL_SETUP.md for detailed instructions)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend  # Prints to console
# For real emails, use:
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=True
# EMAIL_HOST_USER=your-email@gmail.com
# EMAIL_HOST_PASSWORD=your-gmail-app-password
# DEFAULT_FROM_EMAIL=CTRG Grant System <your-email@gmail.com>
```

> **Security Note:** Never commit `.env` to version control. It's already in `.gitignore`.

**Generate a Secure Secret Key:**

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output and paste it as your `SECRET_KEY` in `.env`.

### 3. Frontend Setup

In a **new terminal** (keep backend terminal open):

```bash
cd frontend
npm install
```

This installs all React and TypeScript dependencies.

---

## Database Initialization

With your backend virtual environment activated:

### Step 1: Run Database Migrations

```bash
cd backend  # if not already there
python manage.py migrate
```

This creates all necessary database tables.

### Step 2: Create Token Authentication Table

```bash
python manage.py migrate authtoken
```

This creates the table for user authentication tokens.

### Step 3: Setup Initial Data

```bash
python manage.py setup_initial_data
```

This command:
- ✅ Creates user role groups (PI, Reviewer, SRC_Chair)
- ✅ Creates a default admin user
- ✅ Displays login credentials

**Default Admin Credentials:**
```
Email: admin@nsu.edu
Password: admin123
```

> **⚠️ IMPORTANT:** Change the default password immediately after first login!

### Optional: Create Sample Data

```bash
python manage.py setup_initial_data --with-sample
```

This additionally creates:
- Sample grant cycle
- Sample reviewer accounts
- Sample PI account

---

## Configuration

### Email Configuration

The system sends automated emails for:
- Reviewer assignments
- Revision requests
- Final decisions
- Deadline reminders

**For Development (Console Output):**

In `backend/.env`:
```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Emails will print to the terminal instead of being sent.

**For Production (Real Emails):**

See [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed instructions on:
- Gmail SMTP setup
- SendGrid configuration
- Troubleshooting email issues

Quick Gmail setup:
1. Enable 2FA on Gmail
2. Generate app password: https://myaccount.google.com/apppasswords
3. Update `.env`:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-char-app-password
DEFAULT_FROM_EMAIL=CTRG Grant System <your-email@gmail.com>
```

### Database Configuration

**PostgreSQL (Default for local and production):**

Set in `.env`:
```env
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=ctrg_grant_db
DATABASE_USER=ctrg_user
DATABASE_PASSWORD=your_secure_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

**Optional SQLite fallback (explicit only):**
```env
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=db.sqlite3
```

Then install PostgreSQL driver:
```bash
pip install psycopg2-binary
```

---

## Running the Application

### Option 1: Using Startup Scripts (Recommended)

#### Mac/Linux

**Terminal 1 - Backend:**
```bash
./start-backend.sh
```

**Terminal 2 - Frontend:**
```bash
./start-frontend.sh
```

#### Windows

**Command Prompt 1 - Backend:**
```cmd
start-backend.bat
```

**Command Prompt 2 - Frontend:**
```cmd
cd frontend
npm run dev
```

### Option 2: Manual Startup

#### Terminal 1 - Backend

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python manage.py runserver
```

Backend will run at: **http://localhost:8000/**

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Frontend will run at: **http://localhost:5173/**

### Option 3: Background Tasks (Optional)

For automated deadline checks and reminder emails:

#### Terminal 3 - Celery Worker

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
celery -A config worker -l info
```

#### Terminal 4 - Celery Beat Scheduler

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
celery -A config beat -l info
```

> **Note:** Celery requires Redis to be running. Start Redis first:
> - Mac: `brew services start redis`
> - Linux: `sudo systemctl start redis`
> - Windows: Run `redis-server` from Redis installation directory

---

## Accessing the System

### URLs

- **Frontend Application**: http://localhost:5173/
- **Backend API**: http://localhost:8000/api/
- **Django Admin Panel**: http://localhost:8000/admin/
- **API Documentation (Browsable)**: http://localhost:8000/api/proposals/

### Default Login Credentials

After running `setup_initial_data`:

```
Email: admin@nsu.edu
Password: admin123
Role: SRC Chair (Administrator)
```

**⚠️ Security:** Change this password immediately in production!

### Creating Additional Users

#### Via Django Admin Panel

1. Go to http://localhost:8000/admin/
2. Login with admin credentials
3. Click "Users" → "Add User"
4. Fill in username and password
5. Click "Save and continue editing"
6. Add email, first name, last name
7. Scroll to "Groups" and select a role (PI, Reviewer, or SRC_Chair)
8. Click "Save"

#### Via API (Admin Only)

POST to `http://localhost:8000/api/auth/register/`

```json
{
  "username": "jane.smith",
  "email": "jane.smith@nsu.edu",
  "password": "SecurePass123!",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "Reviewer"
}
```

#### Via Django Shell

```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

# Create a reviewer
user = User.objects.create_user(
    username='reviewer1',
    email='reviewer1@nsu.edu',
    password='password123',
    first_name='John',
    last_name='Doe'
)
user.groups.add(Group.objects.get(name='Reviewer'))
```

---

## Troubleshooting

### Backend Issues

#### "ModuleNotFoundError: No module named 'django'"

**Cause:** Virtual environment not activated or dependencies not installed

**Solution:**
```bash
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### "django.core.exceptions.ImproperlyConfigured: Set the SECRET_KEY environment variable"

**Cause:** `.env` file missing or SECRET_KEY not set

**Solution:**
```bash
cp .env.example .env
# Edit .env and set SECRET_KEY
```

#### "RuntimeError: populate() isn't reentrant"

**Cause:** Django app loaded multiple times

**Solution:**
```bash
# Delete __pycache__ directories
find . -type d -name __pycache__ -exec rm -rf {} +
# Restart server
```

#### Database Errors

**Solution:**
```bash
# Delete database and start fresh
rm db.sqlite3
python manage.py migrate
python manage.py setup_initial_data
```

### Frontend Issues

#### "Cannot find module" or "Module not found"

**Cause:** Dependencies not installed

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### "Port 5173 is already in use"

**Cause:** Another process is using the port

**Solution:**

**Mac/Linux:**
```bash
# Find and kill process
lsof -ti:5173 | xargs kill -9
```

**Windows:**
```cmd
# Find process ID
netstat -ano | findstr :5173
# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Email Issues

#### Emails not sending

**Check:**
1. `backend/.env` email configuration
2. `backend/logs/django.log` for errors
3. Gmail app password is correct (no spaces)
4. 2FA is enabled on Gmail account

**Solution:** See [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed troubleshooting

#### Emails printing to console instead of sending

**Cause:** Console backend configured

**Solution:** Update `.env`:
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
```

### Authentication Issues

#### "Invalid email or password"

**Cause:** Incorrect credentials or user doesn't exist

**Solution:**
- Reset password via Django admin
- Create user via `setup_initial_data`
- Check that user exists in admin panel

#### "401 Unauthorized" on API calls

**Cause:** Not logged in or token expired

**Solution:**
- Login again via frontend
- Check browser localStorage for token
- Clear browser cache and cookies

---

## Production Deployment

For production deployment, additional steps are required:

### 1. Security Settings

Update `backend/.env`:

```env
DEBUG=False
SECRET_KEY=<strong-random-key-50+-characters>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
USE_X_FORWARDED_HOST=True
SECURE_PROXY_SSL_HEADER_ENABLED=True
SECURE_REFERRER_POLICY=strict-origin-when-cross-origin
SECURE_CROSS_ORIGIN_OPENER_POLICY=same-origin
```

### 2. Database

Use PostgreSQL instead of SQLite:

```bash
pip install psycopg2-binary
```

Update `.env`:
```env
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=ctrg_prod_db
DATABASE_USER=ctrg_prod_user
DATABASE_PASSWORD=<strong-password>
DATABASE_HOST=localhost
DATABASE_PORT=5432
CACHE_BACKEND=redis
CACHE_LOCATION=redis://localhost:6379/1
```

### 3. Email Service

Use SendGrid or similar service instead of Gmail:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<sendgrid-api-key>
DEFAULT_FROM_EMAIL=CTRG Grant System <noreply@yourdomain.com>
```

### 4. Static Files

```bash
# Collect static files
python manage.py collectstatic --noinput
```

### 5. WSGI Server

Use Gunicorn instead of development server:

```bash
pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### 6. Process Management

Use systemd (Linux) or Supervisor to manage Django and Celery processes:

```ini
# /etc/systemd/system/ctrg-backend.service
[Unit]
Description=CTRG Grant System Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/NSUProject/backend
ExecStart=/path/to/venv/bin/gunicorn config.wsgi:application --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### 7. Reverse Proxy

Use Nginx to serve the application:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /path/to/NSUProject/frontend/dist;
        try_files $uri /index.html;
    }
}
```

### 8. HTTPS/SSL

Use Let's Encrypt for free SSL certificates:

```bash
sudo certbot --nginx -d yourdomain.com
```

### 9. Monitoring

Set up:
- Log monitoring (Sentry, LogDNA)
- Uptime monitoring (UptimeRobot, Pingdom)
- Performance monitoring (New Relic, DataDog)
- Health probes:
  `GET /health/live/` for liveness
  `GET /health/ready/` for readiness

### 10. Backups

Regular backups of:
- PostgreSQL database (pg_dump)
- Media files (uploaded proposals)
- Environment configuration
- Redis persistence strategy if used for cache/broker durability assumptions

Recommended minimum backup policy:
- Database: nightly `pg_dump` with at least 7 daily retention points
- Media: nightly snapshot or object-storage versioning for `backend/media/`
- Encryption key: store `FILE_ENCRYPTION_KEY` in a secrets manager and back it up separately from the database dump
- Restore drill: test full restore of database + media + `.env` on a non-production host at least once per quarter

Example backup commands:

```bash
# Database backup
pg_dump "$DATABASE_URL" > backups/ctrg_$(date +%F).sql

# Media backup
tar -czf backups/ctrg_media_$(date +%F).tar.gz backend/media/

# Environment backup (store securely, never commit)
cp backend/.env backups/ctrg_env_$(date +%F).env.secure
```

Critical note on encrypted files:
- Proposal files are encrypted at rest when `FILE_ENCRYPTION_KEY` is configured.
- Production deployments must set `FILE_ENCRYPTION_KEY`; the backend now refuses to start with `DEBUG=False` if the key is missing.
- Database backups are not sufficient by themselves. You must preserve the matching encrypted media files and the encryption key, otherwise uploaded proposal documents cannot be restored.

---

## Quick Reference

### Common Commands

```bash
# Backend
python manage.py migrate          # Run database migrations
python manage.py createsuperuser  # Create admin user manually
python manage.py setup_initial_data  # Setup initial data
python manage.py runserver        # Start development server
python manage.py shell            # Open Django shell
python manage.py test             # Run tests

# Frontend
npm install                       # Install dependencies
npm run dev                       # Start development server
npm run build                     # Build for production
npm run preview                   # Preview production build

# Celery
celery -A config worker -l info   # Start worker
celery -A config beat -l info     # Start scheduler
```

### File Locations

- **Backend Code**: `backend/`
- **Frontend Code**: `frontend/src/`
- **Environment Config**: `backend/.env`
- **Database**: PostgreSQL database defined in `backend/.env` (default: `ctrg_grant_db`)
- **Uploaded Files**: `backend/media/`
- **Logs**: `backend/logs/django.log`

---

## Support

For additional help:

- **Email Setup**: See [EMAIL_SETUP.md](EMAIL_SETUP.md)
- **General Setup**: See [README.md](README.md)
- **Logs**: Check `backend/logs/django.log`

---

**Last Updated**: February 2026
