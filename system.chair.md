# system.chair Backend Document

## Purpose
`system.chair` represents the SRC Chair (admin) control flow in the backend. This role manages users, cycles, reviewer assignments, decisions, and reporting.

## Where It Lives
- Auth and user administration: `backend/users/views.py`
- Grant cycle and proposal control: `backend/proposals/views.py`
- Assignment and review operations: `backend/reviews/views.py`
- Core business rules: `backend/proposals/services.py`
- Background jobs: `backend/proposals/tasks.py`

## Access Model
- Backend uses DRF token auth.
- Login endpoint is rate-limited and intended to run behind HTTPS in production.
- SRC Chair privileges rely on `IsAdminUser` / `user.is_staff`.
- SRC Chair endpoints require `Authorization: Token <token>`.
- Reviewer accounts can authenticate but cannot mutate proposal records; proposal submission/edit rights are limited to PI users and the SRC Chair.
- Production requires `FILE_ENCRYPTION_KEY` so uploaded proposal documents remain encrypted at rest.

## SRC Chair Backend Responsibilities
1. User governance
- Create users: `POST /api/auth/register/`
- List/manage users: `GET /api/auth/users/`, `GET/PUT/PATCH/DELETE /api/auth/users/<id>/`
- Reviewer onboarding approvals:
  - `GET /api/auth/pending-reviewers/`
  - `POST /api/auth/approve-reviewer/<id>/`
  - `DELETE /api/auth/reject-reviewer/<id>/`

2. Grant cycle governance
- CRUD cycles: `/api/cycles/`
- Active cycles: `GET /api/cycles/active/`
- Cycle statistics: `GET /api/cycles/<id>/statistics/`
- Cycle summary PDF: `GET /api/cycles/<id>/summary_report/`
- Required cycle configuration:
  - `name`
  - `year`
  - `stage2_review_start_date`
  - `stage2_review_end_date`
- Optional cycle configuration:
  - `start_date`
  - `end_date`
  - `stage1_review_start_date`
  - `stage1_review_end_date`
  - `revision_window_days` (default `7`)
  - `acceptance_threshold` (default `70`)
  - `max_reviewers_per_proposal` (default `2`, allowed `1-4`)

3. Proposal oversight
- Full proposal visibility via admin scope in `ProposalViewSet`.
- SRC Chair can create proposal/application records directly when no PI-facing submission role is used.
- View proposal reviews: `GET /api/proposals/<id>/reviews/`
- View flattened Stage 1 reviewer comments for revision handling: `GET /api/proposals/<id>/combined_comments/`
- Download proposal report PDF: `GET /api/proposals/<id>/download_report/`

4. Reviewer assignment orchestration
- Bulk assign reviewers: `POST /api/assignments/assign_reviewers/`
- Send assignment notifications:
  - `POST /api/assignments/<id>/send_notification/`
  - `POST /api/assignments/bulk_notify/`

5. Decision pipeline control
- Stage 1 decision: `POST /api/proposals/<id>/stage1_decision/`
  - Decisions: `REJECT`, `ACCEPT`, `TENTATIVELY_ACCEPT`
- Reopen/extend missed revision window: `POST /api/proposals/<id>/reopen_revision/`
- Mark revision deadline missed: `POST /api/proposals/<id>/mark_revision_missed/`
- Start Stage 2: `POST /api/proposals/<id>/start_stage2/`
- Direct SRC Chair Stage 2 review: `POST /api/proposals/<id>/chair_stage2_review/`
- Final decision: `POST /api/proposals/<id>/final_decision/`
  - Decisions: `ACCEPTED`, `REJECTED`
  - Rejected proposals may store `0.00` approved amount; accepted proposals require a positive amount.

6. Monitoring and audit
- SRC Chair dashboard: `GET /api/dashboard/src_chair/`
- Audit logs: `GET /api/audit-logs/` (with filters)

## System Chain (SRC Chair)
1. SRC Chair logs in (`/api/auth/login/`) and receives token.
2. Creates/activates grant cycle.
3. Verifies reviewers (approve pending reviewer accounts).
4. Monitors submitted proposals.
5. Assigns reviewers for Stage 1.
6. Ensures reviews are submitted.
7. Applies Stage 1 decision:
- `REJECT` -> proposal closes at stage 1.
- `ACCEPT` -> accepted without corrections.
- `TENTATIVELY_ACCEPT` -> revision window starts (`REVISION_REQUESTED`).
8. After PI revision submission, starts Stage 2 (`UNDER_STAGE_2_REVIEW`).
9. Assigns Stage 2 reviewers and/or records a direct SRC Chair Stage 2 review.
10. Monitors revision deadlines, including reopening missed windows when needed.
11. Applies final decision and locks proposal against further PI edits.
12. Exports reports and checks audit trail.

## Status Flow Controlled by SRC Chair
- `SUBMITTED`
- `UNDER_STAGE_1_REVIEW`
- `STAGE_1_REJECTED` OR `ACCEPTED_NO_CORRECTIONS` OR `TENTATIVELY_ACCEPTED`
- `REVISION_REQUESTED` -> `REVISED_PROPOSAL_SUBMITTED`
- `UNDER_STAGE_2_REVIEW`
- `FINAL_ACCEPTED` OR `FINAL_REJECTED`

## Canonical Lifecycle Statuses
- Dashboard and cycle reporting are normalized to the mandatory CTRG lifecycle states:
  - `SUBMITTED`
  - `UNDER_STAGE_1_REVIEW`
  - `STAGE_1_REJECTED`
  - `ACCEPTED_NO_CORRECTIONS`
  - `TENTATIVELY_ACCEPTED`
  - `REVISION_REQUESTED`
  - `REVISED_PROPOSAL_SUBMITTED`
  - `UNDER_STAGE_2_REVIEW`
  - `FINAL_ACCEPTED`
  - `FINAL_REJECTED`
- Operational-only statuses such as `DRAFT` and `REVISION_DEADLINE_MISSED` are not shown as separate lifecycle buckets in dashboard/report status breakdowns.

## Business Rules Enforced
- Assignment validation checks:
  - no duplicate assignment (same proposal/reviewer/stage)
  - reviewer must be active and under workload limit
  - max reviewers per proposal is respected
- Stage 1 decision requires Stage 1 completion.
- PI draft edits are blocked once a proposal leaves `DRAFT`, and all PI mutations are blocked after final lock.
- Final decision rejects invalid state and duplicate final decisions.
- Audit entries are created for proposal lifecycle actions, review actions, login/logout, password changes, reviewer approval/rejection, and user-management actions.

## Background Automation Relevant to SRC Chair
- Periodic revision deadline checks (`check_revision_deadlines`).
- Reminder jobs for pending deadlines/reviews.
- Email notifications for assignments and decisions.

## Dashboard and Reporting Notes
- SRC Chair dashboard exposes:
  - total proposals in the canonical lifecycle
  - proposals in each canonical status
  - pending reviews
  - proposals awaiting chair decision (Stage 1 or final)
  - tentative proposals awaiting revision
- Reviewer dashboard exposes assigned proposals, pending reviews, and submitted reviews.
- PI dashboard surfaces submitted proposals, revision deadlines, and final decisions.
- Cycle summary reports include:
  - total proposals
  - canonical status breakdown
  - Stage 1 acceptance rate
  - final acceptance rate
  - reviewer workloads
- Backup operations must preserve the database, encrypted media files, environment configuration, and `FILE_ENCRYPTION_KEY` together.

## Notes
- This role is the backend authority for operational governance and the full two-stage review lifecycle.
- If desired, this document can be extended with sequence diagrams and endpoint request/response examples.
