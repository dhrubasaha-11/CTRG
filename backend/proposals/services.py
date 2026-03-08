"""
Business Logic Services for Proposals Module.
Handles proposal lifecycle, status transitions, and notifications.
"""
import logging
from django.utils import timezone

from decimal import Decimal
from datetime import timedelta
from .models import Proposal, Stage1Decision, FinalDecision, AuditLog

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract client IP address from a Django request object."""
    if request is None:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class ProposalService:
    """Manages proposal lifecycle and status transitions."""
    
    @staticmethod
    def generate_proposal_code(cycle):
        """Generate unique proposal code like CTRG-2025-001."""
        from .models import Proposal
        cycle_year = str(cycle.year).split('-')[0] if cycle and cycle.year else str(timezone.now().year)
        count = Proposal.objects.filter(proposal_code__startswith=f"CTRG-{cycle_year}-").count() + 1
        proposal_code = f"CTRG-{cycle_year}-{count:03d}"
        while Proposal.objects.filter(proposal_code=proposal_code).exists():
            count += 1
            proposal_code = f"CTRG-{cycle_year}-{count:03d}"
        return proposal_code
    
    @staticmethod
    def submit_proposal(proposal):
        """Submit a draft proposal for review."""
        if proposal.status != Proposal.Status.DRAFT:
            raise ValueError("Only draft proposals can be submitted")
        
        proposal.status = Proposal.Status.SUBMITTED
        proposal.submitted_at = timezone.now()
        proposal.save()
        
        AuditLog.objects.create(
            user=None,  # PI relationship removed - audit without specific user
            action_type='PROPOSAL_SUBMITTED',
            proposal=proposal,
            details={'proposal_code': proposal.proposal_code, 'pi_email': proposal.pi_email}
        )
        return proposal
    
    @staticmethod
    def check_stage1_completion(proposal):
        """
        Check if all Stage 1 reviews are completed.
        Returns the average score if complete, None otherwise.
        """
        from reviews.models import ReviewAssignment, Stage1Score
        
        assignments = ReviewAssignment.objects.filter(
            proposal=proposal, 
            stage=ReviewAssignment.Stage.STAGE_1
        )
        if not assignments.exists():
            return None

        included_assignments = assignments.exclude(
            review_validity=ReviewAssignment.ReviewValidity.REJECTED
        )
        if not included_assignments.exists():
            return None

        if all(a.status == ReviewAssignment.Status.COMPLETED for a in included_assignments):
            # Calculate average score
            scores = []
            for assignment in included_assignments:
                try:
                    score = assignment.stage1_score
                    scores.append(score.total_score)
                except Stage1Score.DoesNotExist:
                    return None
            
            if scores:
                avg_score = sum(scores) / len(scores)
                return Decimal(str(avg_score))
        return None
    
    @staticmethod
    def apply_stage1_decision(proposal, decision, chair_comments='', user=None):
        """
        Apply SRC Chair's Stage 1 decision.
        
        Args:
            proposal: Proposal instance
            decision: Stage1Decision.Decision choice
            chair_comments: Optional comments from chair
            user: User making the decision (for audit)
        """
        from reviews.models import ReviewAssignment
        
        # Calculate average score
        avg_score = ProposalService.check_stage1_completion(proposal)
        if avg_score is None:
            raise ValueError("Not all Stage 1 reviews are complete")

        # Warn if score below acceptance threshold (informational, chair can override)
        threshold = proposal.cycle.acceptance_threshold
        if decision != Stage1Decision.Decision.REJECT and avg_score < threshold:
            # Allow but log the override
            pass  # Chair can accept below threshold at their discretion

        # Guard against duplicate decisions
        if hasattr(proposal, 'stage1_decision'):
            raise ValueError("Stage 1 decision already exists for this proposal")

        # Create decision record
        stage1_decision = Stage1Decision.objects.create(
            proposal=proposal,
            decision=decision,
            chair_comments=chair_comments,
            average_score=avg_score
        )
        
        # Update proposal status based on decision
        should_save_proposal = True
        if decision == Stage1Decision.Decision.REJECT:
            proposal.status = Proposal.Status.STAGE_1_REJECTED
        elif decision == Stage1Decision.Decision.ACCEPT:
            proposal.status = Proposal.Status.ACCEPTED_NO_CORRECTIONS
        elif decision == Stage1Decision.Decision.TENTATIVELY_ACCEPT:
            # Reflect Tentative Acceptance then immediately open revision window
            proposal.status = Proposal.Status.TENTATIVELY_ACCEPTED
            proposal.save(update_fields=['status'])
            ProposalService.start_revision_window(proposal)
            should_save_proposal = False
        
        if should_save_proposal:
            proposal.save()
        
        # Audit log
        AuditLog.objects.create(
            user=user,
            action_type='STAGE1_DECISION_MADE',
            proposal=proposal,
            details={
                'decision': decision,
                'average_score': float(avg_score),
                'chair_comments': chair_comments
            }
        )
        
        return stage1_decision
    
    @staticmethod
    def start_revision_window(proposal, days=None):
        """Start the revision window for a tentatively accepted proposal."""
        if days is None:
            days = proposal.cycle.revision_window_days
        
        proposal.status = Proposal.Status.REVISION_REQUESTED
        proposal.revision_deadline = timezone.now() + timedelta(days=days)
        proposal.save()

        # Notify PI that revision is required.
        EmailService.send_revision_request_email(proposal)
        return proposal
    
    @staticmethod
    def submit_revision(proposal, revised_file=None, response_file=None, user=None):
        """Submit revised proposal after Stage 1 tentative acceptance."""
        if proposal.status != Proposal.Status.REVISION_REQUESTED:
            raise ValueError("Proposal is not awaiting revision")
        
        if proposal.is_revision_overdue:
            proposal.status = Proposal.Status.REVISION_DEADLINE_MISSED
            proposal.save()
            raise ValueError("Revision deadline has passed")
        
        if revised_file:
            proposal.revised_proposal_file = revised_file
        if response_file:
            proposal.response_to_reviewers_file = response_file
        
        proposal.status = Proposal.Status.REVISED_PROPOSAL_SUBMITTED
        proposal.save()
        
        AuditLog.objects.create(
            user=user,
            action_type='REVISION_SUBMITTED',
            proposal=proposal,
            details={'submitted_at': str(timezone.now())}
        )
        
        return proposal
    
    @staticmethod
    def start_stage2_review(proposal, user=None):
        """Transition proposal to Stage 2 review."""
        if proposal.status != Proposal.Status.REVISED_PROPOSAL_SUBMITTED:
            raise ValueError("Revised proposal not submitted")
        
        proposal.status = Proposal.Status.UNDER_STAGE_2_REVIEW
        proposal.save()
        
        AuditLog.objects.create(
            user=user,
            action_type='STAGE2_REVIEW_STARTED',
            proposal=proposal
        )
        
        return proposal
    
    @staticmethod
    def check_stage2_completion(proposal):
        """Check if all Stage 2 reviews are completed."""
        from reviews.models import ReviewAssignment
        
        assignments = ReviewAssignment.objects.filter(
            proposal=proposal,
            stage=ReviewAssignment.Stage.STAGE_2
        )
        if not assignments.exists():
            return False

        return all(a.status == ReviewAssignment.Status.COMPLETED for a in assignments)
    
    @staticmethod
    def apply_final_decision(proposal, decision, approved_amount, final_remarks, user=None):
        """
        Apply final decision after Stage 2 review.
        """
        allowed_statuses = {
            Proposal.Status.UNDER_STAGE_2_REVIEW,
            Proposal.Status.REVISED_PROPOSAL_SUBMITTED,
        }
        if proposal.status not in allowed_statuses:
            raise ValueError("Final decision can only be applied after Stage 2 workflow starts")
        if hasattr(proposal, 'final_decision'):
            raise ValueError("Final decision already exists for this proposal")

        # If Stage 2 assignments exist, ensure they are complete before final decision.
        from reviews.models import ReviewAssignment
        stage2_assignments = ReviewAssignment.objects.filter(
            proposal=proposal,
            stage=ReviewAssignment.Stage.STAGE_2
        )
        if stage2_assignments.exists() and not ProposalService.check_stage2_completion(proposal):
            raise ValueError("Not all Stage 2 reviews are complete")

        # Create final decision record
        final_decision = FinalDecision.objects.create(
            proposal=proposal,
            decision=decision,
            approved_grant_amount=approved_amount,
            final_remarks=final_remarks
        )
        
        # Update proposal status and lock
        if decision == FinalDecision.Decision.ACCEPTED:
            proposal.status = Proposal.Status.FINAL_ACCEPTED
        else:
            proposal.status = Proposal.Status.FINAL_REJECTED

        proposal.is_locked = True
        proposal.save()
        
        # Audit log
        AuditLog.objects.create(
            user=user,
            action_type='FINAL_DECISION_MADE',
            proposal=proposal,
            details={
                'decision': decision,
                'approved_amount': float(approved_amount),
                'final_remarks': final_remarks
            }
        )
        
        return final_decision
    
    @staticmethod
    def check_revision_deadline(proposal):
        """Check and auto-reject proposal if revision deadline passed."""
        if proposal.status == Proposal.Status.REVISION_REQUESTED:
            if proposal.revision_deadline and timezone.now() > proposal.revision_deadline:
                proposal.status = Proposal.Status.REVISION_DEADLINE_MISSED
                proposal.is_locked = True
                proposal.save()

                # Auto-reject: create a final decision record
                FinalDecision.objects.get_or_create(
                    proposal=proposal,
                    defaults={
                        'decision': FinalDecision.Decision.REJECTED,
                        'approved_grant_amount': 0,
                        'final_remarks': 'Auto-rejected: revision deadline missed.',
                    }
                )

                AuditLog.objects.create(
                    action_type='REVISION_DEADLINE_MISSED',
                    proposal=proposal,
                    details={
                        'deadline': str(proposal.revision_deadline),
                        'auto_rejected': True,
                    }
                )
                return True
        return False


class ReviewerService:
    """Manages reviewer assignments and workload."""
    
    @staticmethod
    def validate_assignment(proposal, reviewer, stage=1):
        """
        Validate if a reviewer can be assigned to a proposal.
        Returns (is_valid, error_message)
        """
        from reviews.models import ReviewAssignment, ReviewerProfile

        if stage == ReviewAssignment.Stage.STAGE_1 and proposal.status not in {
            Proposal.Status.SUBMITTED,
            Proposal.Status.UNDER_STAGE_1_REVIEW,
        }:
            return False, "Stage 1 assignments are only allowed for submitted proposals awaiting Stage 1 review"

        if stage == ReviewAssignment.Stage.STAGE_2 and proposal.status not in {
            Proposal.Status.REVISED_PROPOSAL_SUBMITTED,
            Proposal.Status.UNDER_STAGE_2_REVIEW,
        }:
            return False, "Stage 2 assignments are only allowed after revision submission"
        
        # Check for duplicate assignment
        existing = ReviewAssignment.objects.filter(
            proposal=proposal,
            reviewer=reviewer,
            stage=stage
        ).exists()
        
        if existing:
            return False, "Reviewer is already assigned to this proposal for this stage"
        
        # Check reviewer profile and workload
        try:
            profile = reviewer.reviewer_profile
            if not profile.is_active_reviewer:
                return False, "Reviewer is not active"
            
            if not profile.can_accept_review():
                return False, f"Reviewer has reached maximum workload ({profile.max_review_load})"
        except ReviewerProfile.DoesNotExist:
            return False, "User does not have a reviewer profile"
        
        # Check max reviewers per proposal
        current_count = ReviewAssignment.objects.filter(
            proposal=proposal,
            stage=stage
        ).count()
        
        if current_count >= proposal.cycle.max_reviewers_per_proposal:
            return False, f"Maximum reviewers ({proposal.cycle.max_reviewers_per_proposal}) already assigned"
        
        return True, None
    
    @staticmethod
    def assign_reviewer(proposal, reviewer, stage, deadline, user=None):
        """
        Assign a reviewer to a proposal.
        """
        from reviews.models import ReviewAssignment
        
        # Validate
        is_valid, error = ReviewerService.validate_assignment(proposal, reviewer, stage)
        if not is_valid:
            raise ValueError(error)
        
        # Create assignment
        assignment = ReviewAssignment.objects.create(
            proposal=proposal,
            reviewer=reviewer,
            stage=stage,
            deadline=deadline
        )
        
        # Update proposal status if first assignment
        if proposal.status == Proposal.Status.SUBMITTED and stage == 1:
            proposal.status = Proposal.Status.UNDER_STAGE_1_REVIEW
            proposal.save()
        elif proposal.status == Proposal.Status.REVISED_PROPOSAL_SUBMITTED and stage == 2:
            proposal.status = Proposal.Status.UNDER_STAGE_2_REVIEW
            proposal.save()
        
        # Audit log
        AuditLog.objects.create(
            user=user,
            action_type='REVIEWER_ASSIGNED',
            proposal=proposal,
            details={
                'reviewer_id': reviewer.id,
                'reviewer_email': reviewer.email,
                'stage': stage,
                'deadline': str(deadline)
            }
        )

        # Auto-notify reviewer via email
        try:
            EmailService.send_reviewer_assignment_email(assignment)
        except Exception:
            logger.warning("Failed to auto-notify reviewer %s for assignment %s", reviewer.email, assignment.id)

        return assignment

    @staticmethod
    def _expertise_match_score(profile, keywords):
        """Compute lightweight expertise match score against reviewer profile text."""
        if not keywords:
            return 0

        expertise_text = (profile.area_of_expertise or '').lower()
        department_text = (profile.department or '').lower()
        score = 0

        for keyword in keywords:
            kw = keyword.strip().lower()
            if not kw:
                continue
            if kw in expertise_text:
                score += 2
            elif kw in department_text:
                score += 1

        return score

    @staticmethod
    def auto_assign_reviewers(
        proposal,
        stage,
        deadline,
        reviewer_count=None,
        expertise_keywords=None,
        exclude_reviewer_ids=None,
        user=None,
    ):
        """
        Automatically assign reviewers balancing expertise and current workload.
        """
        from reviews.models import ReviewerProfile

        max_allowed = proposal.cycle.max_reviewers_per_proposal
        requested = reviewer_count or max_allowed
        target_count = max(1, min(requested, max_allowed))
        excluded_ids = set(exclude_reviewer_ids or [])
        keywords = expertise_keywords or []

        candidate_profiles = ReviewerProfile.objects.select_related('user').filter(
            is_active_reviewer=True,
            user__is_active=True,
            user__groups__name='Reviewer',
        ).exclude(user_id__in=excluded_ids).distinct()

        ranked_candidates = []
        skipped = []

        for profile in candidate_profiles:
            reviewer = profile.user
            is_valid, error = ReviewerService.validate_assignment(proposal, reviewer, stage=stage)
            if not is_valid:
                skipped.append({
                    'reviewer_id': reviewer.id,
                    'reviewer_email': reviewer.email,
                    'reason': error,
                })
                continue

            expertise_score = ReviewerService._expertise_match_score(profile, keywords)
            workload = profile.current_review_count()
            capacity = max(profile.max_review_load, 1)
            workload_ratio = workload / capacity

            ranked_candidates.append({
                'profile': profile,
                'expertise_score': expertise_score,
                'workload': workload,
                'workload_ratio': workload_ratio,
            })

        ranked_candidates.sort(
            key=lambda item: (
                -item['expertise_score'],
                item['workload_ratio'],
                item['workload'],
                item['profile'].user_id,
            )
        )

        assignments = []
        assignment_errors = []

        for candidate in ranked_candidates[:target_count]:
            reviewer = candidate['profile'].user
            try:
                assignment = ReviewerService.assign_reviewer(
                    proposal=proposal,
                    reviewer=reviewer,
                    stage=stage,
                    deadline=deadline,
                    user=user,
                )
                assignments.append(assignment)
            except ValueError as exc:
                assignment_errors.append({
                    'reviewer_id': reviewer.id,
                    'reviewer_email': reviewer.email,
                    'reason': str(exc),
                })

        return {
            'requested_count': target_count,
            'assigned_count': len(assignments),
            'assignments': assignments,
            'skipped_candidates': skipped,
            'assignment_errors': assignment_errors,
            'candidates_considered': len(ranked_candidates),
        }
    
    @staticmethod
    def get_reviewer_workload(reviewer):
        """Get reviewer's current workload statistics."""
        from reviews.models import ReviewAssignment
        
        assignments = ReviewAssignment.objects.filter(reviewer=reviewer)
        
        return {
            'total': assignments.count(),
            'pending': assignments.filter(status=ReviewAssignment.Status.PENDING).count(),
            'completed': assignments.filter(status=ReviewAssignment.Status.COMPLETED).count(),
            'stage1_pending': assignments.filter(
                status=ReviewAssignment.Status.PENDING,
                stage=ReviewAssignment.Stage.STAGE_1
            ).count(),
            'stage2_pending': assignments.filter(
                status=ReviewAssignment.Status.PENDING,
                stage=ReviewAssignment.Stage.STAGE_2
            ).count(),
        }
    
    @staticmethod
    def get_all_reviewers_stats():
        """Get workload statistics for all reviewers."""
        from reviews.models import ReviewerProfile
        from django.contrib.auth import get_user_model

        User = get_user_model()
        stats = []

        profiles = ReviewerProfile.objects.select_related('user').all()
        for profile in profiles:
            workload = ReviewerService.get_reviewer_workload(profile.user)
            current_workload = workload['pending']
            stats.append({
                'id': profile.id,
                'user': profile.user.id,
                'user_email': profile.user.email,
                'user_name': profile.user.get_full_name() or profile.user.username,
                'is_active_reviewer': profile.is_active_reviewer,
                'max_review_load': profile.max_review_load,
                'department': profile.department,
                'area_of_expertise': profile.area_of_expertise,
                'current_workload': current_workload,
                'can_accept_more': profile.can_accept_review(),
                **workload
            })

        return stats


