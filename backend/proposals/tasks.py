"""
Celery tasks for the proposals module.
Runs periodic background jobs for deadline monitoring.
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.core.cache import cache
from .models import Proposal
from .services import ProposalService, EmailService

logger = logging.getLogger(__name__)


@shared_task
def check_revision_deadlines():
    """
    Periodic task to check for missed revision deadlines.
    Runs every hour (configured in settings.py CELERY_BEAT_SCHEDULE).
    """
    # Get all proposals awaiting revision
    proposals = Proposal.objects.filter(
        status=Proposal.Status.REVISION_REQUESTED,
        revision_deadline__lt=timezone.now()
    )
    
    count = 0
    for proposal in proposals:
        if ProposalService.check_revision_deadline(proposal):
            count += 1
            # Email is already sent inside mark_revision_deadline_missed()
    
    return f"Checked {proposals.count()} proposals, marked {count} as deadline missed"


@shared_task
def send_deadline_reminders():
    """
    Send reminder emails 24 hours before revision deadline.
    """
    from datetime import timedelta
    from django.core.mail import send_mail
    from django.conf import settings
    
    # Find proposals with deadlines in the next 24 hours
    now = timezone.now()
    reminder_window = now + timedelta(hours=24)
    
    proposals = Proposal.objects.filter(
        status=Proposal.Status.REVISION_REQUESTED,
        revision_deadline__gt=now,
        revision_deadline__lte=reminder_window
    )
    
    count = 0
    for proposal in proposals:
        # Idempotency: skip if reminder was already sent for this proposal today
        cache_key = f"revision_reminder_{proposal.id}_{now.date().isoformat()}"
        if cache.get(cache_key):
            continue

        subject = f"REMINDER: Revision Deadline Tomorrow - {proposal.proposal_code}"
        message = f"""
Dear {proposal.pi_name},

This is a reminder that your revision for proposal "{proposal.title}" is due soon.

Proposal Code: {proposal.proposal_code}
Deadline: {proposal.revision_deadline.strftime('%Y-%m-%d %H:%M')}

Please log in to the system to submit your revised proposal before the deadline.

Best regards,
CTRG Grant Review System
        """

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@nsu.edu',
                [proposal.pi_email],
                fail_silently=False
            )
            count += 1
            cache.set(cache_key, True, timeout=86400)  # 24 hours
        except Exception:
            logger.exception("Failed to send revision reminder for %s", proposal.proposal_code)

    return f"Sent {count} deadline reminder emails"


@shared_task
def send_review_reminders():
    """
    Send reminder emails to reviewers with pending reviews approaching deadline.
    """
    from datetime import timedelta
    from reviews.models import ReviewAssignment
    from django.core.mail import send_mail
    from django.conf import settings
    
    now = timezone.now()
    reminder_window = now + timedelta(hours=48)
    
    assignments = ReviewAssignment.objects.filter(
        status=ReviewAssignment.Status.PENDING,
        deadline__gt=now,
        deadline__lte=reminder_window
    ).select_related('proposal', 'reviewer')
    
    count = 0
    for assignment in assignments:
        # Idempotency: skip if reminder was already sent for this assignment today
        cache_key = f"review_reminder_{assignment.id}_{now.date().isoformat()}"
        if cache.get(cache_key):
            continue

        subject = f"REMINDER: Review Due Soon - {assignment.proposal.proposal_code}"
        message = f"""
Dear {assignment.reviewer.get_full_name() or assignment.reviewer.username},

This is a reminder that your review for proposal "{assignment.proposal.title}" is due soon.

Proposal Code: {assignment.proposal.proposal_code}
Stage: {assignment.get_stage_display()}
Deadline: {assignment.deadline.strftime('%Y-%m-%d %H:%M')}

Please log in to complete your review before the deadline.

Best regards,
CTRG Grant Review System
        """

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@nsu.edu',
                [assignment.reviewer.email],
                fail_silently=False
            )
            count += 1
            cache.set(cache_key, True, timeout=86400)  # 24 hours
        except Exception:
            logger.exception("Failed to send review reminder for assignment %s", assignment.id)

    return f"Sent {count} review reminder emails"
