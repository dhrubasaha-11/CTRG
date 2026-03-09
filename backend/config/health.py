from pathlib import Path

from django.conf import settings
from django.core.cache import caches
from django.db import connections
from django.db.utils import OperationalError
from django.http import JsonResponse
from django.utils import timezone


def _check_database():
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return {'status': 'ok'}
    except OperationalError as exc:
        return {'status': 'error', 'detail': str(exc)}


def _check_cache():
    try:
        cache = caches['default']
        cache.set('healthcheck', 'ok', timeout=5)
        value = cache.get('healthcheck')
        return {'status': 'ok' if value == 'ok' else 'error'}
    except Exception as exc:  # pragma: no cover - backend-specific failures
        return {'status': 'error', 'detail': str(exc)}


def _check_media_root():
    media_root = Path(settings.MEDIA_ROOT)
    try:
        media_root.mkdir(parents=True, exist_ok=True)
        probe = media_root / '.healthcheck'
        probe.write_text('ok', encoding='utf-8')
        probe.unlink(missing_ok=True)
        return {'status': 'ok'}
    except OSError as exc:
        return {'status': 'error', 'detail': str(exc)}


def live(request):
    return JsonResponse({
        'service': 'CTRG backend',
        'status': 'ok',
        'time': timezone.now().isoformat(),
    })


def ready(request):
    checks = {
        'database': _check_database(),
        'cache': _check_cache(),
        'media_root': _check_media_root(),
    }
    is_ready = all(check['status'] == 'ok' for check in checks.values())
    return JsonResponse(
        {
            'service': 'CTRG backend',
            'status': 'ok' if is_ready else 'degraded',
            'time': timezone.now().isoformat(),
            'checks': checks,
        },
        status=200 if is_ready else 503,
    )
