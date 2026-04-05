# Proposal Lifecycle State Machine

## 10 Proposal States
1. `submitted` — PI or SRC Chair has submitted the proposal
2. `under_stage1_review` — Reviewers assigned and reviewing
3. `stage1_rejected` — Rejected after Stage 1
4. `accepted_no_corrections` — Accepted outright after Stage 1 (no revision needed)
5. `tentatively_accepted` — Stage 1 complete, revision required
6. `revision_requested` — PI notified, revision timer started
7. `revised_proposal_submitted` — PI uploaded revised proposal
8. `under_stage2_review` — Stage 2 reviewers evaluating revisions
9. `final_accepted` — Approved after full process
10. `final_rejected` — Rejected after Stage 2 or final decision

## State Transition Table

| Transition Method       | From State(s)                    | To State                   | Who Can Trigger | Guards/Conditions                          | Side Effects                                    |
|------------------------|----------------------------------|----------------------------|-----------------|--------------------------------------------|-------------------------------------------------|
| `assign_reviewers()`   | submitted                        | under_stage1_review        | SRC Chair       | At least 1 reviewer assigned               | Email assigned reviewers                        |
| `reject_stage1()`      | under_stage1_review              | stage1_rejected            | SRC Chair       | All Stage 1 reviews submitted              | Email PI with decision                          |
| `accept_no_correction()` | under_stage1_review            | accepted_no_corrections    | SRC Chair       | All Stage 1 reviews submitted              | Email PI with decision                          |
| `tentatively_accept()` | under_stage1_review              | tentatively_accepted       | SRC Chair       | All Stage 1 reviews submitted              | Email PI with reviewer comments                 |
| `request_revision()`   | tentatively_accepted             | revision_requested         | SRC Chair       | None                                       | Email PI, start revision timer (default 7 days) |
| `submit_revision()`    | revision_requested               | revised_proposal_submitted | PI / SRC Chair  | Revised PDF uploaded                       | Email SRC Chair                                 |
| `begin_stage2_review()`| revised_proposal_submitted       | under_stage2_review        | SRC Chair       | None                                       | Email Stage 2 reviewers                         |
| `final_accept()`       | under_stage2_review, accepted_no_corrections | final_accepted | SRC Chair | Stage 2 reviews complete (if applicable)   | Email PI, lock proposal                         |
| `final_reject()`       | under_stage2_review              | final_rejected             | SRC Chair       | Stage 2 reviews complete                   | Email PI, lock proposal                         |
| `mark_deadline_missed()`| revision_requested              | final_rejected             | System/SRC Chair| Revision deadline passed                   | Email PI, log auto-rejection                    |

## Implementation with django-fsm-2
```python
from django_fsm import FSMField, transition, can_proceed

class Proposal(TimeStampedModel):
    status = FSMField(default='submitted', protected=True)

    @transition(
        field=status,
        source='submitted',
        target='under_stage1_review',
        permission='proposals.can_assign_reviewers',
        conditions=[lambda self: self.review_assignments.count() >= 1]
    )
    def assign_reviewers(self, by_user=None):
        """Transition: submitted → under_stage1_review"""
        self.stage1_review_started_at = timezone.now()
        # Side effect: email reviewers (handled by signal/service)

    @transition(
        field=status,
        source='under_stage1_review',
        target='stage1_rejected',
        permission='proposals.can_make_stage1_decision',
        conditions=[lambda self: self.all_stage1_reviews_complete()]
    )
    def reject_stage1(self, chair_comments='', by_user=None):
        self.stage1_decision_date = timezone.now()
        self.chair_comments_stage1 = chair_comments

    # ... similar for all transitions
```

## Critical Rules
- NEVER assign `proposal.status = 'new_status'` directly — always use transition methods
- Every transition method receives `by_user` parameter for audit logging
- `can_proceed(proposal.assign_reviewers)` checks if transition is valid before showing UI button
- `has_transition_perm(proposal.assign_reviewers, user)` checks permission
- Use `get_available_FIELD_transitions(proposal)` to power the frontend's dynamic action buttons