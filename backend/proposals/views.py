"""
API Views for the proposals module.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q

from .models import (
    GrantCycle, Proposal, Stage1Decision, FinalDecision, AuditLog,
    ResearchArea, Keyword, ResearchAreaKeyword
)
from .serializers import (
    GrantCycleSerializer, GrantCycleStatsSerializer,
    ProposalSerializer, ProposalListSerializer,
    ProposalSubmitSerializer, RevisionSubmitSerializer, RevisionDeadlineActionSerializer,
    Stage1DecisionSerializer, Stage1DecisionCreateSerializer,
    FinalDecisionSerializer, FinalDecisionCreateSerializer,
    AuditLogSerializer, DashboardStatsSerializer,
    ResearchAreaSerializer, KeywordSerializer, ResearchAreaKeywordSerializer
)
from .services import ProposalService, EmailService, get_client_ip


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow write access only to admin/staff users."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class ProposalAccessPermission(permissions.BasePermission):
    """
    Enforce the CTRG role model:
    - SRC Chair has full access.
    - Reviewers can only view proposals assigned to them.
    - PIs can manage their own proposals.
    """

    admin_only_actions = {
        'destroy',
        'stage1_decision',
        'start_stage2',
        'reopen_revision',
        'mark_revision_missed',
        'chair_stage2_review',
        'final_decision',
        'download_report',
        'download_report_docx',
        'download_review_template',
        'download_review_template_docx',
    }
    pi_write_actions = {'create', 'update', 'partial_update', 'submit', 'submit_revision'}
    owner_only_read_actions = {'reviews', 'combined_comments'}

    @staticmethod
    def _has_group(user, group_name):
        return bool(user and user.is_authenticated and user.groups.filter(name=group_name).exists())

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_staff:
            return True

        if view.action in self.admin_only_actions:
            return False

        if view.action == 'create':
            return self._has_group(user, 'PI')

        if view.action in self.pi_write_actions:
            return self._has_group(user, 'PI')

        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff:
            return True

        is_owner = obj.created_by_id == user.id or (
            bool(obj.pi_email) and bool(user.email) and obj.pi_email.lower() == user.email.lower()
        )

        if view.action in self.pi_write_actions:
            if obj.is_locked:
                return False
            if view.action in {'update', 'partial_update'} and obj.status != Proposal.Status.DRAFT:
                return False
            return is_owner and self._has_group(user, 'PI')

        if view.action in self.owner_only_read_actions:
            return is_owner

        if view.action == 'download_file':
            return is_owner or obj.review_assignments.filter(reviewer=user).exists()

        if view.action == 'retrieve':
            return is_owner or obj.review_assignments.filter(reviewer=user).exists()

        return is_owner or obj.review_assignments.filter(reviewer=user).exists()


def build_canonical_status_breakdown(proposals_queryset):
    """Return counts keyed by the required canonical lifecycle statuses."""
    breakdown = {
        status: 0
        for status in Proposal.CANONICAL_LIFECYCLE_STATUSES
    }

    for row in proposals_queryset.values('status').annotate(total=Count('id')):
        reportable = Proposal.reportable_status(row['status'])
        if reportable:
            breakdown[reportable] += row['total']

    return breakdown


class GrantCycleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Grant Cycle management.
    Only SRC Chair (admin) can create/update cycles.
    """
    serializer_class = GrantCycleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        """Optimized queryset with prefetch for better performance."""
        return GrantCycle.objects.all().prefetch_related('proposals')
    
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def statistics(self, request, pk=None):
        """Get proposal statistics for a specific cycle."""
        cycle = self.get_object()
        proposals = cycle.proposals.all()

        agg = proposals.aggregate(
            total_proposals=Count('id'),
            submitted=Count('id', filter=Q(status=Proposal.Status.SUBMITTED)),
            under_stage1_review=Count('id', filter=Q(status=Proposal.Status.UNDER_STAGE_1_REVIEW)),
            stage1_rejected=Count('id', filter=Q(status=Proposal.Status.STAGE_1_REJECTED)),
            accepted_no_corrections=Count('id', filter=Q(status=Proposal.Status.ACCEPTED_NO_CORRECTIONS)),
            tentatively_accepted=Count('id', filter=Q(status=Proposal.Status.TENTATIVELY_ACCEPTED)),
            revision_requested=Count('id', filter=Q(status=Proposal.Status.REVISION_REQUESTED)),
            revised_submitted=Count('id', filter=Q(status=Proposal.Status.REVISED_PROPOSAL_SUBMITTED)),
            under_stage2_review=Count('id', filter=Q(status=Proposal.Status.UNDER_STAGE_2_REVIEW)),
            final_accepted=Count('id', filter=Q(status=Proposal.Status.FINAL_ACCEPTED)),
            final_rejected=Count('id', filter=Q(status=Proposal.Status.FINAL_REJECTED)),
            revision_deadline_missed=Count('id', filter=Q(status=Proposal.Status.REVISION_DEADLINE_MISSED)),
        )

        serializer = GrantCycleStatsSerializer(agg)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get currently active cycles."""
        cycles = GrantCycle.objects.filter(is_active=True)
        serializer = self.get_serializer(cycles, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def summary_report(self, request, pk=None):
        """Download cycle summary report as PDF."""
        from .reporting import generate_summary_report
        from django.http import HttpResponse

        cycle = self.get_object()
        pdf_buffer = generate_summary_report(cycle)

        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="cycle_summary_{cycle.year}.pdf"'
        return response

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def summary_report_docx(self, request, pk=None):
        """Download cycle summary report as DOCX."""
        from .reporting import generate_summary_report_docx
        from django.http import HttpResponse

        cycle = self.get_object()
        docx_buffer = generate_summary_report_docx(cycle)

        response = HttpResponse(
            docx_buffer,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        response['Content-Disposition'] = f'attachment; filename="cycle_summary_{cycle.year}.docx"'
        return response


class ProposalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Proposal management.
    - PIs see only their own proposals
    - Reviewers see assigned proposals
    - Admin sees all

    OPTIMIZED: Uses select_related and prefetch_related to reduce database queries
    """
    permission_classes = [ProposalAccessPermission]

    def get_serializer_class(self):
        if self.action == 'list':
            return ProposalListSerializer
        return ProposalSerializer

    def get_queryset(self):
        """
        Optimized queryset that reduces N+1 queries.
        Uses select_related for ForeignKey and prefetch_related for reverse FKs.
        """
        user = self.request.user

        # Base queryset with optimizations
        base_queryset = Proposal.objects.select_related(
            'cycle',          # ForeignKey to GrantCycle
            'stage1_decision',  # Reverse OneToOne to Stage1Decision
            'final_decision',    # Reverse OneToOne to FinalDecision
            'primary_research_area',
            'created_by',
            'submitted_by',
        ).prefetch_related('keywords')

        # Admin sees all
        if user.is_staff:
            queryset = base_queryset.all()
        else:
            # Check if user is a reviewer
            from reviews.models import ReviewAssignment
            reviewer_proposal_ids = ReviewAssignment.objects.filter(
                reviewer=user
            ).values_list('proposal_id', flat=True)

            # Return own PI proposals and/or assigned proposals for reviewers
            queryset = base_queryset.filter(
                Q(pi_email=user.email) | Q(created_by=user) | Q(id__in=reviewer_proposal_ids)
            ).distinct()

        keyword_query = self.request.query_params.get('keyword', '').strip()
        if keyword_query:
            queryset = queryset.filter(
                Q(keywords__name__icontains=keyword_query) |
                Q(keywords__normalized_name__icontains=keyword_query.lower())
            )

        research_area = self.request.query_params.get('research_area', '').strip()
        if research_area:
            if research_area.isdigit():
                queryset = queryset.filter(primary_research_area_id=int(research_area))
            else:
                queryset = queryset.filter(primary_research_area__name__icontains=research_area)

        return queryset.distinct()
    
    def perform_create(self, serializer):
        """Create a proposal with auto-filled PI info from user."""
        proposal = serializer.save()
        # Set PI information from user profile if not provided
        changed = False
        if not proposal.pi_name:
            proposal.pi_name = self.request.user.get_full_name() or self.request.user.username
            changed = True
        if not proposal.pi_email:
            proposal.pi_email = self.request.user.email
            changed = True
        if changed:
            proposal.save()
        AuditLog.objects.create(
            user=self.request.user,
            action_type='PROPOSAL_CREATED',
            proposal=proposal,
            details={
                'created_by': self.request.user.email,
                'pi_email': proposal.pi_email,
            },
            ip_address=get_client_ip(self.request)
        )

    @action(detail=False, methods=['get'])
    def my_proposals(self, request):
        """Get all proposals with PI email matching current user."""
        proposals = Proposal.objects.select_related(
            'cycle', 'stage1_decision', 'final_decision',
            'primary_research_area', 'created_by', 'submitted_by',
        ).prefetch_related('keywords').filter(
            Q(pi_email=request.user.email) | Q(created_by=request.user)
        ).distinct()
        serializer = ProposalListSerializer(proposals, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit a draft proposal."""
        proposal = self.get_object()
        try:
            ProposalService.submit_proposal(proposal, user=request.user)
            # Log IP for audit trail
            AuditLog.objects.filter(
                proposal=proposal, action_type='PROPOSAL_SUBMITTED'
            ).order_by('-timestamp').update(ip_address=get_client_ip(request))
            return Response({'status': 'Proposal submitted successfully.'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def submit_revision(self, request, pk=None):
        """Submit a revised proposal."""
        proposal = self.get_object()
        serializer = RevisionSubmitSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            ProposalService.submit_revision(
                proposal,
                revised_file=serializer.validated_data.get('revised_proposal_file'),
                response_file=serializer.validated_data.get('response_to_reviewers_file'),
                user=request.user
            )
            AuditLog.objects.filter(
                proposal=proposal, action_type='REVISION_SUBMITTED'
            ).order_by('-timestamp').update(ip_address=get_client_ip(request))
            return Response({'status': 'Revision submitted successfully.'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def stage1_decision(self, request, pk=None):
        """Apply Stage 1 decision (SRC Chair only)."""
        proposal = self.get_object()
        serializer = Stage1DecisionCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            decision = ProposalService.apply_stage1_decision(
                proposal,
                decision=serializer.validated_data['decision'],
                chair_comments=serializer.validated_data.get('chair_comments', ''),
                user=request.user
            )
            AuditLog.objects.filter(
                proposal=proposal, action_type='STAGE1_DECISION_MADE'
            ).order_by('-timestamp').update(ip_address=get_client_ip(request))
            return Response(Stage1DecisionSerializer(decision).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def start_stage2(self, request, pk=None):
        """Transition proposal to Stage 2 review (SRC Chair only)."""
        proposal = self.get_object()
        try:
            ProposalService.start_stage2_review(proposal, user=request.user)
            AuditLog.objects.filter(
                proposal=proposal, action_type='STAGE2_REVIEW_STARTED'
            ).order_by('-timestamp').update(ip_address=get_client_ip(request))
            return Response({'status': 'Stage 2 review started.'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def reopen_revision(self, request, pk=None):
        """Reopen or extend a missed revision window."""
        proposal = self.get_object()
        serializer = RevisionDeadlineActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated = ProposalService.reopen_revision_window(
                proposal,
                days=serializer.validated_data.get('days'),
                reason=serializer.validated_data.get('reason', ''),
                user=request.user,
            )
            return Response(ProposalSerializer(updated, context={'request': request}).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def mark_revision_missed(self, request, pk=None):
        """Manually flag a proposal as having missed the revision deadline."""
        proposal = self.get_object()
        if not ProposalService.mark_revision_deadline_missed(proposal, user=request.user):
            return Response({'error': 'Proposal is not awaiting revision.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ProposalSerializer(proposal, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def chair_stage2_review(self, request, pk=None):
        """Create or update a direct SRC Chair Stage 2 review."""
        from reviews.serializers import Stage2ReviewSerializer

        proposal = self.get_object()
        serializer = Stage2ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            review = ProposalService.submit_chair_stage2_review(
                proposal=proposal,
                concerns_addressed=serializer.validated_data['concerns_addressed'],
                revised_recommendation=serializer.validated_data['revised_recommendation'],
                technical_comments=serializer.validated_data['technical_comments'],
                budget_comments=serializer.validated_data.get('budget_comments', ''),
                revised_score=serializer.validated_data.get('revised_score'),
                is_draft=serializer.validated_data.get('is_draft', False),
                user=request.user,
            )
            return Response(Stage2ReviewSerializer(review).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def final_decision(self, request, pk=None):
        """Apply final decision (SRC Chair only)."""
        proposal = self.get_object()
        serializer = FinalDecisionCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            decision = ProposalService.apply_final_decision(
                proposal,
                decision=serializer.validated_data['decision'],
                approved_amount=serializer.validated_data['approved_grant_amount'],
                final_remarks=serializer.validated_data['final_remarks'],
                user=request.user
            )
            AuditLog.objects.filter(
                proposal=proposal, action_type='FINAL_DECISION_MADE'
            ).order_by('-timestamp').update(ip_address=get_client_ip(request))
            # Send notification email
            EmailService.send_final_decision_email(proposal)
            return Response(FinalDecisionSerializer(decision).data)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """Get all reviews for a proposal."""
        from reviews.models import ReviewAssignment, Stage2Review
        from reviews.serializers import ReviewAssignmentSerializer, Stage2ReviewSerializer
        
        proposal = self.get_object()
        assignments = ReviewAssignment.objects.filter(proposal=proposal).select_related('reviewer', 'stage1_score', 'stage2_review')
        chair_reviews = Stage2Review.objects.filter(proposal=proposal, is_chair_review=True).select_related('reviewed_by')
        return Response({
            'assignments': ReviewAssignmentSerializer(assignments, many=True).data,
            'chair_stage2_reviews': Stage2ReviewSerializer(chair_reviews, many=True).data,
        })

    @action(detail=True, methods=['get'])
    def combined_comments(self, request, pk=None):
        """Return a flat combined view of reviewer comments for revision handling."""
        from reviews.models import ReviewAssignment

        proposal = self.get_object()
        combined = []
        stage1_assignments = ReviewAssignment.objects.filter(
            proposal=proposal,
            stage=ReviewAssignment.Stage.STAGE_1,
            status=ReviewAssignment.Status.COMPLETED,
        ).select_related('stage1_score', 'reviewer')

        for assignment in stage1_assignments:
            if not hasattr(assignment, 'stage1_score'):
                continue
            combined.append({
                'reviewer': assignment.reviewer.get_full_name() or assignment.reviewer.username,
                'recommendation': assignment.stage1_score.recommendation,
                'narrative_comments': assignment.stage1_score.narrative_comments,
                'detailed_recommendation': assignment.stage1_score.detailed_recommendation,
                'is_excluded': assignment.is_excluded_from_decision,
            })

        return Response({'proposal_id': proposal.id, 'comments': combined})
    
    @action(detail=True, methods=['get'])
    def download_report(self, request, pk=None):
        """Download combined review report as PDF."""
        from .reporting import generate_combined_review_pdf
        from django.http import HttpResponse

        proposal = self.get_object()
        pdf_buffer = generate_combined_review_pdf(proposal)

        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="review_report_{proposal.proposal_code}.pdf"'
        return response

    @action(detail=True, methods=['get'])
    def download_report_docx(self, request, pk=None):
        """Download combined review report as DOCX."""
        from .reporting import generate_combined_review_docx
        from django.http import HttpResponse

        proposal = self.get_object()
        docx_buffer = generate_combined_review_docx(proposal)
        response = HttpResponse(
            docx_buffer,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        response['Content-Disposition'] = f'attachment; filename="review_report_{proposal.proposal_code}.docx"'
        return response

    @action(detail=True, methods=['get'])
    def download_review_template(self, request, pk=None):
        """Download a reviewer scoring template PDF for a proposal."""
        from .reporting import generate_review_template_pdf
        from django.http import HttpResponse

        proposal = self.get_object()
        pdf_buffer = generate_review_template_pdf(proposal)

        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="review_template_{proposal.proposal_code}.pdf"'
        return response

    @action(detail=True, methods=['get'])
    def download_review_template_docx(self, request, pk=None):
        """Download a reviewer scoring template DOCX for a proposal."""
        from .reporting import generate_review_template_docx
        from django.http import HttpResponse

        proposal = self.get_object()
        docx_buffer = generate_review_template_docx(proposal)

        response = HttpResponse(
            docx_buffer,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        response['Content-Disposition'] = f'attachment; filename="review_template_{proposal.proposal_code}.docx"'
        return response

    @action(detail=True, methods=['get'], url_path='download_file/(?P<file_type>[a-z_]+)')
    def download_file(self, request, pk=None, file_type=None):
        """Download a specific file from a proposal. PI can download their own files."""
        from django.http import FileResponse

        proposal = self.get_object()

        file_map = {
            'proposal': proposal.proposal_file,
            'application_template': proposal.application_template_file,
            'revised_proposal': proposal.revised_proposal_file,
            'response_to_reviewers': proposal.response_to_reviewers_file,
        }

        file_field = file_map.get(file_type)
        if not file_field:
            return Response({'error': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            return FileResponse(
                file_field.open('rb'),
                as_attachment=True,
                filename=file_field.name.rsplit('/', 1)[-1]
            )
        except (FileNotFoundError, ValueError):
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for dashboard statistics.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def src_chair(self, request):
        """SRC Chair dashboard statistics."""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        from reviews.models import ReviewAssignment, Stage2Review
        
        proposals = Proposal.objects.all()
        pending_reviews = ReviewAssignment.objects.filter(
            status=ReviewAssignment.Status.PENDING
        ).count()
        
        stage1_awaiting_decision = proposals.filter(
            status=Proposal.Status.UNDER_STAGE_1_REVIEW
        ).annotate(
            pending_reviews=Count('review_assignments', filter=Q(
                review_assignments__status=ReviewAssignment.Status.PENDING,
                review_assignments__stage=1
            )),
            completed_reviews=Count('review_assignments', filter=Q(
                review_assignments__status=ReviewAssignment.Status.COMPLETED,
                review_assignments__stage=1
            ))
        ).filter(
            pending_reviews=0,
            completed_reviews__gt=0,
            stage1_decision__isnull=True,
        ).count()

        from reviews.models import Stage2Review
        # Count Stage 2 proposals where all assignments are completed or chair review exists
        stage2_candidates = proposals.filter(
            status=Proposal.Status.UNDER_STAGE_2_REVIEW,
            final_decision__isnull=True,
        ).annotate(
            pending_s2=Count('review_assignments', filter=Q(
                review_assignments__status=ReviewAssignment.Status.PENDING,
                review_assignments__stage=2
            )),
            total_s2=Count('review_assignments', filter=Q(
                review_assignments__stage=2
            )),
        )
        # Proposals ready for decision: either all Stage 2 assignments done, or chair review exists
        chair_reviewed_ids = set(
            Stage2Review.objects.filter(
                is_chair_review=True, is_draft=False,
                proposal__status=Proposal.Status.UNDER_STAGE_2_REVIEW,
                proposal__final_decision__isnull=True,
            ).values_list('proposal_id', flat=True)
        )
        stage2_awaiting_decision = sum(
            1 for p in stage2_candidates
            if (p.total_s2 > 0 and p.pending_s2 == 0) or p.id in chair_reviewed_ids
        )
        
        awaiting_revision = proposals.filter(
            status__in=[Proposal.Status.REVISION_REQUESTED, Proposal.Status.REVISION_DEADLINE_MISSED]
        ).count()
        status_breakdown = build_canonical_status_breakdown(proposals.exclude(status=Proposal.Status.DRAFT))
        
        data = {
            'total_proposals': sum(status_breakdown.values()),
            'pending_reviews': pending_reviews,
            'awaiting_decision': stage1_awaiting_decision + stage2_awaiting_decision,
            'awaiting_revision': awaiting_revision,
            'status_breakdown': status_breakdown
        }
        
        return Response(DashboardStatsSerializer(data).data)
    
    @action(detail=False, methods=['get'])
    def reviewer(self, request):
        """Reviewer dashboard statistics."""
        if not request.user.groups.filter(name='Reviewer').exists() and not request.user.is_staff:
            return Response({'error': 'Reviewer access required'}, status=status.HTTP_403_FORBIDDEN)

        from reviews.models import ReviewAssignment
        from reviews.serializers import ReviewAssignmentSerializer

        assignments = ReviewAssignment.objects.filter(reviewer=request.user)
        
        data = {
            'assigned_proposals': assignments.values('proposal_id').distinct().count(),
            'pending_reviews': assignments.filter(status=ReviewAssignment.Status.PENDING).count(),
            'submitted_reviews': assignments.filter(status=ReviewAssignment.Status.COMPLETED).count(),
            'total_assigned': assignments.count(),
            'pending': assignments.filter(status=ReviewAssignment.Status.PENDING).count(),
            'completed': assignments.filter(status=ReviewAssignment.Status.COMPLETED).count(),
            'pending_assignments': ReviewAssignmentSerializer(
                assignments.filter(status=ReviewAssignment.Status.PENDING),
                many=True
            ).data
        }
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def pi(self, request):
        """PI dashboard statistics."""
        if not request.user.groups.filter(name='PI').exists() and not request.user.is_staff:
            return Response({'error': 'PI access required'}, status=status.HTTP_403_FORBIDDEN)

        proposals = Proposal.objects.filter(
            Q(pi_email=request.user.email) | Q(created_by=request.user)
        ).distinct()
        
        # Find proposals with upcoming revision deadlines
        from datetime import timedelta
        upcoming_deadlines = proposals.filter(
            status__in=[Proposal.Status.REVISION_REQUESTED, Proposal.Status.REVISION_DEADLINE_MISSED],
            revision_deadline__gt=timezone.now()
        ).values('id', 'proposal_code', 'title', 'revision_deadline')
        upcoming_deadlines_list = list(upcoming_deadlines)
        submitted_proposals = proposals.exclude(status=Proposal.Status.DRAFT)
        final_decisions = proposals.filter(
            status__in=[
                Proposal.Status.STAGE_1_REJECTED,
                Proposal.Status.ACCEPTED_NO_CORRECTIONS,
                Proposal.Status.FINAL_ACCEPTED,
                Proposal.Status.FINAL_REJECTED,
            ]
        )
        
        agg = proposals.aggregate(
            drafts=Count('id', filter=Q(status=Proposal.Status.DRAFT)),
            under_review=Count('id', filter=Q(status__in=[
                Proposal.Status.SUBMITTED,
                Proposal.Status.UNDER_STAGE_1_REVIEW,
                Proposal.Status.UNDER_STAGE_2_REVIEW,
            ])),
            awaiting_revision=Count('id', filter=Q(status=Proposal.Status.REVISION_REQUESTED)),
            accepted=Count('id', filter=Q(status__in=[
                Proposal.Status.ACCEPTED_NO_CORRECTIONS,
                Proposal.Status.FINAL_ACCEPTED,
            ])),
            rejected=Count('id', filter=Q(status__in=[
                Proposal.Status.STAGE_1_REJECTED,
                Proposal.Status.FINAL_REJECTED,
            ])),
        )
        data = {
            'submitted_proposals': submitted_proposals.count(),
            'revision_deadlines': len(upcoming_deadlines_list),
            'final_decisions': final_decisions.count(),
            'total_submitted': submitted_proposals.count(),
            'drafts': agg['drafts'],
            'under_review': agg['under_review'],
            'awaiting_revision': agg['awaiting_revision'],
            'accepted': agg['accepted'],
            'rejected': agg['rejected'],
            'upcoming_deadlines': upcoming_deadlines_list,
            'proposals': ProposalListSerializer(proposals, many=True).data
        }
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def recent_activities(self, request):
        """Get recent audit log entries for the SRC Chair dashboard."""
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        logs = AuditLog.objects.select_related('user', 'proposal').order_by('-timestamp')[:10]
        activities = []
        for log in logs:
            action_type_map = {
                'PROPOSAL_SUBMITTED': 'submission',
                'REVISION_SUBMITTED': 'revision',
                'STAGE1_DECISION_MADE': 'decision',
                'FINAL_DECISION_MADE': 'decision',
                'REVIEWER_ASSIGNED': 'review',
                'STAGE2_REVIEW_STARTED': 'review',
                'REVISION_DEADLINE_MISSED': 'decision',
            }
            activities.append({
                'id': log.id,
                'type': action_type_map.get(log.action_type, 'submission'),
                'description': f"{log.action_type.replace('_', ' ').title()}"
                               + (f" - {log.proposal.proposal_code}" if log.proposal else ''),
                'timestamp': log.timestamp.isoformat(),
                'user': log.user.get_full_name() if log.user else None,
            })
        return Response(activities)


class ResearchAreaViewSet(viewsets.ModelViewSet):
    """Catalog of research areas used for automatic proposal categorization."""
    serializer_class = ResearchAreaSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = ResearchArea.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset


class KeywordViewSet(viewsets.ModelViewSet):
    """Catalog of canonical proposal/reviewer keywords."""
    serializer_class = KeywordSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Keyword.objects.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)

        q = self.request.query_params.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(name__icontains=q) | Q(normalized_name__icontains=q.lower())
            )
        return queryset


class ResearchAreaKeywordViewSet(viewsets.ModelViewSet):
    """Admin-managed weighted mappings from keywords to research areas."""
    serializer_class = ResearchAreaKeywordSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    queryset = ResearchAreaKeyword.objects.select_related('research_area', 'keyword').all()


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs (admin only).
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def get_queryset(self):
        queryset = AuditLog.objects.all()
        
        # Filter by proposal
        proposal_id = self.request.query_params.get('proposal')
        if proposal_id:
            queryset = queryset.filter(proposal_id=proposal_id)
        
        # Filter by action type
        action_type = self.request.query_params.get('action_type')
        if action_type:
            queryset = queryset.filter(action_type=action_type)
        
        return queryset
