from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from proposals.models import Proposal


def _validate_cv_size(value):
    """Reject CV files larger than 5 MB."""
    max_bytes = 5 * 1024 * 1024
    if hasattr(value, 'size') and value.size > max_bytes:
        raise ValidationError("CV file must be 5 MB or smaller.")


class ReviewerProfile(models.Model):
    """
    Extended profile for reviewers with workload management.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviewer_profile')
    department = models.CharField(max_length=255, blank=True, default='', help_text="Reviewer's department")
    area_of_expertise = models.TextField(help_text="Reviewer's area of expertise")
    cv = models.FileField(
        upload_to='reviewer_cvs/',
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx']),
            _validate_cv_size,
        ],
        help_text="Optional reviewer CV for SRC Chair review (PDF/DOC/DOCX, max 5 MB)"
    )
    max_review_load = models.IntegerField(default=5, help_text="Maximum number of concurrent reviews")
    is_active_reviewer = models.BooleanField(default=True, help_text="Whether this reviewer is currently active")
    
    class Meta:
        verbose_name = "Reviewer Profile"
        verbose_name_plural = "Reviewer Profiles"
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - Reviewer Profile"
    
    def current_review_count(self):
        """Count pending reviews for this reviewer"""
        return ReviewAssignment.objects.filter(
            reviewer=self.user,
            status=ReviewAssignment.Status.PENDING
        ).count()
    
    def can_accept_review(self):
        """Check if reviewer can accept more reviews"""
        return self.is_active_reviewer and self.current_review_count() < self.max_review_load


class ReviewAssignment(models.Model):
    """
    Assigns a reviewer to a proposal for a specific stage.
    """
    class Stage(models.IntegerChoices):
        STAGE_1 = 1, 'Stage 1 (Initial Evaluation)'
        STAGE_2 = 2, 'Stage 2 (Revision Review)'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'

    class ReviewValidity(models.TextChoices):
        INCLUDED = 'INCLUDED', 'Included in Decision'
        REJECTED = 'REJECTED', 'Rejected by SRC Chair'

    proposal = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='review_assignments')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='review_assignments')
    stage = models.IntegerField(choices=Stage.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    review_validity = models.CharField(
        max_length=20,
        choices=ReviewValidity.choices,
        default=ReviewValidity.INCLUDED,
        help_text="Whether the submitted review is included in chair decisions",
    )
    chair_rejection_reason = models.TextField(blank=True, default='')
    chair_rejected_at = models.DateTimeField(null=True, blank=True)
    chair_rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_review_assignments',
    )
    deadline = models.DateTimeField()
    assigned_date = models.DateTimeField(auto_now_add=True)
    notification_sent = models.BooleanField(default=False, help_text="Whether notification email has been sent")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['proposal', 'reviewer', 'stage']
        ordering = ['-created_at']
        verbose_name = "Review Assignment"
        verbose_name_plural = "Review Assignments"

    def __str__(self):
        return f"{self.proposal.proposal_code} - {self.reviewer.get_full_name() or self.reviewer.username} (Stage {self.stage})"

    @property
    def is_excluded_from_decision(self):
        return self.review_validity == self.ReviewValidity.REJECTED


class Stage1Score(models.Model):
    """
    Stage 1 review scores based on 8 criteria with specific max scores.
    Total: 100 points
    """
    class Recommendation(models.TextChoices):
        ACCEPT = 'ACCEPT', 'Accept'
        TENTATIVELY_ACCEPT = 'TENTATIVELY_ACCEPT', 'Tentatively Accept'
        REJECT = 'REJECT', 'Reject'

    assignment = models.OneToOneField(ReviewAssignment, on_delete=models.CASCADE, related_name='stage1_score')
    
    # 8 Criteria Scores (exact requirements)
    originality_score = models.IntegerField(
        help_text="Originality of the proposed research (0-15)",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(15)]
    )
    clarity_score = models.IntegerField(
        help_text="Clarity and rationality of the research question, thesis, hypotheses (0-15)",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(15)]
    )
    literature_review_score = models.IntegerField(
        help_text="Literature review (assessment of relevant background materials and prior related studies) (0-15)",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(15)]
    )
    methodology_score = models.IntegerField(
        help_text="Appropriateness of the methodology (0-15)",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(15)]
    )
    impact_score = models.IntegerField(
        help_text="Potential impact of research findings/Policy implication/Contribution to existing knowledge (0-15)",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(15)]
    )
    publication_potential_score = models.IntegerField(
        help_text="Potential for publication/dissemination of research results (0-10)",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(10)]
    )
    budget_appropriateness_score = models.IntegerField(
        help_text="Appropriateness of the proposed budget (0-10)",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(10)]
    )
    timeline_practicality_score = models.IntegerField(
        help_text="Practicality of the proposed time frame (0-5)",
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    
    # Narrative feedback
    narrative_comments = models.TextField(help_text="Detailed narrative comments from reviewer")
    recommendation = models.CharField(
        max_length=30,
        choices=Recommendation.choices,
        blank=True,
        default='',
        help_text="Reviewer's recommendation based on Stage 1 evaluation"
    )
    detailed_recommendation = models.TextField(
        blank=True,
        default='',
        help_text="Detailed recommendation notes for inclusion in reports"
    )
    
    # Metadata
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_draft = models.BooleanField(default=True, help_text="Whether this is a draft or final submission")
    
    class Meta:
        verbose_name = "Stage 1 Score"
        verbose_name_plural = "Stage 1 Scores"
    
    def __str__(self):
        return f"{self.assignment.proposal.proposal_code} - Stage 1 Score: {self.total_score}%"
    
    @property
    def total_score(self):
        """Calculate total score (0-100)"""
        return (
            self.originality_score +
            self.clarity_score +
            self.literature_review_score +
            self.methodology_score +
            self.impact_score +
            self.publication_potential_score +
            self.budget_appropriateness_score +
            self.timeline_practicality_score
        )
    
    @property
    def percentage_score(self):
        """Return score as percentage (already 0-100)"""
        return self.total_score

    @property
    def weighted_percentage_score(self):
        """
        Weighted percentage score using criteria max points as rubric weights.
        Output range is 0-100.
        """
        weights = {
            'originality_score': 15,
            'clarity_score': 15,
            'literature_review_score': 15,
            'methodology_score': 15,
            'impact_score': 15,
            'publication_potential_score': 10,
            'budget_appropriateness_score': 10,
            'timeline_practicality_score': 5,
        }
        total_weight = sum(weights.values())
        weighted_total = 0.0

        for field_name, weight in weights.items():
            score_value = getattr(self, field_name, 0)
            max_value = weight
            weighted_total += (score_value / max_value) * weight

        return round((weighted_total / total_weight) * 100, 2)


class Stage2Review(models.Model):
    """
    Stage 2 review focuses on checking if revisions address Stage 1 concerns.
    """
    class ConcernsAddressed(models.TextChoices):
        YES = 'YES', 'Yes'
        PARTIALLY = 'PARTIALLY', 'Partially'
        NO = 'NO', 'No'
    
    class RevisedRecommendation(models.TextChoices):
        ACCEPT = 'ACCEPT', 'Accept'
        REJECT = 'REJECT', 'Reject'

    assignment = models.OneToOneField(
        ReviewAssignment,
        on_delete=models.CASCADE,
        related_name='stage2_review',
        null=True,
        blank=True
    )
    proposal = models.ForeignKey(
        Proposal,
        on_delete=models.CASCADE,
        related_name='stage2_reviews',
        null=True,
        blank=True,
        help_text="Proposal under Stage 2 review. Required for direct SRC Chair reviews."
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stage2_reviews_authored',
        help_text="Reviewer or SRC Chair who authored this Stage 2 review."
    )
    is_chair_review = models.BooleanField(
        default=False,
        help_text="True when the Stage 2 review is authored directly by the SRC Chair."
    )
    
    # Stage 2 specific fields
    concerns_addressed = models.CharField(
        max_length=20,
        choices=ConcernsAddressed.choices,
        help_text="Have Stage 1 concerns been addressed?"
    )
    revised_recommendation = models.CharField(
        max_length=20,
        choices=RevisedRecommendation.choices,
        help_text="Final recommendation after reviewing revisions"
    )
    revised_score = models.IntegerField(
        null=True,
        blank=True,
        help_text="Optional revised score (0-100)",
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    technical_comments = models.TextField(
        help_text="Comments on how PI addressed technical and methodological concerns"
    )
    budget_comments = models.TextField(
        blank=True,
        default='',
        help_text="Comments on budget revisions and justifications (if applicable)"
    )
    
    # Metadata
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_draft = models.BooleanField(default=True, help_text="Whether this is a draft or final submission")
    
    class Meta:
        verbose_name = "Stage 2 Review"
        verbose_name_plural = "Stage 2 Reviews"

    def clean(self):
        if self.is_chair_review:
            if not self.proposal_id:
                raise ValidationError("Chair reviews must have a proposal.")
        else:
            if not self.assignment_id:
                raise ValidationError("Non-chair reviews must have an assignment.")

    def __str__(self):
        proposal = self.proposal or (self.assignment.proposal if self.assignment_id else None)
        proposal_code = proposal.proposal_code if proposal else 'Unknown Proposal'
        return f"{proposal_code} - Stage 2: {self.get_revised_recommendation_display()}"