class EmailService:
    """Handles email notifications for the grant system."""

    @staticmethod
    def _get_from_email():
        from django.conf import settings
        return settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@nsu.edu'

    @staticmethod
    def _send_email(subject, message, recipient_list):
        from django.core.mail import send_mail

        if not recipient_list:
            logger.warning("Email not sent: empty recipient list for subject '%s'", subject)
            return False

        try:
            sent_count = send_mail(
                subject=subject,
                message=message,
                from_email=EmailService._get_from_email(),
                recipient_list=recipient_list,
                fail_silently=False
            )
            return sent_count > 0
        except Exception:
            logger.exception("Email send failed for subject '%s'", subject)
            return False
    
    @staticmethod
    def send_reviewer_assignment_email(assignment):
        """Send email to reviewer about new assignment."""
        subject = f"New Review Assignment: {assignment.proposal.proposal_code}"
        message = f"""
Dear {assignment.reviewer.get_full_name() or assignment.reviewer.username},

You have been assigned to review a grant proposal.

Proposal: {assignment.proposal.title}
Code: {assignment.proposal.proposal_code}
Stage: {assignment.get_stage_display()}
Deadline: {assignment.deadline.strftime('%Y-%m-%d %H:%M')}

Please log in to the system to complete your review.

Best regards,
CTRG Grant Review System
        """

        sent = EmailService._send_email(
            subject=subject,
            message=message,
            recipient_list=[assignment.reviewer.email]
        )
        if sent:
            assignment.notification_sent = True
            assignment.save(update_fields=['notification_sent'])
            return True
        return False
    
    @staticmethod
    def send_revision_request_email(proposal):
        """Send email to PI about revision request."""
        subject = f"Revision Requested: {proposal.proposal_code}"
        message = f"""
Dear {proposal.pi_name},

Your proposal "{proposal.title}" has been tentatively accepted pending revisions.

Proposal Code: {proposal.proposal_code}
Revision Deadline: {proposal.revision_deadline.strftime('%Y-%m-%d %H:%M') if proposal.revision_deadline else 'N/A'}

Please log in to the system to view reviewer comments and submit your revised proposal.

Best regards,
CTRG Grant Review System
        """

        return EmailService._send_email(
            subject=subject,
            message=message,
            recipient_list=[proposal.pi_email]
        )

    @staticmethod
    def send_deadline_missed_email(proposal):
        """Send email to PI notifying that revision deadline has passed."""
        subject = f"Revision Deadline Missed: {proposal.proposal_code}"
        message = f"""
Dear {proposal.pi_name},

The revision deadline for your proposal "{proposal.title}" has passed.

Proposal Code: {proposal.proposal_code}
Deadline Was: {proposal.revision_deadline.strftime('%Y-%m-%d %H:%M') if proposal.revision_deadline else 'N/A'}

Your proposal has been marked as "Revision Deadline Missed". Please contact the SRC Chair if you have any questions.

Best regards,
CTRG Grant Review System
        """

        return EmailService._send_email(
            subject=subject,
            message=message,
            recipient_list=[proposal.pi_email]
        )

    @staticmethod
    def send_final_decision_email(proposal):
        """Send email to PI about final decision."""
        decision_text = "ACCEPTED" if proposal.status == Proposal.Status.FINAL_ACCEPTED else "NOT ACCEPTED"
        
        subject = f"Final Decision: {proposal.proposal_code} - {decision_text}"
        message = f"""
Dear {proposal.pi_name},

The final decision for your proposal has been made.

Proposal: {proposal.title}
Code: {proposal.proposal_code}
Decision: {decision_text}

Please log in to the system for more details.

Best regards,
CTRG Grant Review System
        """

        return EmailService._send_email(
            subject=subject,
            message=message,
            recipient_list=[proposal.pi_email]
        )
    
    @staticmethod
    def send_bulk_email(recipients, subject, message):
        """Send email to multiple recipients."""
        from django.core.mail import send_mass_mail
        from_email = EmailService._get_from_email()
        
        messages = [
            (subject, message, from_email, [recipient.email])
            for recipient in recipients
        ]

        try:
            sent_count = send_mass_mail(messages, fail_silently=False)
            return sent_count > 0
        except Exception:
            logger.exception("Bulk email send failed for subject '%s'", subject)
            return False

    @staticmethod
    def send_reviewer_proposal_details_email(reviewer_ids, custom_subject=None, custom_message=''):
        """
        Send personalized emails to reviewers with their pending proposal assignments.

        Args:
            reviewer_ids: list of User IDs to email
            custom_subject: optional custom subject line
            custom_message: optional additional message from SRC Chair

        Returns:
            dict with sent_count, failed_count, errors
        """
        from django.contrib.auth import get_user_model
        from reviews.models import ReviewAssignment

        User = get_user_model()
        subject = custom_subject or 'Review Assignment Reminder - Pending Proposals'
        sent_count = 0
        failed_count = 0
        errors = []

        reviewers = User.objects.filter(id__in=reviewer_ids)

        for reviewer in reviewers:
            assignments = ReviewAssignment.objects.filter(
                reviewer=reviewer,
                status=ReviewAssignment.Status.PENDING
            ).select_related('proposal')

            # Build assignment list
            if assignments.exists():
                lines = []
                for i, a in enumerate(assignments, 1):
                    stage_label = f"Stage {a.stage}"
                    deadline_str = a.deadline.strftime('%B %d, %Y %H:%M') if a.deadline else 'Not set'
                    lines.append(
                        f"{i}. {a.proposal.title}\n"
                        f"   Proposal Code: {a.proposal.proposal_code}\n"
                        f"   Review Stage: {stage_label}\n"
                        f"   Deadline: {deadline_str}"
                    )
                assignment_section = '\n\n'.join(lines)
            else:
                assignment_section = 'You currently have no pending review assignments.'

            name = reviewer.get_full_name() or reviewer.username

            # Build email body
            parts = [f"Dear {name},"]
            if custom_message:
                parts.append(custom_message)
            parts.append("Your Pending Review Assignments:\n" + "─" * 35)
            parts.append(assignment_section)
            parts.append("Please log in to the system to complete your review(s).")
            parts.append("Best regards,\nCTRG Grant Review System")

            body = '\n\n'.join(parts)

            success = EmailService._send_email(subject, body, [reviewer.email])
            if success:
                sent_count += 1
            else:
                failed_count += 1
                errors.append(f"Failed to send to {reviewer.email}")

        return {
            'sent_count': sent_count,
            'failed_count': failed_count,
            'errors': errors,
        }
