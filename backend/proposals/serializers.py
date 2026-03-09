"""
Serializers for the proposals module.

Provides serializers for the full proposal lifecycle:
- Grant cycles (list, stats)
- Proposals (list, detail, create/update, submit)
- Stage 1 and Final decisions (read and create)
- Audit logs and dashboard statistics
"""
from rest_framework import serializers
from django.conf import settings
from decimal import Decimal
from .models import (
    GrantCycle, Proposal, Stage1Decision, FinalDecision, AuditLog,
    ResearchArea, Keyword, ResearchAreaKeyword
)
from .services import ProposalService


# =============================================================================
# Grant Cycle Serializers
# =============================================================================

class GrantCycleSerializer(serializers.ModelSerializer):
    """Serializer for Grant Cycle model.

    Includes all cycle configuration fields (dates, thresholds, reviewer limits)
    plus a computed proposal_count for dashboard display.
    """
    # Computed field — avoids a separate API call to count proposals per cycle
    proposal_count = serializers.SerializerMethodField()

    class Meta:
        model = GrantCycle
        fields = [
            'id', 'name', 'year', 'start_date', 'end_date',
            'stage1_review_start_date', 'stage1_review_end_date',
            'stage2_review_start_date', 'stage2_review_end_date',
            'revision_window_days', 'acceptance_threshold', 'max_reviewers_per_proposal',
            'score_weights',
            'is_active', 'proposal_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_proposal_count(self, obj):
        return obj.proposals.count()

    def to_internal_value(self, data):
        """
        Normalize optional date fields so empty strings are treated as null.
        Frontend date inputs submit '' when left blank.
        """
        mutable = data.copy()
        optional_date_fields = [
            'stage1_review_start_date',
            'stage1_review_end_date',
            'stage2_review_start_date',
            'stage2_review_end_date',
        ]
        for field_name in optional_date_fields:
            if mutable.get(field_name) == '':
                mutable[field_name] = None
        return super().to_internal_value(mutable)

    def validate(self, attrs):
        """Validate chronological date windows and cycle configuration limits."""
        instance = getattr(self, 'instance', None)

        def _value(field_name):
            if field_name in attrs:
                return attrs[field_name]
            if instance is not None:
                return getattr(instance, field_name)
            return None

        start_date = _value('start_date')
        end_date = _value('end_date')
        stage1_start = _value('stage1_review_start_date')
        stage1_end = _value('stage1_review_end_date')
        stage2_start = _value('stage2_review_start_date')
        stage2_end = _value('stage2_review_end_date')
        revision_window_days = _value('revision_window_days')
        acceptance_threshold = _value('acceptance_threshold')
        max_reviewers_per_proposal = _value('max_reviewers_per_proposal')

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'Cycle end date must be on or after start date.'
            })

        if stage1_start and stage1_end and stage1_start > stage1_end:
            raise serializers.ValidationError({
                'stage1_review_end_date': 'Stage 1 end date must be on or after Stage 1 start date.'
            })

        if stage2_start and stage2_end and stage2_start > stage2_end:
            raise serializers.ValidationError({
                'stage2_review_end_date': 'Stage 2 end date must be on or after Stage 2 start date.'
            })

        if stage1_end and stage2_start and stage2_start < stage1_end:
            raise serializers.ValidationError({
                'stage2_review_start_date': 'Stage 2 cannot start before Stage 1 ends.'
            })

        if start_date and stage1_start and stage1_start < start_date:
            raise serializers.ValidationError({
                'stage1_review_start_date': 'Stage 1 start date cannot be before cycle start date.'
            })
        if end_date and stage1_end and stage1_end > end_date:
            raise serializers.ValidationError({
                'stage1_review_end_date': 'Stage 1 end date cannot be after cycle end date.'
            })
        if start_date and stage2_start and stage2_start < start_date:
            raise serializers.ValidationError({
                'stage2_review_start_date': 'Stage 2 start date cannot be before cycle start date.'
            })
        if end_date and stage2_end and stage2_end > end_date:
            raise serializers.ValidationError({
                'stage2_review_end_date': 'Stage 2 end date cannot be after cycle end date.'
            })

        if revision_window_days is not None and revision_window_days < 1:
            raise serializers.ValidationError({
                'revision_window_days': 'Revision window must be at least 1 day.'
            })

        if acceptance_threshold is not None and (acceptance_threshold < 0 or acceptance_threshold > 100):
            raise serializers.ValidationError({
                'acceptance_threshold': 'Acceptance threshold must be between 0 and 100.'
            })

        if max_reviewers_per_proposal is not None and (
            max_reviewers_per_proposal < 1 or max_reviewers_per_proposal > 4
        ):
            raise serializers.ValidationError({
                'max_reviewers_per_proposal': 'Max reviewers per proposal must be between 1 and 4.'
            })

        return attrs


