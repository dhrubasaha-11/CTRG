from django.db import models
from django.conf import settings
from django.utils import timezone
from proposals.storage import EncryptedFileStorage

encrypted_storage = EncryptedFileStorage()

class GrantCycle(models.Model):
    """
    Represents a CTRG grant cycle (e.g., CTRG 2025-2026).
    Contains all configuration for the two-stage review process.
    """
    name = models.CharField(max_length=100, help_text="e.g., CTRG 2025-2026")
    year = models.CharField(max_length=20, help_text="e.g., 2025-2026")
    
    # Dates
    start_date = models.DateField()
    end_date = models.DateField()
    stage1_review_start_date = models.DateField(null=True, blank=True, help_text="Optional Stage 1 review start date")
    stage1_review_end_date = models.DateField(null=True, blank=True, help_text="Optional Stage 1 review end date")
    stage2_review_start_date = models.DateField(null=True, blank=True, help_text="Stage 2 review start date")
    stage2_review_end_date = models.DateField(null=True, blank=True, help_text="Stage 2 review end date")
    
    # Configuration
    revision_window_days = models.IntegerField(default=7, help_text="Number of days for revision after tentative acceptance")
    acceptance_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=70.0, help_text="Minimum percentage score for acceptance")
    max_reviewers_per_proposal = models.IntegerField(default=2, help_text="Maximum number of reviewers (1-4)")

    # Customizable score weights per cycle (JSON field).
    # Keys match Stage1Score field names. Values are max scores.
    # Default weights: originality=15, clarity=15, literature_review=15, methodology=15,
    # impact=15, publication_potential=10, budget_appropriateness=10, timeline_practicality=5 (total=100)
    score_weights = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom score weights per criteria. Leave empty for defaults."
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        ordering = ['-year', '-created_at']
        verbose_name = "Grant Cycle"
        verbose_name_plural = "Grant Cycles"

    def __str__(self):
        return f"{self.name} ({self.year})"


class ResearchArea(models.Model):
    """Top-level research category used for proposal categorization."""
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Research Area"
        verbose_name_plural = "Research Areas"

    def __str__(self):
        return self.name


class Keyword(models.Model):
    """Canonical keyword used for tagging proposals and reviewer matching."""
    name = models.CharField(max_length=100, unique=True)
    normalized_name = models.CharField(max_length=100, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Keyword"
        verbose_name_plural = "Keywords"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip()
            self.normalized_name = self.name.lower()
        super().save(*args, **kwargs)


class ResearchAreaKeyword(models.Model):
    """Weighted mapping used to infer proposal category from entered keywords."""
    research_area = models.ForeignKey(ResearchArea, on_delete=models.CASCADE, related_name='keyword_mappings')
    keyword = models.ForeignKey(Keyword, on_delete=models.CASCADE, related_name='research_area_mappings')
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('research_area', 'keyword')
        verbose_name = "Research Area Keyword Mapping"
        verbose_name_plural = "Research Area Keyword Mappings"

    def __str__(self):
        return f"{self.research_area.name} <- {self.keyword.name} ({self.weight})"


class Proposal(models.Model):
    """
    Represents a research grant proposal submitted by a PI.
    Tracks the complete lifecycle through two-stage review process.
    """
    class Status(models.TextChoices):
        # Initial states
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted'
        
        # Stage 1 states
        UNDER_STAGE_1_REVIEW = 'UNDER_STAGE_1_REVIEW', 'Under Stage 1 Review'
        STAGE_1_REJECTED = 'STAGE_1_REJECTED', 'Stage 1 Rejected'
        ACCEPTED_NO_CORRECTIONS = 'ACCEPTED_NO_CORRECTIONS', 'Accepted (No Corrections Required)'
        TENTATIVELY_ACCEPTED = 'TENTATIVELY_ACCEPTED', 'Tentatively Accepted'
        
        # Revision states
        REVISION_REQUESTED = 'REVISION_REQUESTED', 'Revision Requested'
        REVISED_PROPOSAL_SUBMITTED = 'REVISED_PROPOSAL_SUBMITTED', 'Revised Proposal Submitted'
        REVISION_DEADLINE_MISSED = 'REVISION_DEADLINE_MISSED', 'Revision Deadline Missed'
        
        # Stage 2 states
        UNDER_STAGE_2_REVIEW = 'UNDER_STAGE_2_REVIEW', 'Under Stage 2 Review'
        
        # Final states
        FINAL_ACCEPTED = 'FINAL_ACCEPTED', 'Final Accepted'
        FINAL_REJECTED = 'FINAL_REJECTED', 'Final Rejected'

    # Unique identifier
    proposal_code = models.CharField(max_length=50, unique=True, editable=False, help_text="Auto-generated unique code (e.g., CTRG-2025-001)")
    
    # Basic information
    title = models.CharField(max_length=255)
    abstract = models.TextField()
    
    # PI Information (stored as text fields only - no user account required)
    pi_name = models.CharField(max_length=255, help_text="Principal Investigator name")
    pi_department = models.CharField(max_length=255)
    pi_email = models.EmailField()
    co_investigators = models.TextField(blank=True, help_text="Comma-separated list of co-investigators")
    
    # Financial
    fund_requested = models.DecimalField(max_digits=12, decimal_places=2, help_text="Amount of funding requested")
    
    # Files (encrypted at rest when FILE_ENCRYPTION_KEY is configured)
    proposal_file = models.FileField(upload_to='proposals/', storage=encrypted_storage, null=True, blank=True, help_text="Full research proposal (PDF)")
    application_template_file = models.FileField(upload_to='proposals/templates/', storage=encrypted_storage, null=True, blank=True, help_text="Research Grant Application Template (PDF/Word)")
    revised_proposal_file = models.FileField(upload_to='proposals/revisions/', storage=encrypted_storage, null=True, blank=True, help_text="Revised proposal after Stage 1 review")
    response_to_reviewers_file = models.FileField(upload_to='proposals/responses/', storage=encrypted_storage, null=True, blank=True, help_text="Optional response to reviewer comments")
    
    # Relationships
    cycle = models.ForeignKey(GrantCycle, on_delete=models.CASCADE, related_name='proposals')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_proposals',
        help_text="User who created the proposal record."
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_proposals',
        help_text="User who finalized the proposal submission."
    )
    primary_research_area = models.ForeignKey(
        ResearchArea, on_delete=models.SET_NULL, null=True, blank=True, related_name='proposals'
    )
    keywords = models.ManyToManyField(Keyword, through='ProposalKeyword', related_name='proposals', blank=True)
    
    # Status tracking
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.DRAFT)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    revision_deadline = models.DateTimeField(null=True, blank=True)
    is_locked = models.BooleanField(default=False, help_text="Locked after final decision")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Proposal"
        verbose_name_plural = "Proposals"

    def __str__(self):
        return f"{self.proposal_code} - {self.title}"
    
    def save(self, *args, **kwargs):
        """Auto-generate proposal code if not set"""
        if not self.proposal_code:
            # Generate code like CTRG-2025-001
            if self.cycle:
                # Handle both string ('2025' or '2025-2026') and integer (2025) year formats
                year_str = str(self.cycle.year)
                cycle_year = year_str.split('-')[0] if '-' in year_str else year_str
            else:
                cycle_year = str(timezone.now().year)

            # Generate sequence across the year (not only within the cycle) to keep proposal_code globally unique.
            count = Proposal.objects.filter(proposal_code__startswith=f"CTRG-{cycle_year}-").count() + 1
            proposal_code = f"CTRG-{cycle_year}-{count:03d}"
            while Proposal.objects.filter(proposal_code=proposal_code).exists():
                count += 1
                proposal_code = f"CTRG-{cycle_year}-{count:03d}"
            self.proposal_code = proposal_code
        super().save(*args, **kwargs)
    
    @property
    def is_revision_overdue(self):
        """Check if revision deadline has passed"""
        if self.revision_deadline and self.status == self.Status.REVISION_REQUESTED:
            return timezone.now() > self.revision_deadline
        return False


