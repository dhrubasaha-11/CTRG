"""
API Views for the reviews module.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import ReviewerProfile, ReviewAssignment, Stage1Score, Stage2Review
from .serializers import (
    ReviewerProfileSerializer, ReviewAssignmentSerializer,
    ReviewAssignmentCreateSerializer, AutoAssignReviewersSerializer,
    Stage1ScoreSerializer, Stage2ReviewSerializer,
    ReviewerWorkloadSerializer, EmailReviewersSerializer,
    ReviewValidityUpdateSerializer,
)
from proposals.services import ReviewerService, EmailService, ProposalService
from proposals.models import AuditLog


class ReviewerProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing reviewer profiles.
    Admin can manage all, reviewers can view their own.
    OPTIMIZED: Uses select_related to reduce database queries.
    """
    serializer_class = ReviewerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Optimized queryset with select_related for User and prefetch for assignments."""
        base_queryset = ReviewerProfile.objects.select_related('user').prefetch_related('user__review_assignments')

        if self.request.user.is_staff:
            return base_queryset.all()
        return base_queryset.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def workloads(self, request):
        """Get workload statistics for all reviewers."""
        stats = ReviewerService.get_all_reviewers_stats()
        serializer = ReviewerWorkloadSerializer(stats, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def email_reviewers(self, request):
        """Send proposal details email to selected reviewers."""
        serializer = EmailReviewersSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = EmailService.send_reviewer_proposal_details_email(
            reviewer_ids=serializer.validated_data['reviewer_ids'],
            custom_subject=serializer.validated_data.get('subject') or None,
            custom_message=serializer.validated_data.get('message', '')
        )

        return Response(result)

    @action(detail=False, methods=['get'])
    def my_profile(self, request):
        """Get current user's reviewer profile."""
        try:
            profile = ReviewerProfile.objects.get(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except ReviewerProfile.DoesNotExist:
            return Response(
                {'error': 'Reviewer profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ReviewAssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for review assignments.
    OPTIMIZED: Uses select_related and prefetch_related to minimize database hits.
    """
    serializer_class = ReviewAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Optimized queryset that reduces N+1 queries.
        Eager loads related proposal, reviewer, and scores.
        """
        user = self.request.user

        base_queryset = ReviewAssignment.objects.select_related(
            'proposal',                    # ForeignKey
            'proposal__cycle',             # Through proposal
            'reviewer',                    # ForeignKey to User
        ).select_related(
            'stage1_score',
            'stage2_review'
        )

        if user.is_staff:
            return base_queryset.all()
        return base_queryset.filter(reviewer=user)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def assign_reviewers(self, request):
        """Bulk assign reviewers to a proposal (SRC Chair only)."""
        serializer = ReviewAssignmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        from proposals.models import Proposal
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            proposal = Proposal.objects.get(id=serializer.validated_data['proposal_id'])
        except Proposal.DoesNotExist:
            return Response({'error': 'Proposal not found'}, status=status.HTTP_404_NOT_FOUND)
        
        assignments = []
        errors = []
        
        for reviewer_id in serializer.validated_data['reviewer_ids']:
            try:
                reviewer = User.objects.get(id=reviewer_id)
                assignment = ReviewerService.assign_reviewer(
                    proposal=proposal,
                    reviewer=reviewer,
                    stage=serializer.validated_data['stage'],
                    deadline=serializer.validated_data['deadline'],
                    user=request.user
                )
                assignments.append(assignment)
            except User.DoesNotExist:
                errors.append({'reviewer_id': reviewer_id, 'error': 'User not found'})
            except ValueError as e:
                errors.append({'reviewer_id': reviewer_id, 'error': str(e)})
        
        return Response({
            'assigned': ReviewAssignmentSerializer(assignments, many=True).data,
            'errors': errors
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def auto_assign_reviewers(self, request):
        """Automatically assign reviewers based on workload and optional expertise keywords."""
        serializer = AutoAssignReviewersSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        from proposals.models import Proposal

        try:
            proposal = Proposal.objects.get(id=serializer.validated_data['proposal_id'])
        except Proposal.DoesNotExist:
            return Response({'error': 'Proposal not found'}, status=status.HTTP_404_NOT_FOUND)

        assignment_result = ReviewerService.auto_assign_reviewers(
            proposal=proposal,
            stage=serializer.validated_data['stage'],
            deadline=serializer.validated_data['deadline'],
            reviewer_count=serializer.validated_data.get('reviewer_count'),
            expertise_keywords=serializer.validated_data.get('expertise_keywords', []),
            exclude_reviewer_ids=serializer.validated_data.get('exclude_reviewer_ids', []),
            user=request.user,
        )

        return Response({
            'requested_count': assignment_result['requested_count'],
            'assigned_count': assignment_result['assigned_count'],
            'candidates_considered': assignment_result['candidates_considered'],
            'assigned': ReviewAssignmentSerializer(assignment_result['assignments'], many=True).data,
            'skipped_candidates': assignment_result['skipped_candidates'],
            'errors': assignment_result['assignment_errors'],
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def send_notification(self, request, pk=None):
        """Send notification email to reviewer."""
        assignment = self.get_object()
        success = EmailService.send_reviewer_assignment_email(assignment)
        
        if success:
            return Response({'status': 'Notification sent successfully.'})
        return Response(
            {'error': 'Failed to send notification'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def bulk_notify(self, request):
        """Send notifications to multiple reviewers."""
        assignment_ids = request.data.get('assignment_ids', [])
        
        if not assignment_ids:
            return Response(
                {'error': 'No assignment IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignments = ReviewAssignment.objects.filter(
            id__in=assignment_ids,
            notification_sent=False
        )
        
        sent_count = 0
        for assignment in assignments:
            if EmailService.send_reviewer_assignment_email(assignment):
                sent_count += 1
        
        return Response({
            'sent': sent_count,
            'total': len(assignment_ids)
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def set_review_validity(self, request, pk=None):
        """Allow SRC Chair to reject or reinstate a particular submitted reviewer review."""
        assignment = self.get_object()
        serializer = ReviewValidityUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if assignment.status != ReviewAssignment.Status.COMPLETED:
            return Response(
                {'error': 'Only completed reviews can be rejected or reinstated.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        review_validity = serializer.validated_data['review_validity']
        reason = serializer.validated_data.get('chair_rejection_reason', '').strip()

        assignment.review_validity = review_validity
        if review_validity == ReviewAssignment.ReviewValidity.REJECTED:
            assignment.chair_rejection_reason = reason
            assignment.chair_rejected_at = timezone.now()
            assignment.chair_rejected_by = request.user
        else:
            assignment.chair_rejection_reason = ''
            assignment.chair_rejected_at = None
            assignment.chair_rejected_by = None

        assignment.save(update_fields=[
            'review_validity',
            'chair_rejection_reason',
            'chair_rejected_at',
            'chair_rejected_by',
            'updated_at',
        ])

        AuditLog.objects.create(
            user=request.user,
            action_type='REVIEW_VALIDITY_UPDATED',
            proposal=assignment.proposal,
            details={
                'assignment_id': assignment.id,
                'reviewer_id': assignment.reviewer_id,
                'review_validity': review_validity,
                'reason': assignment.chair_rejection_reason,
            }
        )

        return Response(ReviewAssignmentSerializer(assignment).data)
    
    @action(detail=True, methods=['post'])
    def submit_score(self, request, pk=None):
        """Submit Stage 1 or Stage 2 review."""
        assignment = self.get_object()
        
        # Verify reviewer
        if assignment.reviewer != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Not authorized to submit this review'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if assignment.status == ReviewAssignment.Status.COMPLETED:
            return Response(
                {'error': 'Review already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Handle Stage 1
        if assignment.stage == ReviewAssignment.Stage.STAGE_1:
            serializer = Stage1ScoreSerializer(data=request.data)
            if serializer.is_valid():
                # Check if draft already exists
                try:
                    existing = assignment.stage1_score
                    # Update existing
                    for key, value in serializer.validated_data.items():
                        setattr(existing, key, value)
                    existing.save()
                    score = existing
                except Stage1Score.DoesNotExist:
                    score = serializer.save(assignment=assignment)
                
                # If not draft, mark complete
                if not score.is_draft:
                    assignment.status = ReviewAssignment.Status.COMPLETED
                    assignment.save()
                    
                    # Check if all Stage 1 reviews complete
                    ProposalService.check_stage1_completion(assignment.proposal)
                
                return Response(Stage1ScoreSerializer(score).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle Stage 2
        elif assignment.stage == ReviewAssignment.Stage.STAGE_2:
            serializer = Stage2ReviewSerializer(data=request.data)
            if serializer.is_valid():
                try:
                    existing = assignment.stage2_review
                    for key, value in serializer.validated_data.items():
                        setattr(existing, key, value)
                    existing.save()
                    review = existing
                except Stage2Review.DoesNotExist:
                    review = serializer.save(assignment=assignment)
                
                if not review.is_draft:
                    assignment.status = ReviewAssignment.Status.COMPLETED
                    assignment.save()
                
                return Response(Stage2ReviewSerializer(review).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Invalid stage'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def proposal_details(self, request, pk=None):
        """Get full proposal details for review."""
        from proposals.serializers import ProposalSerializer
        
        assignment = self.get_object()
        
        # Verify access
        if assignment.reviewer != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        proposal = assignment.proposal
        proposal_data = ProposalSerializer(proposal).data

        # Include cycle score weights for dynamic scoring UI
        if proposal.cycle and proposal.cycle.score_weights:
            proposal_data['score_weights'] = proposal.cycle.score_weights

        # For Stage 2, include Stage 1 reviews
        if assignment.stage == ReviewAssignment.Stage.STAGE_2:
            stage1_assignments = ReviewAssignment.objects.filter(
                proposal=proposal,
                stage=ReviewAssignment.Stage.STAGE_1,
                status=ReviewAssignment.Status.COMPLETED
            )
            proposal_data['stage1_reviews'] = ReviewAssignmentSerializer(
                stage1_assignments, many=True
            ).data
        
        return Response(proposal_data)