class GrantCycleStatsSerializer(serializers.Serializer):
    """Serializer for cycle statistics.

    Each field maps to a proposal status count, used by the SRC Chair dashboard
    to display the status breakdown for a given grant cycle.
    """
    total_proposals = serializers.IntegerField()
    submitted = serializers.IntegerField()
    under_stage1_review = serializers.IntegerField()
    stage1_rejected = serializers.IntegerField()
    accepted_no_corrections = serializers.IntegerField()
    tentatively_accepted = serializers.IntegerField()
    revision_requested = serializers.IntegerField()
    revised_submitted = serializers.IntegerField()
    under_stage2_review = serializers.IntegerField()
    final_accepted = serializers.IntegerField()
    final_rejected = serializers.IntegerField()
    revision_deadline_missed = serializers.IntegerField()


class ResearchAreaSerializer(serializers.ModelSerializer):
    """Serializer for research area catalog entries."""
    class Meta:
        model = ResearchArea
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class KeywordSerializer(serializers.ModelSerializer):
    """Serializer for keyword catalog entries."""
    class Meta:
        model = Keyword
        fields = ['id', 'name', 'normalized_name', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['normalized_name', 'created_at', 'updated_at']


class ResearchAreaKeywordSerializer(serializers.ModelSerializer):
    """Serializer for weighted keyword mappings used by categorization."""
    research_area_name = serializers.CharField(source='research_area.name', read_only=True)
    keyword_name = serializers.CharField(source='keyword.name', read_only=True)

    class Meta:
        model = ResearchAreaKeyword
        fields = [
            'id', 'research_area', 'research_area_name',
            'keyword', 'keyword_name', 'weight', 'created_at'
        ]
        read_only_fields = ['created_at']


# =============================================================================
# Proposal Serializers
# =============================================================================

class ProposalListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for proposal lists.

    Intentionally excludes heavy fields (abstract, file URLs) to keep
    list endpoints fast. Used in tables and search results.
    """
    # Flatten the cycle name so the frontend doesn't need a nested lookup
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    pi_display_name = serializers.SerializerMethodField()
    primary_research_area_name = serializers.CharField(source='primary_research_area.name', read_only=True)
    keywords = serializers.SerializerMethodField()
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    submitted_by_email = serializers.EmailField(source='submitted_by.email', read_only=True)

    class Meta:
        model = Proposal
        fields = [
            'id', 'proposal_code', 'title', 'pi_name', 'pi_department',
            'pi_display_name', 'cycle', 'cycle_name', 'status',
            'primary_research_area', 'primary_research_area_name', 'keywords',
            'fund_requested', 'submitted_at', 'revision_deadline',
            'created_by', 'created_by_email', 'submitted_by', 'submitted_by_email'
        ]

    def get_pi_display_name(self, obj):
        """Fallback to 'Unknown' when pi_name is blank (e.g., legacy data)."""
        return obj.pi_name or 'Unknown'

    def get_keywords(self, obj):
        return list(obj.keywords.values_list('name', flat=True))


class ProposalSerializer(serializers.ModelSerializer):
    """Full serializer for proposal detail (create, update, and read).

    Handles both directions:
    - Read: includes computed fields (status_display, is_revision_overdue)
    - Write: PI fields are optional because they're auto-populated from the
      authenticated user in validate() if the frontend doesn't supply them.
    """
    cycle_name = serializers.CharField(source='cycle.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_revision_overdue = serializers.BooleanField(read_only=True)
    primary_research_area_name = serializers.CharField(source='primary_research_area.name', read_only=True)
    keywords = serializers.SerializerMethodField(read_only=True)
    keywords_input = serializers.CharField(write_only=True, required=False, allow_blank=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    submitted_by_email = serializers.EmailField(source='submitted_by.email', read_only=True)
    final_decision = serializers.SerializerMethodField()
    stage1_decision = serializers.SerializerMethodField()
    approved_amount = serializers.DecimalField(
        source='final_decision.approved_grant_amount',
        read_only=True,
        max_digits=12,
        decimal_places=2
    )
    final_remarks = serializers.CharField(source='final_decision.final_remarks', read_only=True)

    # PI fields are optional — validate() will auto-fill from the logged-in user
    # so the frontend can omit them and still create a valid proposal.
    pi_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    pi_department = serializers.CharField(max_length=255, required=False, allow_blank=True)
    pi_email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = Proposal
        fields = [
            'id', 'proposal_code', 'title', 'abstract',
            'pi_name', 'pi_department', 'pi_email',
            'co_investigators', 'fund_requested',
            'proposal_file', 'application_template_file',
            'revised_proposal_file', 'response_to_reviewers_file',
            'cycle', 'cycle_name', 'status', 'status_display',
            'created_by', 'created_by_email', 'submitted_by', 'submitted_by_email',
            'primary_research_area', 'primary_research_area_name',
            'keywords', 'keywords_input',
            'created_at', 'submitted_at', 'updated_at', 'revision_deadline',
            'is_revision_overdue', 'is_locked',
            'stage1_decision', 'final_decision', 'approved_amount', 'final_remarks'
        ]
        # These fields are managed server-side to prevent client tampering
        read_only_fields = [
            'proposal_code', 'status', 'created_at', 'submitted_at',
            'updated_at', 'revision_deadline', 'is_locked',
            'created_by', 'submitted_by'
        ]

    def validate(self, data):
        """Auto-populate PI information from authenticated user during validation.

        This lets PIs submit proposals without manually entering their own info —
        the backend fills it from the JWT-authenticated user profile.
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            is_staff = getattr(user, 'is_staff', False)
            if not is_staff and not data.get('pi_email'):
                data['pi_email'] = request.user.email
            if not is_staff and not data.get('pi_name'):
                data['pi_name'] = request.user.get_full_name() or request.user.username
            if not data.get('pi_department'):
                data['pi_department'] = 'Not Specified'

        for file_field in (
            'proposal_file',
            'application_template_file',
            'revised_proposal_file',
            'response_to_reviewers_file',
        ):
            uploaded_file = data.get(file_field)
            if uploaded_file and uploaded_file.size > settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
                raise serializers.ValidationError({
                    file_field: f'File exceeds maximum allowed size of {settings.FILE_UPLOAD_MAX_MEMORY_SIZE // (1024 * 1024)} MB.'
                })
        return data

    def get_keywords(self, obj):
        return list(obj.keywords.values_list('name', flat=True))

    def get_stage1_decision(self, obj):
        if hasattr(obj, 'stage1_decision'):
            return Stage1DecisionSerializer(obj.stage1_decision).data
        return None

    def get_final_decision(self, obj):
        if hasattr(obj, 'final_decision'):
            return FinalDecisionSerializer(obj.final_decision).data
        return None

    def _parse_keywords_input(self, value):
        if not value:
            return []
        if isinstance(value, list):
            raw_tokens = value
        else:
            raw_tokens = str(value).split(',')

        cleaned = []
        seen = set()
        for token in raw_tokens:
            normalized = token.strip().lower()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            cleaned.append(token.strip())
        return cleaned

    def create(self, validated_data):
        keyword_names = self._parse_keywords_input(validated_data.pop('keywords_input', ''))
        request = self.context.get('request')
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            validated_data.setdefault('created_by', request.user)
        proposal = super().create(validated_data)
        ProposalService.sync_proposal_keywords_and_category(proposal, keyword_names, user=request.user if request else None)
        return proposal

    def update(self, instance, validated_data):
        keyword_names = None
        if 'keywords_input' in validated_data:
            keyword_names = self._parse_keywords_input(validated_data.pop('keywords_input', ''))
        proposal = super().update(instance, validated_data)
        if keyword_names is not None:
            ProposalService.sync_proposal_keywords_and_category(proposal, keyword_names, user=self.context.get('request').user if self.context.get('request') else None)
        return proposal


class ProposalSubmitSerializer(serializers.Serializer):
    """Serializer for submitting a proposal.

    Empty because submission is an action (status transition), not a data update.
    The view handles moving status from DRAFT -> SUBMITTED.
    """
    pass

class RevisionSubmitSerializer(serializers.Serializer):
    """Serializer for submitting a revision after Stage 1 review.

    The PI must upload a revised proposal file. The response-to-reviewers
    document is optional but recommended — it explains how review feedback
    was addressed.
    """
    revised_proposal_file = serializers.FileField(required=True)
    response_to_reviewers_file = serializers.FileField(required=False)

    def validate_revised_proposal_file(self, value):
        if value.size > settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
            raise serializers.ValidationError('Revised proposal exceeds the 50 MB upload limit.')
        return value

    def validate_response_to_reviewers_file(self, value):
        if value.size > settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
            raise serializers.ValidationError('Response-to-reviewers file exceeds the 50 MB upload limit.')
        return value


class RevisionDeadlineActionSerializer(serializers.Serializer):
    days = serializers.IntegerField(min_value=1, required=False)
    reason = serializers.CharField(required=False, allow_blank=True, default='')


# =============================================================================
# Decision Serializers (Stage 1 and Final)
# =============================================================================

class Stage1DecisionSerializer(serializers.ModelSerializer):
    """Read serializer for Stage 1 decisions.

    average_score is computed from all completed Stage 1 reviews and is
    read-only so the chair can see it but not override it.
    """
    proposal_code = serializers.CharField(source='proposal.proposal_code', read_only=True)
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)

    class Meta:
        model = Stage1Decision
        fields = [
            'id', 'proposal', 'proposal_code', 'decision', 'decision_display',
            'decision_date', 'chair_comments', 'average_score'
        ]
        read_only_fields = ['decision_date', 'average_score']


