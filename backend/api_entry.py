import sys
import os
import traceback

# Add backend/ to sys.path so Django can find config.settings, users, proposals, reviews
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Temporary diagnostic — remove after DB connection is confirmed working
print(f"[DIAG] DB_HOST={os.environ.get('DATABASE_HOST','?').strip()!r} "
      f"DB_USER={os.environ.get('DATABASE_USER','?').strip()!r} "
      f"DB_PORT={os.environ.get('DATABASE_PORT','?').strip()!r} "
      f"DB_NAME={os.environ.get('DATABASE_NAME','?').strip()!r}", flush=True)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

_application = None
_startup_error = None

def app(environ, start_response):
    global _application, _startup_error
    if _application is None and _startup_error is None:
        try:
            from django.core.wsgi import get_wsgi_application
            _application = get_wsgi_application()
        except Exception:
            _startup_error = traceback.format_exc()

    if _startup_error:
        status = '500 Internal Server Error'
        headers = [('Content-Type', 'text/plain; charset=utf-8')]
        start_response(status, headers)
        return [_startup_error.encode('utf-8')]

    return _application(environ, start_response)
