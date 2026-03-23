"""
Management command to automatically flag proposals whose revision deadline has passed.

Run manually:
    python manage.py check_revision_deadlines

Schedule via cron (recommended daily at 00:05):
    5 0 * * * /path/to/venv/bin/python /path/to/manage.py check_revision_deadlines
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from proposals.models import Proposal
from proposals.services import ProposalService


class Command(BaseCommand):
    help = "Flag proposals whose revision deadline has passed as REVISION_DEADLINE_MISSED."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print which proposals would be flagged without making any changes.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        overdue = Proposal.objects.filter(
            status=Proposal.Status.REVISION_REQUESTED,
            revision_deadline__lt=now,
        )

        if not overdue.exists():
            self.stdout.write(self.style.SUCCESS('No overdue revision deadlines found.'))
            return

        flagged = 0
        skipped = 0

        for proposal in overdue:
            if dry_run:
                self.stdout.write(
                    f'  [DRY RUN] Would flag: {proposal.proposal_code} — '
                    f'deadline was {proposal.revision_deadline:%Y-%m-%d %H:%M}'
                )
                skipped += 1
            else:
                try:
                    changed = ProposalService.mark_revision_deadline_missed(proposal)
                    if changed:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  Flagged: {proposal.proposal_code} — '
                                f'deadline was {proposal.revision_deadline:%Y-%m-%d %H:%M}'
                            )
                        )
                        flagged += 1
                    else:
                        skipped += 1
                except Exception as exc:
                    self.stderr.write(
                        f'  ERROR flagging {proposal.proposal_code}: {exc}'
                    )
                    skipped += 1

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f'Dry run complete. {skipped} proposal(s) would be flagged.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Done. {flagged} flagged, {skipped} skipped/failed.'))
