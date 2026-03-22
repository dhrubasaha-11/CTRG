"""
URL Configuration for User Authentication Endpoints

This module defines URL patterns for all user authentication and management
endpoints in the CTRG Grant System.

Endpoints:
    - POST /login/ - User login
    - POST /logout/ - User logout
    - GET /user/ - Get current user profile
    - POST /register/ - Create new user (admin only)
    - POST /change-password/ - Change password
    - GET /users/ - List all users (admin only)
    - GET /users/<id>/ - Get specific user details (admin only)
    - PUT /users/<id>/ - Update user (admin only)
    - DELETE /users/<id>/ - Delete user (admin only)

Authentication: All endpoints except /login/ require token authentication
"""

from django.urls import path
from .views import (
    LoginView,
    LogoutView,
    CurrentUserView,
    TokenValidationView,
    UserRegistrationView,
    ChangePasswordView,
    UserListView,
    UserDetailView,
    ImportReviewersFromExcelView,
    InvitedReviewerRegistrationView,
    PendingReviewersView,
    ReviewerCVDownloadView,
    ApproveReviewerView,
    RejectReviewerView,
    InviteReviewerView,
    ValidateInvitationTokenView,
    ListInvitationsView,
)

# App name for namespacing (optional but recommended)
app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    # User login with email/password, returns auth token

    path('logout/', LogoutView.as_view(), name='logout'),
    # User logout, destroys auth token

    path('user/', CurrentUserView.as_view(), name='current-user'),
    # Get current authenticated user's profile

    path('validate-token/', TokenValidationView.as_view(), name='validate-token'),
    # Validate auth token and return role-based redirect metadata

    # User management endpoints (admin only)
    path('register/', UserRegistrationView.as_view(), name='register'),
    # Create new user account (SRC Chair only)

    path('import-reviewers/', ImportReviewersFromExcelView.as_view(), name='import-reviewers'),
    # Bulk import reviewer accounts from Excel (.xlsx) (admin only)

    path('register-reviewer/', InvitedReviewerRegistrationView.as_view(), name='register-reviewer'),
    # Reviewer registration via invitation token (replaces public self-registration)

    path('invite-reviewer/', InviteReviewerView.as_view(), name='invite-reviewer'),
    # SRC Chair sends invitation email to a reviewer (admin only)

    path('validate-invitation/<uuid:token>/', ValidateInvitationTokenView.as_view(), name='validate-invitation'),
    # Validate invitation token and return invited email (public)

    path('invitations/', ListInvitationsView.as_view(), name='list-invitations'),
    # List all invitations (admin only)

    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    # Change current user's password

    path('users/', UserListView.as_view(), name='user-list'),
    # List all users (admin only)

    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    # Get, update, or delete specific user (admin only)

    path('pending-reviewers/', PendingReviewersView.as_view(), name='pending-reviewers'),
    # List all pending (inactive) reviewer registrations (admin only)

    path('reviewer-cv/<int:pk>/', ReviewerCVDownloadView.as_view(), name='reviewer-cv'),
    # Download a reviewer's submitted CV (admin only)

    path('approve-reviewer/<int:pk>/', ApproveReviewerView.as_view(), name='approve-reviewer'),
    # Approve a pending reviewer registration (admin only)

    path('reject-reviewer/<int:pk>/', RejectReviewerView.as_view(), name='reject-reviewer'),
    # Reject a pending reviewer registration (admin only)
]
