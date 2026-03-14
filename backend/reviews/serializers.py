"""
Serializers for the reviews module.

Covers three main areas:
- Reviewer profiles (capacity, expertise, workload)
- Stage 1 scoring (8-criteria rubric with validation)
- Stage 2 reviews (revision assessment after tentative acceptance)
- Review assignments (links reviewers to proposals with nested scores)
"""
from rest_framework import serializers
from .models import ReviewerProfile, ReviewAssignment, Stage1Score, Stage2Review


# =============================================================================
# Reviewer Profile
# =============================================================================

class ReviewerProfileSerializer(serializers.ModelSerializer):
    """Serializer for ReviewerProfile.

    Includes computed fields (current_workload, can_accept_more) that the
    SRC Chair uses to decide whether to assign more reviews to this reviewer.
    """
    # Flatten user fields so the frontend doesn't need nested user lookups
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    first_name = serializers.CharField(source='user.first_name', required=False, allow_blank=True)
    last_name = serializers.CharField(source='user.last_name', required=False, allow_blank=True)
    email = serializers.EmailField(source='user.email', required=False)
    user_is_active = serializers.BooleanField(source='user.is_active', required=False)
    # These delegate to model methods that count active (non-completed) assignments
    current_workload = serializers.SerializerMethodField()
    can_accept_more = serializers.SerializerMethodField()

    class Meta:
        model = ReviewerProfile
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'first_name', 'last_name', 'email', 'user_is_active',
            'department', 'area_of_expertise', 'max_review_load', 'is_active_reviewer',
            'current_workload', 'can_accept_more'
        ]
        read_only_fields = ['user']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_current_workload(self, obj):
        return obj.current_review_count()

    def get_can_accept_more(self, obj):
        """True if current workload is below max_review_load."""
        return obj.can_accept_review()

    def validate(self, attrs):
        user_data = attrs.get('user', {})
        email = user_data.get('email')
        if email:
            queryset = self.instance.user.__class__.objects.exclude(pk=self.instance.user_id) if self.instance else None
            if queryset is not None and queryset.filter(email=email).exists():
                raise serializers.ValidationError({'email': 'A user with this email already exists.'})
        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user

        for field in ('first_name', 'last_name', 'email', 'is_active'):
            if field in user_data:
                setattr(user, field, user_data[field])

        if user_data:
            user.save(update_fields=list(user_data.keys()))

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


# =============================================================================
# Stage 1 Scoring
# =============================================================================

class Stage1ScoreSerializer(serializers.ModelSerializer):
    """Serializer for Stage 1 Review Scores.

    The 8-criteria rubric totals 100 points:
      - 5 criteria worth 0-15 each (75 pts)
      - 2 criteria worth 0-10 each (20 pts)
      - 1 criterion  worth 0-5      (5 pts)

    total_score and percentage_score are computed by the model and read-only.
    """
    total_score = serializers.IntegerField(read_only=True)
    percentage_score = serializers.IntegerField(read_only=True)
    weighted_percentage_score = serializers.FloatField(read_only=True)

    class Meta:
        model = Stage1Score
        fields = [
            'id', 'assignment',
            'originality_score', 'clarity_score', 'literature_review_score',
            'methodology_score', 'impact_score', 'publication_potential_score',
            'budget_appropriateness_score', 'timeline_practicality_score',
            'narrative_comments', 'recommendation', 'detailed_recommendation',
            'total_score', 'percentage_score', 'weighted_percentage_score',
            'submitted_at', 'is_draft'
        ]
        # assignment is set by the view, submitted_at is auto-set on final submit
        read_only_fields = ['assignment', 'submitted_at']

    def validate(self, data):
        """Validate that each score falls within its allowed range.

        Different criteria have different maximums (15, 10, or 5), so we
        can't use a single model-level validator. This dict-based approach
        keeps the limits in one place and produces field-specific errors.
        """
        score_limits = {
            'originality_score': 15,
            'clarity_score': 15,
            'literature_review_score': 15,
            'methodology_score': 15,
            'impact_score': 15,
            'publication_potential_score': 10,
            'budget_appropriateness_score': 10,
            'timeline_practicality_score': 5,
        }

        for field, max_val in score_limits.items():
            if field in data:
                if data[field] < 0 or data[field] > max_val:
                    raise serializers.ValidationError({
                        field: f"Score must be between 0 and {max_val}"
                    })

        is_draft = data.get('is_draft', None)
        if is_draft is False:
            recommendation = data.get('recommendation')
            detailed_recommendation = data.get('detailed_recommendation')
            narrative_comments = data.get('narrative_comments')
            missing_fields = {}
            if not narrative_comments:
                missing_fields['narrative_comments'] = "Narrative comments are required when submitting a final review."
            if not recommendation:
                missing_fields['recommendation'] = "Recommendation is required when submitting a final review."
            if not detailed_recommendation:
                missing_fields['detailed_recommendation'] = "Detailed recommendation is required when submitting a final review."
            if missing_fields:
                raise serializers.ValidationError(missing_fields)

        return data


# =============================================================================
# Stage 2 Review
# =============================================================================

