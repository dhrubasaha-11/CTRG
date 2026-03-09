"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from . import health


def root_view(request):
    """Public root endpoint so backend base URL does not return 404/401."""
    return JsonResponse({
        'service': 'CTRG backend',
        'status': 'ok',
        'endpoints': {
            'admin': '/admin/',
            'auth': '/api/auth/',
            'api': '/api/',
        }
    })

urlpatterns = [
    # Public root route for quick health/info check
    path('', root_view, name='root'),
    path('health/live/', health.live, name='health-live'),
    path('health/ready/', health.ready, name='health-ready'),

    # Django admin interface
    path('admin/', admin.site.urls),

    # Authentication endpoints
    path('api/auth/', include('users.urls')),

    # Proposal management endpoints
    path('api/', include('proposals.urls')),

    # Review management endpoints
    path('api/', include('reviews.urls')),
]

# Serve media files in both development and production.
# In a high-traffic production setup, consider serving via nginx or cloud storage instead.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
