import sys
import os

# Add backend/ to sys.path so Django can find config.settings, users, proposals, reviews
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Lazy WSGI handler — Django is only initialized on first request,
# not at build time (avoids import failures during Vercel build)
_application = None

def app(environ, start_response):
    global _application
    if _application is None:
        from django.core.wsgi import get_wsgi_application
        _application = get_wsgi_application()
    return _application(environ, start_response)