class Stage2ReviewSerializer(serializers.ModelSerializer):
    """Serializer for Stage 2 Review.

    Stage 2 reviews assess whether the PI adequately addressed Stage 1 concerns.
    The reviewer rates concerns_addressed (e.g., fully/partially/not) and provides
    a revised recommendation. The _display fields give human-readable labels.
    """
    concerns_addressed_display = serializers.CharField(
        source='get_concerns_addressed_display', read_only=True
    )
    revised_recommendation_display = serializers.CharField(
        source='get_revised_recommendation_display', read_only=True
    )
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)

    class Meta:
        model = Stage2Review
        fields = [
            'id', 'assignment', 'proposal', 'reviewed_by', 'reviewed_by_email', 'is_chair_review',
            'concerns_addressed', 'concerns_addressed_display',
            'revised_recommendation', 'revised_recommendation_display',
            'revised_score', 'technical_comments', 'budget_comments',
            'submitted_at', 'is_draft'
        ]
        read_only_fields = ['assignment', 'proposal', 'reviewed_by', 'reviewed_by_email', 'is_chair_review', 'submitted_at']

    def validate_revised_score(self, value):
        if value is None:
            return value
        if value < 0 or value > 100:
            raise serializers.ValidationError("Revised score must be between 0 and 100.")
        return value

    def validate(self, data):
        is_draft = data.get('is_draft', None)
        if is_draft is False:
            required_fields = ['concerns_addressed', 'revised_recommendation', 'technical_comments']
            missing = {}
            for field in required_fields:
                if not data.get(field):
                    missing[field] = 'This field is required when submitting a final Stage 2 review.'
            if missing:
                raise serializers.ValidationError(missing)
        return data


# =============================================================================
# Review Assignment (ties a reviewer to a proposal for a given stage)
# =============================================================================

class ReviewAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for Review Assignments.

    Nests the full Stage1Score and Stage2Review so a single API call returns
    the assignment together with its review data. The nested serializers are
    read-only — scores/reviews are submitted through dedicated endpoints.
    """
    stage1_score = Stage1ScoreSerializer(read_only=True)
    stage2_review = Stage2ReviewSerializer(read_only=True)
    # Flattened proposal/reviewer fields avoid requiring extra API calls
    proposal_title = serializers.CharField(source='proposal.title', read_only=True)
    proposal_code = serializers.CharField(source='proposal.proposal_code', read_only=True)
    proposal_status = serializers.CharField(source='proposal.status', read_only=True)
    proposal_status_display = serializers.CharField(source='proposal.get_status_display', read_only=True)
    reviewer_name = serializers.SerializerMethodField()
    reviewer_email = serializers.EmailField(source='reviewer.email', read_only=True)
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    review_validity_display = serializers.CharField(source='get_review_validity_display', read_only=True)

    class Meta:
        model = ReviewAssignment
        fields = [
            'id', 'proposal', 'proposal_title', 'proposal_code',
            'proposal_status', 'proposal_status_display',
            'reviewer', 'reviewer_name', 'reviewer_email',
            'stage', 'stage_display', 'status', 'status_display',
            'review_validity', 'review_validity_display',
            'chair_rejection_reason', 'chair_rejected_at',
            'deadline', 'assigned_date', 'notification_sent',
            'stage1_score', 'stage2_review',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['assigned_date', 'created_at', 'updated_at']

    def get_reviewer_name(self, obj):
        return obj.reviewer.get_full_name() or obj.reviewer.username


class ReviewAssignmentCreateSerializer(serializers.Serializer):
    """Serializer for bulk-creating review assignments.

    The SRC Chair selects one proposal, multiple reviewers, a review stage
    (1 or 2), and a deadline. The view creates one assignment per reviewer.
    """
    proposal_id = serializers.IntegerField()
    reviewer_ids = serializers.ListField(child=serializers.IntegerField())
    stage = serializers.IntegerField()
    deadline = serializers.DateTimeField()


class AutoAssignReviewersSerializer(serializers.Serializer):
    """Serializer for automated reviewer assignment requests."""
    proposal_id = serializers.IntegerField()
    stage = serializers.IntegerField()
    deadline = serializers.DateTimeField()
    reviewer_count = serializers.IntegerField(required=False, min_value=1, max_value=4)
    expertise_keywords = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )
    exclude_reviewer_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
    )

    def validate_stage(self, value):
        if value not in [ReviewAssignment.Stage.STAGE_1, ReviewAssignment.Stage.STAGE_2]:
            raise serializers.ValidationError("Stage must be 1 or 2.")
        return value


class ReviewerWorkloadSerializer(serializers.Serializer):
    """Serializer for reviewer workload statistics.

    Designed to match the frontend's Reviewer TypeScript type exactly, so the
    response can be used directly without transformation. Includes both profile
    fields (department, expertise) and computed assignment counts (total, pending,
    completed, stage-specific pending).
    """
    id = serializers.IntegerField()
    user = serializers.IntegerField()
    user_email = serializers.EmailField()
    user_name = serializers.CharField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    user_is_active = serializers.BooleanField()
    is_active_reviewer = serializers.BooleanField()
    max_review_load = serializers.IntegerField()
    department = serializers.CharField(allow_blank=True)
    area_of_expertise = serializers.CharField(allow_blank=True)
    current_workload = serializers.IntegerField()
    can_accept_more = serializers.BooleanField()
    overload_warning = serializers.CharField(allow_blank=True)
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    completed = serializers.IntegerField()
    stage1_pending = serializers.IntegerField()
    stage2_pending = serializers.IntegerField()


class EmailReviewersSerializer(serializers.Serializer):
    """Validates the request payload for emailing reviewers with proposal details."""
    reviewer_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    subject = serializers.CharField(required=False, default='', max_length=255)
    message = serializers.CharField(required=False, default='')


class ReviewValidityUpdateSerializer(serializers.Serializer):
    review_validity = serializers.ChoiceField(choices=ReviewAssignment.ReviewValidity.choices)
    chair_rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if attrs['review_validity'] == ReviewAssignment.ReviewValidity.REJECTED and not attrs.get('chair_rejection_reason', '').strip():
            raise serializers.ValidationError({
                'chair_rejection_reason': 'Reason is required when rejecting a reviewer review.'
            })
        return attrs
