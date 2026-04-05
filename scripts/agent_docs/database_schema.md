# Database Schema

## All models inherit from:
```python
class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
```

## User Model
```python
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ROLE_CHOICES = [
        ('src_chair', 'SRC Chair'),
        ('reviewer', 'Reviewer'),
        ('pi', 'Principal Investigator'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.CharField(max_length=200, blank=True)
    area_of_expertise = models.TextField(blank=True)  # Relevant for reviewers
    max_review_load = models.PositiveIntegerField(default=5)  # Max proposals per cycle
    is_reviewer_active = models.BooleanField(default=True)  # For activate/deactivate
    phone = models.CharField(max_length=20, blank=True)
```

## GrantCycle Model
```python
class GrantCycle(TimeStampedModel):
    name = models.CharField(max_length=200)  # e.g., "CTRG 2025-2026"
    year = models.PositiveIntegerField()
    stage1_review_start = models.DateField(null=True, blank=True)
    stage1_review_end = models.DateField(null=True, blank=True)
    revision_window_days = models.PositiveIntegerField(default=7)
    stage2_review_start = models.DateField(null=True, blank=True)
    stage2_review_end = models.DateField(null=True, blank=True)
    acceptance_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=70.00)
    max_reviewers_per_proposal = models.PositiveIntegerField(default=2, validators=[MinValueValidator(1), MaxValueValidator(4)])
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
```

## Proposal Model
```python
class Proposal(TimeStampedModel):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('under_stage1_review', 'Under Stage 1 Review'),
        ('stage1_rejected', 'Stage 1 Rejected'),
        ('accepted_no_corrections', 'Accepted (No Corrections)'),
        ('tentatively_accepted', 'Tentatively Accepted'),
        ('revision_requested', 'Revision Requested'),
        ('revised_proposal_submitted', 'Revised Proposal Submitted'),
        ('under_stage2_review', 'Under Stage 2 Review'),
        ('final_accepted', 'Final Accepted'),
        ('final_rejected', 'Final Rejected'),
    ]

    # Core fields
    proposal_code = models.CharField(max_length=50, unique=True, db_index=True)  # Auto-generated: CTRG-2025-001
    cycle = models.ForeignKey(GrantCycle, on_delete=models.PROTECT, related_name='proposals')
    title = models.CharField(max_length=500)
    status = FSMField(default='submitted', choices=STATUS_CHOICES, protected=True, db_index=True)

    # PI Information (metadata — PI may not have an account)
    pi_name = models.CharField(max_length=200)
    pi_email = models.EmailField()
    pi_department = models.CharField(max_length=200)
    co_investigators = models.TextField(blank=True)  # Comma-separated or JSON
    fund_requested = models.DecimalField(max_digits=12, decimal_places=2)

    # Files
    proposal_file = models.FileField(upload_to='proposals/%Y/%m/', blank=True)
    application_template_file = models.FileField(upload_to='proposals/templates/%Y/%m/', blank=True)
    revised_proposal_file = models.FileField(upload_to='proposals/revisions/%Y/%m/', blank=True)
    response_to_reviewers_file = models.FileField(upload_to='proposals/responses/%Y/%m/', blank=True)

    # Decision tracking
    stage1_decision_date = models.DateTimeField(null=True, blank=True)
    chair_comments_stage1 = models.TextField(blank=True)
    revision_deadline = models.DateTimeField(null=True, blank=True)
    final_decision_date = models.DateTimeField(null=True, blank=True)
    final_approved_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    final_remarks = models.TextField(blank=True)
    is_locked = models.BooleanField(default=False)

    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_proposals')
    submitted_at = models.DateTimeField(auto_now_add=True)
    stage1_review_started_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'cycle']),
            models.Index(fields=['pi_email']),
            models.Index(fields=['created_by', '-created_at']),
        ]
```

## ReviewAssignment Model
```python
class ReviewAssignment(TimeStampedModel):
    STAGE_CHOICES = [('stage1', 'Stage 1'), ('stage2', 'Stage 2')]

    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='review_assignments')
    reviewer = models.ForeignKey(User, on_delete=models.PROTECT, related_name='review_assignments')
    stage = models.CharField(max_length=10, choices=STAGE_CHOICES)
    assigned_date = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='assigned_reviews')

    class Meta:
        unique_together = ['proposal', 'reviewer', 'stage']  # Prevent duplicate assignments
```

## Review Model (Stage 1)
```python
class Review(TimeStampedModel):
    STATUS_CHOICES = [('draft', 'Draft'), ('submitted', 'Submitted')]
    RECOMMENDATION_CHOICES = [
        ('reject', 'Reject'),
        ('accept', 'Accept (No Corrections)'),
        ('tentatively_accept', 'Tentatively Accept (Revision Required)'),
    ]

    assignment = models.OneToOneField(ReviewAssignment, on_delete=models.CASCADE, related_name='review')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')

    # Scoring — Stage 1 (all scores out of their max, converted to percentage)
    originality = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(15)])  # 0-15
    clarity_rationality = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(15)])  # 0-15
    literature_review = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(15)])  # 0-15
    methodology = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(15)])  # 0-15
    potential_impact = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(15)])  # 0-15
    publication_potential = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(10)])  # 0-10
    budget_appropriateness = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(10)])  # 0-10
    timeframe_practicality = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(5)])  # 0-5
    # Total: 100 points = 100%

    total_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # Auto-calculated
    narrative_comments = models.TextField(blank=True)
    recommendation = models.CharField(max_length=20, choices=RECOMMENDATION_CHOICES, blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)

    def calculate_total(self):
        """Sum all scoring fields — total is already out of 100."""
        self.total_score = (
            self.originality + self.clarity_rationality + self.literature_review +
            self.methodology + self.potential_impact + self.publication_potential +
            self.budget_appropriateness + self.timeframe_practicality
        )
        return self.total_score

    def save(self, *args, **kwargs):
        self.calculate_total()
        super().save(*args, **kwargs)
```

## Stage2Review Model
```python
class Stage2Review(TimeStampedModel):
    CONCERNS_CHOICES = [('yes', 'Yes'), ('partially', 'Partially'), ('no', 'No')]
    RECOMMENDATION_CHOICES = [('accept', 'Accept'), ('reject', 'Reject')]

    assignment = models.OneToOneField(ReviewAssignment, on_delete=models.CASCADE, related_name='stage2_review')
    concerns_addressed = models.CharField(max_length=10, choices=CONCERNS_CHOICES)
    recommendation = models.CharField(max_length=10, choices=RECOMMENDATION_CHOICES)
    revised_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    comments = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=[('draft', 'Draft'), ('submitted', 'Submitted')], default='draft')
```

## NotificationLog Model
```python
class NotificationLog(TimeStampedModel):
    NOTIFICATION_TYPES = [
        ('reviewer_assigned', 'Reviewer Assigned'),
        ('review_reminder', 'Review Reminder'),
        ('stage1_decision', 'Stage 1 Decision'),
        ('revision_requested', 'Revision Requested'),
        ('revision_submitted', 'Revision Submitted'),
        ('stage2_decision', 'Stage 2 Decision'),
        ('final_decision', 'Final Decision'),
        ('deadline_warning', 'Deadline Warning'),
    ]

    recipient_email = models.EmailField()
    recipient_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='notifications')
    subject = models.CharField(max_length=300)
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    is_sent = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
```