class Stage1DecisionCreateSerializer(serializers.Serializer):
    """Write serializer for creating a Stage 1 decision.

    The SRC Chair selects a decision (accept/reject/revision) and optionally
    provides comments. The average_score is computed server-side from reviews.
    """
    decision = serializers.ChoiceField(choices=Stage1Decision.Decision.choices)
    chair_comments = serializers.CharField(required=False, allow_blank=True)


class FinalDecisionSerializer(serializers.ModelSerializer):
    """Read serializer for Final decisions (after Stage 2 review)."""
    proposal_code = serializers.CharField(source='proposal.proposal_code', read_only=True)
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)

    class Meta:
        model = FinalDecision
        fields = [
            'id', 'proposal', 'proposal_code', 'decision', 'decision_display',
            'decision_date', 'approved_grant_amount', 'final_remarks'
        ]
        read_only_fields = ['decision_date']


class FinalDecisionCreateSerializer(serializers.Serializer):
    """Write serializer for creating a Final decision.

    Unlike Stage 1, the final decision requires an approved grant amount
    (may differ from the requested amount) and final remarks.
    """
    decision = serializers.ChoiceField(choices=FinalDecision.Decision.choices)
    approved_grant_amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    final_remarks = serializers.CharField()


# =============================================================================
# Audit & Dashboard Serializers
# =============================================================================

class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for Audit Logs.

    Flattens user_email and proposal_code via SerializerMethodField so the
    frontend can display them without extra lookups. Handles nullable FKs
    (user/proposal can be None for system-generated events).
    """
    user_email = serializers.SerializerMethodField()
    proposal_code = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action_type',
            'proposal', 'proposal_code', 'timestamp', 'details'
        ]

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def get_proposal_code(self, obj):
        return obj.proposal.proposal_code if obj.proposal else None


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for the SRC Chair dashboard summary cards.

    status_breakdown is a dict mapping status strings to counts,
    used to render the proposal status distribution chart.
    """
    total_proposals = serializers.IntegerField()
    pending_reviews = serializers.IntegerField()
    awaiting_decision = serializers.IntegerField()
    awaiting_revision = serializers.IntegerField()
    status_breakdown = serializers.DictField()
