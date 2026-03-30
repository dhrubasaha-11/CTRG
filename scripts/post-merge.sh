#!/bin/bash
set -e

cd frontend && npm install && cd ..

pip install -r backend/requirements.txt --quiet

cd backend && python manage.py migrate --noinput && cd ..
