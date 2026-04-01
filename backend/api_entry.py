import sys
import os

# Add backend/ to sys.path so Django can find config.settings, users, proposals, reviews
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Lazy WSGI handler — Django initializes on first request, not at build time
_application = None

def app(environ, start_response):
    global _application
    if _application is None:
        from django.core.wsgi import get_wsgi_application
        _application = get_wsgi_application()
    return _application(environ, start_response)