class Stage1Decision(models.Model):
    """
    Stores the SRC Chair's decision after Stage 1 reviews are complete.
    """
    class Decision(models.TextChoices):
        REJECT = 'REJECT', 'Reject'
        ACCEPT = 'ACCEPT', 'Accept (No Corrections Required)'
        TENTATIVELY_ACCEPT = 'TENTATIVELY_ACCEPT', 'Tentatively Accept (Revision Required)'
    
    proposal = models.OneToOneField(Proposal, on_delete=models.CASCADE, related_name='stage1_decision')
    decision = models.CharField(max_length=30, choices=Decision.choices)
    decision_date = models.DateTimeField(auto_now_add=True)
    chair_comments = models.TextField(blank=True, help_text="Optional comments from SRC Chair")
    average_score = models.DecimalField(max_digits=5, decimal_places=2, help_text="Average percentage score from all Stage 1 reviews")
    
    class Meta:
        verbose_name = "Stage 1 Decision"
        verbose_name_plural = "Stage 1 Decisions"
    
    def __str__(self):
        return f"{self.proposal.proposal_code} - Stage 1: {self.get_decision_display()}"


class ProposalKeyword(models.Model):
    """Join table linking submitted proposals to entered keywords."""
    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='proposal_keywords')
    keyword = models.ForeignKey(Keyword, on_delete=models.CASCADE, related_name='proposal_keywords')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('proposal', 'keyword')
        verbose_name = "Proposal Keyword"
        verbose_name_plural = "Proposal Keywords"

    def __str__(self):
        return f"{self.proposal.proposal_code} - {self.keyword.name}"


class FinalDecision(models.Model):
    """
    Stores the final decision after Stage 2 reviews (for tentatively accepted proposals).
    """
    class Decision(models.TextChoices):
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'
    
    proposal = models.OneToOneField(Proposal, on_delete=models.CASCADE, related_name='final_decision')
    decision = models.CharField(max_length=20, choices=Decision.choices)
    decision_date = models.DateTimeField(auto_now_add=True)
    approved_grant_amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Final approved grant amount")
    final_remarks = models.TextField(help_text="Final remarks from SRC Chair")
    
    class Meta:
        verbose_name = "Final Decision"
        verbose_name_plural = "Final Decisions"
    
    def __str__(self):
        return f"{self.proposal.proposal_code} - Final: {self.get_decision_display()}"


class AuditLog(models.Model):
    """
    Tracks all major actions in the system for audit trail.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=100, help_text="Type of action (e.g., PROPOSAL_SUBMITTED, REVIEW_ASSIGNED)")
    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, null=True, blank=True, related_name='audit_logs')
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict, help_text="Additional details about the action")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
    
    def __str__(self):
        return f"{self.timestamp} - {self.user} - {self.action_type}"

