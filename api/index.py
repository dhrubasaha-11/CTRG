import sys
import os

# Add backend/ to sys.path so Django can find config.settings, users, proposals, reviews
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from config.wsgi import application as handler  # noqa: E402
