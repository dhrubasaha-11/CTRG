from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from rest_framework.test import APIClient

from proposals.models import AuditLog, GrantCycle, Proposal, Keyword
from proposals.serializers import GrantCycleSerializer, ProposalSerializer, FinalDecisionCreateSerializer
from proposals.services import ProposalService
from reviews.models import ReviewAssignment, ReviewerProfile, Stage1Score, Stage2Review


User = get_user_model()


class ProposalModelAndServiceTests(TestCase):
    def setUp(self):
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

    def _create_proposal(self, title):
        proposal = Proposal.objects.create(
            title=title,
            abstract='Test abstract',
            pi_name='PI Name',
            pi_department='CSE',
            pi_email='pi@nsu.edu',
            fund_requested='1000.00',
            cycle=self.cycle,
        )
        keyword, _ = Keyword.objects.get_or_create(name='Testing', normalized_name='testing')
        proposal.keywords.add(keyword)
        return proposal

    def test_proposal_code_auto_generates_and_increments(self):
        proposal_1 = self._create_proposal('Proposal One')
        proposal_2 = self._create_proposal('Proposal Two')

        self.assertTrue(proposal_1.proposal_code.startswith('CTRG-2025-'))
        self.assertTrue(proposal_2.proposal_code.startswith('CTRG-2025-'))
        self.assertNotEqual(proposal_1.proposal_code, proposal_2.proposal_code)

    def test_submit_proposal_updates_status_and_creates_audit_log(self):
        proposal = self._create_proposal('Submission Test')

        ProposalService.submit_proposal(proposal)
        proposal.refresh_from_db()

        self.assertEqual(proposal.status, Proposal.Status.SUBMITTED)
        self.assertIsNotNone(proposal.submitted_at)
        self.assertTrue(
            AuditLog.objects.filter(
                proposal=proposal,
                action_type='PROPOSAL_SUBMITTED',
            ).exists()
        )

    def test_is_revision_overdue_is_true_for_past_deadline(self):
        proposal = self._create_proposal('Deadline Test')
        proposal.status = Proposal.Status.REVISION_REQUESTED
        proposal.revision_deadline = timezone.now() - timedelta(days=1)
        proposal.save()

        self.assertTrue(proposal.is_revision_overdue)


class ProposalSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='pi.user',
            email='pi.user@nsu.edu',
            password='StrongPass123!',
            first_name='PI',
            last_name='User',
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

    def test_serializer_autofills_pi_fields_from_authenticated_user(self):
        request = APIRequestFactory().post('/api/proposals/')
        request.user = self.user

        serializer = ProposalSerializer(
            data={
                'title': 'Serializer Test',
                'abstract': 'Serializer test abstract',
                'fund_requested': '2500.00',
                'cycle': self.cycle.id,
            },
            context={'request': request},
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        proposal = serializer.save()

        self.assertEqual(proposal.pi_email, 'pi.user@nsu.edu')
        self.assertEqual(proposal.pi_name, 'PI User')
        self.assertEqual(proposal.pi_department, 'Not Specified')


class GrantCycleSerializerValidationTests(TestCase):
    def test_stage2_cannot_start_before_stage1_ends(self):
        serializer = GrantCycleSerializer(data={
            'name': 'CTRG Validation Cycle',
            'year': '2026-2027',
            'start_date': '2026-01-01',
            'end_date': '2026-12-31',
            'stage1_review_start_date': '2026-02-01',
            'stage1_review_end_date': '2026-03-10',
            'stage2_review_start_date': '2026-03-01',
            'stage2_review_end_date': '2026-04-01',
            'revision_window_days': 7,
            'acceptance_threshold': '70.00',
            'max_reviewers_per_proposal': 2,
            'is_active': True,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('stage2_review_start_date', serializer.errors)

    def test_optional_stage_dates_accept_empty_strings(self):
        serializer = GrantCycleSerializer(data={
            'name': 'CTRG Optional Dates Cycle',
            'year': '2026-2027',
            'start_date': '',
            'end_date': '',
            'stage1_review_start_date': '',
            'stage1_review_end_date': '',
            'stage2_review_start_date': '2026-04-01',
            'stage2_review_end_date': '2026-04-15',
            'revision_window_days': 7,
            'acceptance_threshold': '70.00',
            'max_reviewers_per_proposal': 2,
            'is_active': True,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_stage2_dates_are_required(self):
        serializer = GrantCycleSerializer(data={
            'name': 'CTRG Missing Stage 2',
            'year': '2026-2027',
            'start_date': '',
            'end_date': '',
            'stage1_review_start_date': '',
            'stage1_review_end_date': '',
            'stage2_review_start_date': '',
            'stage2_review_end_date': '',
            'revision_window_days': 7,
            'acceptance_threshold': '70.00',
            'max_reviewers_per_proposal': 2,
            'is_active': True,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('stage2_review_start_date', serializer.errors)


class ProposalAccessPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.pi_group, _ = Group.objects.get_or_create(name='PI')
        self.reviewer_group, _ = Group.objects.get_or_create(name='Reviewer')
        self.src_chair_group, _ = Group.objects.get_or_create(name='SRC_Chair')

        self.pi_user = User.objects.create_user(
            username='pi.owner',
            email='pi.owner@nsu.edu',
            password='StrongPass123!',
            first_name='PI',
            last_name='Owner',
        )
        self.pi_user.groups.add(self.pi_group)

        self.reviewer_user = User.objects.create_user(
            username='reviewer.only',
            email='reviewer.only@nsu.edu',
            password='StrongPass123!',
            first_name='Review',
            last_name='Only',
        )
        self.reviewer_user.groups.add(self.reviewer_group)
        ReviewerProfile.objects.create(user=self.reviewer_user, area_of_expertise='Testing')

        self.src_chair = User.objects.create_user(
            username='src.chair',
            email='src.chair@nsu.edu',
            password='StrongPass123!',
            is_staff=True,
        )
        self.src_chair.groups.add(self.src_chair_group)

        self.cycle = GrantCycle.objects.create(
            name='CTRG Access Cycle',
            year='2025-2026',
            stage2_review_start_date=date(2025, 4, 1),
            stage2_review_end_date=date(2025, 5, 1),
        )
        self.proposal = Proposal.objects.create(
            title='Protected Proposal',
            abstract='Confidential abstract',
            pi_name='PI Owner',
            pi_department='CSE',
            pi_email=self.pi_user.email,
            fund_requested='1000.00',
            cycle=self.cycle,
            created_by=self.pi_user,
        )
        keyword, _ = Keyword.objects.get_or_create(name='Security', normalized_name='security')
        self.proposal.keywords.add(keyword)
        ReviewAssignment.objects.create(
            proposal=self.proposal,
            reviewer=self.reviewer_user,
            stage=ReviewAssignment.Stage.STAGE_1,
            deadline=timezone.now() + timedelta(days=7),
        )

    def test_reviewer_cannot_create_proposal(self):
        self.client.force_authenticate(user=self.reviewer_user)
        response = self.client.post('/api/proposals/', {
            'title': 'Unauthorized Proposal',
            'abstract': 'Should fail',
            'fund_requested': '500.00',
            'cycle': self.cycle.id,
        })

        self.assertEqual(response.status_code, 403)

    def test_reviewer_can_view_assigned_proposal_but_cannot_edit_it(self):
        self.client.force_authenticate(user=self.reviewer_user)

        get_response = self.client.get(f'/api/proposals/{self.proposal.id}/')
        patch_response = self.client.patch(
            f'/api/proposals/{self.proposal.id}/',
            {'title': 'Tampered Title'},
            format='json',
        )

        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(patch_response.status_code, 403)

    def test_pi_cannot_edit_submitted_or_locked_proposal(self):
        self.client.force_authenticate(user=self.pi_user)

        self.proposal.status = Proposal.Status.SUBMITTED
        self.proposal.save(update_fields=['status'])
        submitted_response = self.client.patch(
            f'/api/proposals/{self.proposal.id}/',
            {'title': 'Edited After Submission'},
            format='json',
        )

        self.proposal.is_locked = True
        self.proposal.save(update_fields=['is_locked'])
        locked_response = self.client.patch(
            f'/api/proposals/{self.proposal.id}/',
            {'title': 'Edited After Lock'},
            format='json',
        )

        self.assertEqual(submitted_response.status_code, 403)
        self.assertEqual(locked_response.status_code, 403)

    def test_reviewer_cannot_access_full_review_bundle_for_assigned_proposal(self):
        self.client.force_authenticate(user=self.reviewer_user)
        response = self.client.get(f'/api/proposals/{self.proposal.id}/reviews/')

        self.assertEqual(response.status_code, 403)

    def test_src_chair_can_create_proposal_without_pi_role(self):
        self.client.force_authenticate(user=self.src_chair)
        response = self.client.post('/api/proposals/', {
            'title': 'Chair Created Proposal',
            'abstract': 'Created by chair',
            'pi_name': 'Faculty Applicant',
            'pi_department': 'EEE',
            'pi_email': 'faculty.applicant@nsu.edu',
            'fund_requested': '2500.00',
            'cycle': self.cycle.id,
            'keywords_input': 'energy, hardware',
        })

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['created_by_email'], self.src_chair.email)


class RevisionAndFinalDecisionSerializerTests(TestCase):
    def test_final_rejection_allows_zero_approved_amount(self):
        serializer = FinalDecisionCreateSerializer(data={
            'decision': 'REJECTED',
            'approved_grant_amount': '0.00',
            'final_remarks': 'Rejected after Stage 2 review.',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_final_acceptance_requires_positive_approved_amount(self):
        serializer = FinalDecisionCreateSerializer(data={
            'decision': 'ACCEPTED',
            'approved_grant_amount': '0.00',
            'final_remarks': 'Accepted.',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('approved_grant_amount', serializer.errors)


class DashboardEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.pi_group, _ = Group.objects.get_or_create(name='PI')
        self.reviewer_group, _ = Group.objects.get_or_create(name='Reviewer')

        self.admin_user = User.objects.create_user(
            username='dashboard.admin',
            email='dashboard.admin@nsu.edu',
            password='StrongPass123!',
            is_staff=True,
        )
        self.pi_user = User.objects.create_user(
            username='dashboard.pi',
            email='dashboard.pi@nsu.edu',
            password='StrongPass123!',
        )
        self.pi_user.groups.add(self.pi_group)
        self.reviewer_user = User.objects.create_user(
            username='dashboard.reviewer',
            email='dashboard.reviewer@nsu.edu',
            password='StrongPass123!',
        )
        self.reviewer_user.groups.add(self.reviewer_group)
        ReviewerProfile.objects.create(user=self.reviewer_user, area_of_expertise='Testing')

        self.cycle = GrantCycle.objects.create(
            name='CTRG Dashboard Cycle',
            year='2025-2026',
            stage2_review_start_date=date(2025, 4, 1),
            stage2_review_end_date=date(2025, 5, 1),
        )

    def _proposal(self, title, status):
        return Proposal.objects.create(
            title=title,
            abstract='Dashboard test abstract',
            pi_name='PI User',
            pi_department='CSE',
            pi_email=self.pi_user.email,
            fund_requested='1000.00',
            cycle=self.cycle,
            status=status,
            created_by=self.pi_user,
        )

    def test_src_chair_dashboard_uses_canonical_status_breakdown(self):
        submitted = self._proposal('Submitted', Proposal.Status.SUBMITTED)
        under_stage1 = self._proposal('Stage 1', Proposal.Status.UNDER_STAGE_1_REVIEW)
        self._proposal('Stage 1 Rejected', Proposal.Status.STAGE_1_REJECTED)
        self._proposal('Accepted', Proposal.Status.ACCEPTED_NO_CORRECTIONS)
        self._proposal('Tentative', Proposal.Status.TENTATIVELY_ACCEPTED)
        self._proposal('Revision Requested', Proposal.Status.REVISION_REQUESTED)
        self._proposal('Revision Missed', Proposal.Status.REVISION_DEADLINE_MISSED)
        self._proposal('Revised Submitted', Proposal.Status.REVISED_PROPOSAL_SUBMITTED)
        under_stage2 = self._proposal('Stage 2', Proposal.Status.UNDER_STAGE_2_REVIEW)
        self._proposal('Final Accepted', Proposal.Status.FINAL_ACCEPTED)
        self._proposal('Final Rejected', Proposal.Status.FINAL_REJECTED)
        self._proposal('Draft', Proposal.Status.DRAFT)

        stage1_assignment = ReviewAssignment.objects.create(
            proposal=under_stage1,
            reviewer=self.reviewer_user,
            stage=ReviewAssignment.Stage.STAGE_1,
            deadline=timezone.now() + timedelta(days=5),
            status=ReviewAssignment.Status.COMPLETED,
        )
        Stage1Score.objects.create(
            assignment=stage1_assignment,
            originality_score=10,
            clarity_score=10,
            literature_review_score=10,
            methodology_score=10,
            impact_score=10,
            publication_potential_score=8,
            budget_appropriateness_score=8,
            timeline_practicality_score=4,
            narrative_comments='Ready for decision',
            recommendation='ACCEPT',
            detailed_recommendation='Ready for decision',
            is_draft=False,
        )

        stage2_assignment = ReviewAssignment.objects.create(
            proposal=under_stage2,
            reviewer=self.reviewer_user,
            stage=ReviewAssignment.Stage.STAGE_2,
            deadline=timezone.now() + timedelta(days=5),
            status=ReviewAssignment.Status.COMPLETED,
        )
        Stage2Review.objects.create(
            assignment=stage2_assignment,
            proposal=under_stage2,
            reviewed_by=self.reviewer_user,
            concerns_addressed='YES',
            revised_recommendation='ACCEPT',
            technical_comments='Resolved',
            budget_comments='',
            is_draft=False,
        )

        ReviewAssignment.objects.create(
            proposal=submitted,
            reviewer=self.reviewer_user,
            stage=ReviewAssignment.Stage.STAGE_1,
            deadline=timezone.now() + timedelta(days=5),
            status=ReviewAssignment.Status.PENDING,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/dashboard/src_chair/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total_proposals'], 11)
        self.assertNotIn('DRAFT', response.data['status_breakdown'])
        self.assertNotIn('REVISION_DEADLINE_MISSED', response.data['status_breakdown'])
        self.assertEqual(response.data['status_breakdown']['REVISION_REQUESTED'], 2)
        self.assertEqual(response.data['pending_reviews'], 1)
        self.assertEqual(response.data['awaiting_decision'], 2)
        self.assertEqual(response.data['awaiting_revision'], 2)

    def test_pi_dashboard_returns_required_summary_fields(self):
        self._proposal('Submitted', Proposal.Status.SUBMITTED)
        final_accepted = self._proposal('Final Accepted', Proposal.Status.FINAL_ACCEPTED)
        deadline_proposal = self._proposal('Revision Requested', Proposal.Status.REVISION_REQUESTED)
        deadline_proposal.revision_deadline = timezone.now() + timedelta(days=2)
        deadline_proposal.save(update_fields=['revision_deadline'])
        self._proposal('Draft', Proposal.Status.DRAFT)

        self.client.force_authenticate(user=self.pi_user)
        response = self.client.get('/api/dashboard/pi/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['submitted_proposals'], 3)
        self.assertEqual(response.data['revision_deadlines'], 1)
        self.assertEqual(response.data['final_decisions'], 1)
