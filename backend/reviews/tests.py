from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from proposals.models import GrantCycle, Proposal
from reviews.models import ReviewAssignment, ReviewerProfile, Stage1Score
from reviews.serializers import Stage1ScoreSerializer


User = get_user_model()


class ReviewsDomainTests(TestCase):
    def setUp(self):
        reviewer_group, _ = Group.objects.get_or_create(name='Reviewer')

        self.reviewer = User.objects.create_user(
            username='reviewer.user',
            email='reviewer.user@nsu.edu',
            password='StrongPass123!',
            first_name='Reviewer',
            last_name='User',
        )
        self.reviewer.groups.add(reviewer_group)
        self.profile = ReviewerProfile.objects.create(
            user=self.reviewer,
            area_of_expertise='Machine Learning',
            max_review_load=1,
            is_active_reviewer=True,
        )

        self.cycle = GrantCycle.objects.create(
            name='CTRG Cycle',
            year='2025-2026',
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            stage1_review_start_date=date(2025, 2, 1),
            stage1_review_end_date=date(2025, 3, 1),
            stage2_review_start_date=date(2025, 4, 1),
            stage2_review_end_date=date(2025, 5, 1),
        )

        self.proposal = Proposal.objects.create(
            title='Review Target',
            abstract='Proposal for review tests',
            pi_name='PI Name',
            pi_department='CSE',
            pi_email='pi@nsu.edu',
            fund_requested='1500.00',
            cycle=self.cycle,
            status=Proposal.Status.SUBMITTED,
        )

        self.admin_user = User.objects.create_user(
            username='admin.user',
            email='admin.user@nsu.edu',
            password='StrongPass123!',
            is_staff=True,
        )
        self.client = APIClient()

    def test_stage1_score_serializer_rejects_out_of_range_values(self):
        serializer = Stage1ScoreSerializer(data={
            'originality_score': 16,
            'clarity_score': 10,
            'literature_review_score': 10,
            'methodology_score': 10,
            'impact_score': 10,
            'publication_potential_score': 5,
            'budget_appropriateness_score': 5,
            'timeline_practicality_score': 5,
            'narrative_comments': 'Good proposal overall.',
            'is_draft': True,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('originality_score', serializer.errors)

    def test_reviewer_profile_can_accept_review_respects_pending_workload(self):
        assignment = ReviewAssignment.objects.create(
            proposal=self.proposal,
            reviewer=self.reviewer,
            stage=ReviewAssignment.Stage.STAGE_1,
            deadline=timezone.now() + timedelta(days=3),
        )

        self.assertEqual(self.profile.current_review_count(), 1)
        self.assertFalse(self.profile.can_accept_review())

        assignment.status = ReviewAssignment.Status.COMPLETED
        assignment.save()

        self.assertEqual(self.profile.current_review_count(), 0)
        self.assertTrue(self.profile.can_accept_review())

    def test_stage1_score_total_score_property(self):
        assignment = ReviewAssignment.objects.create(
            proposal=self.proposal,
            reviewer=self.reviewer,
            stage=ReviewAssignment.Stage.STAGE_1,
            deadline=timezone.now() + timedelta(days=3),
        )

        score = Stage1Score.objects.create(
            assignment=assignment,
            originality_score=15,
            clarity_score=14,
            literature_review_score=13,
            methodology_score=12,
            impact_score=11,
            publication_potential_score=9,
            budget_appropriateness_score=8,
            timeline_practicality_score=4,
            narrative_comments='Detailed review comments.',
            is_draft=False,
        )

        self.assertEqual(score.total_score, 86)
        self.assertEqual(score.weighted_percentage_score, 86.0)

    def test_stage1_final_submission_requires_recommendation_fields(self):
        serializer = Stage1ScoreSerializer(data={
            'originality_score': 10,
            'clarity_score': 10,
            'literature_review_score': 10,
            'methodology_score': 10,
            'impact_score': 10,
            'publication_potential_score': 8,
            'budget_appropriateness_score': 8,
            'timeline_practicality_score': 4,
            'narrative_comments': 'Final comments',
            'is_draft': False,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('recommendation', serializer.errors)
        self.assertIn('detailed_recommendation', serializer.errors)

    def test_auto_assign_reviewers_endpoint_assigns_reviewers(self):
        second_reviewer = User.objects.create_user(
            username='reviewer.two',
            email='reviewer.two@nsu.edu',
            password='StrongPass123!',
            first_name='Reviewer',
            last_name='Two',
        )
        second_reviewer.groups.add(Group.objects.get(name='Reviewer'))
        ReviewerProfile.objects.create(
            user=second_reviewer,
            area_of_expertise='Data Science',
            max_review_load=2,
            is_active_reviewer=True,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/assignments/auto_assign_reviewers/', {
            'proposal_id': self.proposal.id,
            'stage': 1,
            'deadline': (timezone.now() + timedelta(days=5)).isoformat(),
            'reviewer_count': 2,
            'expertise_keywords': ['machine', 'data'],
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['assigned_count'], 2)
        self.assertEqual(
            ReviewAssignment.objects.filter(
                proposal=self.proposal,
                stage=ReviewAssignment.Stage.STAGE_1
            ).count(),
            2
        )
