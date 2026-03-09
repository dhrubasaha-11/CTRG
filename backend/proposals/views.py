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
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get proposal statistics for a specific cycle."""
        cycle = self.get_object()
        proposals = cycle.proposals.all()
        
        stats = {
            'total_proposals': proposals.count(),
            'submitted': proposals.filter(status=Proposal.Status.SUBMITTED).count(),
            'under_stage1_review': proposals.filter(status=Proposal.Status.UNDER_STAGE_1_REVIEW).count(),
            'stage1_rejected': proposals.filter(status=Proposal.Status.STAGE_1_REJECTED).count(),
            'accepted_no_corrections': proposals.filter(status=Proposal.Status.ACCEPTED_NO_CORRECTIONS).count(),
            'tentatively_accepted': proposals.filter(status=Proposal.Status.TENTATIVELY_ACCEPTED).count(),
            'revision_requested': proposals.filter(status=Proposal.Status.REVISION_REQUESTED).count(),
            'revised_submitted': proposals.filter(status=Proposal.Status.REVISED_PROPOSAL_SUBMITTED).count(),
            'under_stage2_review': proposals.filter(status=Proposal.Status.UNDER_STAGE_2_REVIEW).count(),
            'final_accepted': proposals.filter(status=Proposal.Status.FINAL_ACCEPTED).count(),
            'final_rejected': proposals.filter(status=Proposal.Status.FINAL_REJECTED).count(),
            'revision_deadline_missed': proposals.filter(status=Proposal.Status.REVISION_DEADLINE_MISSED).count(),
        }
        
        serializer = GrantCycleStatsSerializer(stats)
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
    permission_classes = [permissions.IsAuthenticated]

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
        proposals = Proposal.objects.filter(
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
        assignments = ReviewAssignment.objects.filter(proposal=proposal)
        chair_reviews = Stage2Review.objects.filter(proposal=proposal, is_chair_review=True)
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
        
        from reviews.models import ReviewAssignment
        
        proposals = Proposal.objects.all()
        pending_reviews = ReviewAssignment.objects.filter(
            status=ReviewAssignment.Status.PENDING
        ).count()
        
        # Proposals awaiting Stage 1 decision (all reviews complete but no decision)
        awaiting_decision = proposals.filter(
            status=Proposal.Status.UNDER_STAGE_1_REVIEW
        ).annotate(
            pending_reviews=Count('review_assignments', filter=Q(
                review_assignments__status=ReviewAssignment.Status.PENDING,
                review_assignments__stage=1
            ))
        ).filter(pending_reviews=0).count()
        
        awaiting_revision = proposals.filter(
            status=Proposal.Status.REVISION_REQUESTED
        ).count()
        
        # Status breakdown
        status_breakdown = {}
        for choice in Proposal.Status.choices:
            status_breakdown[choice[0]] = proposals.filter(status=choice[0]).count()
        
        data = {
            'total_proposals': proposals.count(),
            'pending_reviews': pending_reviews,
            'awaiting_decision': awaiting_decision,
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
            status=Proposal.Status.REVISION_REQUESTED,
            revision_deadline__gt=timezone.now()
        ).values('id', 'proposal_code', 'title', 'revision_deadline')
        
        data = {
            'total_submitted': proposals.exclude(status=Proposal.Status.DRAFT).count(),
            'drafts': proposals.filter(status=Proposal.Status.DRAFT).count(),
            'under_review': proposals.filter(
                status__in=[
                    Proposal.Status.SUBMITTED,
                    Proposal.Status.UNDER_STAGE_1_REVIEW,
                    Proposal.Status.UNDER_STAGE_2_REVIEW
                ]
            ).count(),
            'awaiting_revision': proposals.filter(
                status=Proposal.Status.REVISION_REQUESTED
            ).count(),
            'accepted': proposals.filter(
                status__in=[
                    Proposal.Status.ACCEPTED_NO_CORRECTIONS,
                    Proposal.Status.FINAL_ACCEPTED
                ]
            ).count(),
            'rejected': proposals.filter(
                status__in=[
                    Proposal.Status.STAGE_1_REJECTED,
                    Proposal.Status.FINAL_REJECTED
                ]
            ).count(),
            'upcoming_deadlines': list(upcoming_deadlines),
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
