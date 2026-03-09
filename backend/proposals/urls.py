"""
URL patterns for the proposals module.
"""
from rest_framework.routers import DefaultRouter
from .views import (
    GrantCycleViewSet, ProposalViewSet, DashboardViewSet, AuditLogViewSet,
    ResearchAreaViewSet, KeywordViewSet, ResearchAreaKeywordViewSet
)

router = DefaultRouter()
router.register(r'cycles', GrantCycleViewSet, basename='grantcycle')
router.register(r'proposals', ProposalViewSet, basename='proposal')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'research-areas', ResearchAreaViewSet, basename='researcharea')
router.register(r'keywords', KeywordViewSet, basename='keyword')
router.register(r'research-area-keywords', ResearchAreaKeywordViewSet, basename='researchareakeyword')

urlpatterns = router.urls
