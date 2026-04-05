# Email Notification System

## Notification Triggers

| Event | Recipients | Subject Template | Priority |
|-------|-----------|-----------------|----------|
| Reviewer assigned to proposal | Assigned reviewer | "CTRG Review Assignment: {proposal_title}" | High |
| All Stage 1 reviews complete | SRC Chair | "All Reviews Submitted: {proposal_code}" | High |
| Stage 1 Decision: Rejected | PI (pi_email) | "CTRG Proposal Decision: {proposal_code}" | High |
| Stage 1 Decision: Accepted | PI (pi_email) | "CTRG Proposal Accepted: {proposal_code}" | High |
| Stage 1 Decision: Tentatively Accepted | PI (pi_email) | "CTRG Proposal: Revision Required - {proposal_code}" | High |
| Revision requested (timer started) | PI (pi_email) | "CTRG: Please Submit Revision by {deadline}" | High |
| Revision submitted by PI | SRC Chair | "Revised Proposal Submitted: {proposal_code}" | Medium |
| Stage 2 review assigned | Assigned reviewer | "CTRG Stage 2 Review: {proposal_title}" | High |
| Final decision | PI (pi_email) | "CTRG Final Decision: {proposal_code}" | High |
| Revision deadline 2 days warning | PI (pi_email) | "CTRG Reminder: Revision Due in 2 Days" | High |
| Revision deadline missed | PI (pi_email), SRC Chair | "CTRG: Revision Deadline Missed - {proposal_code}" | High |
| SRC Chair manual email to reviewer(s) | Selected reviewer(s) | Custom subject | Medium |

## Implementation
- All emails sent via **Celery async tasks** with retry (max_retries=3, retry_delay=60s)
- Use Django's `send_mail()` with HTML template rendering
- Store every email in `NotificationLog` model (for audit trail)
- Email templates in `backend/templates/emails/`
- Base template: `emails/base.html` with NSU branding header/footer
- Each trigger has its own template extending base

## Celery Task Pattern
```python
# apps/notifications/tasks.py
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_email(self, notification_log_id):
    try:
        log = NotificationLog.objects.get(id=notification_log_id)
        send_mail(
            subject=log.subject,
            message=strip_tags(log.body),
            html_message=log.body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[log.recipient_email],
        )
        log.is_sent = True
        log.save()
    except Exception as exc:
        log.error_message = str(exc)
        log.save()
        raise self.retry(exc=exc)
```

## SRC Chair Email Feature
- SRC Chair can compose and send custom emails to:
  - A single reviewer
  - All reviewers assigned to a specific proposal
  - All reviewers in the system
- These use a custom email form (subject + body)
- Still logged in NotificationLog with type='manual_email'