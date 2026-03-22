import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    """
    Custom User model for CTRG System.
    Extends Django's AbstractUser to add expertise_tags and other profile fields.
    """
    email = models.EmailField(unique=True)
    expertise_tags = models.JSONField(default=list, blank=True, help_text="List of expertise areas for reviewer matching.")

    # Roles will be handled via Django Groups ("PI", "Reviewer", "Admin", "SRC_Chair")

    def __str__(self):
        return self.email


class ReviewerInvitation(models.Model):
    """
    Invitation token for reviewer registration.
    Only the SRC Chair can create invitations. Reviewers cannot self-register.
    """
    email = models.EmailField(help_text="Email address of the invited reviewer")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    invited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_invitations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text="Invitation expiry time"
    )
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation for {self.email} ({'used' if self.is_used else 'pending'})"

    def save(self, *args, **kwargs):
        if self.expires_at is None:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        if self.expires_at is None:
            return True
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.is_used and not self.is_expired
