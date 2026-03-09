from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from proposals.models import AuditLog, GrantCycle, Proposal, Keyword
from proposals.serializers import GrantCycleSerializer, ProposalSerializer
from proposals.services import ProposalService


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
            'start_date': '2026-01-01',
            'end_date': '2026-12-31',
            'stage1_review_start_date': '',
            'stage1_review_end_date': '',
            'stage2_review_start_date': '',
            'stage2_review_end_date': '',
            'revision_window_days': 7,
            'acceptance_threshold': '70.00',
            'max_reviewers_per_proposal': 2,
            'is_active': True,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
