# Week 2 MVP Backend Implementation Report

## Objective
Transform the architecture into a functional MVP backend by implementing core APIs and enabling end-to-end workflows for authentication, cycle management, submission, reviewer operations, assignment, and Stage 1 review.

## 1) Authentication
Implemented:
- `POST /api/auth/login/`
  - Returns `access`, `role`, `user`, and `redirect_to`.
- `GET /api/auth/validate-token/` (new)
  - Validates token and returns:
    - `valid: true`
    - `role`
    - `redirect_to` (`/admin/dashboard`, `/reviewer/dashboard`, `/pi/dashboard`, or `/unauthorized`)
    - `user`
- `GET /api/auth/user/`
  - Returns current authenticated user profile.

Workflow enabled:
- Login with token issuance.
- Server-side role resolution from group membership.
- Token validation for session restore.
- Role-based redirect decision from backend metadata.

## 2) Grant Cycle Management
Implemented:
- `GET /api/cycles/`
- `POST /api/cycles/`
- `GET /api/cycles/{id}/`
- `PUT/PATCH /api/cycles/{id}/`
- `GET /api/cycles/active/`

Validation hardening added:
- Cycle start/end date ordering.
- Stage 1 and Stage 2 window ordering.
- Stage 2 cannot start before Stage 1 ends.
- Stage windows must fit within cycle window.
- `acceptance_threshold` constrained to `0..100`.
- `max_reviewers_per_proposal` constrained to `1..4`.
- `revision_window_days >= 1`.

## 3) Proposal Submission
Implemented:
- `POST /api/proposals/` (draft create with file upload support)
- `POST /api/proposals/{id}/submit/` (draft -> submitted)
- `POST /api/proposals/{id}/submit_revision/` (revision files + status transition)

Workflow enabled:
- Draft proposal creation.
- File-based submission.
- Controlled status transition from draft to submitted.
- Revision submission path for tentative acceptance cycle.

## 4) Reviewer Management
Implemented:
- `GET /api/reviewers/`
- `GET /api/reviewers/workloads/`
- `GET /api/reviewers/my_profile/`
- `PATCH /api/reviewers/{id}/`

Supporting auth/admin reviewer APIs already available:
- Reviewer registration and approval lifecycle.
- Admin listing and management of users/reviewers.

## 5) Reviewer Assignment (Manual + Automated)
Manual assignment:
- `POST /api/assignments/assign_reviewers/`

Automated assignment (new):
- `POST /api/assignments/auto_assign_reviewers/`
  - Inputs:
    - `proposal_id`
    - `stage` (1 or 2)
    - `deadline`
    - optional `reviewer_count`
    - optional `expertise_keywords`
    - optional `exclude_reviewer_ids`
  - Logic:
    - Filters active reviewer profiles.
    - Checks assignment validity (duplicate/workload/stage/state constraints).
    - Ranks by expertise-keyword match + workload ratio.
    - Assigns up to cycle max reviewer limit.
  - Output includes:
    - assigned list
    - assigned count
    - skipped candidate reasons
    - assignment errors

Stage constraints enforced:
- Stage 1 assignment allowed only for submitted/Stage 1 review proposals.
- Stage 2 assignment allowed only after revision submission/Stage 2 review status.

## 6) Stage 1 Review Workflow
Implemented:
- `POST /api/assignments/{id}/submit_score/`
  - Draft save (`is_draft=true`)
  - Final submit (`is_draft=false`)

Enhancements added:
- Stage 1 score now includes:
  - `recommendation` (`ACCEPT`, `TENTATIVELY_ACCEPT`, `REJECT`)
  - `detailed_recommendation`
  - `weighted_percentage_score`
- Final submission validation now requires:
  - `narrative_comments`
  - `recommendation`
  - `detailed_recommendation`

Reporting support:
- Combined review PDF now includes:
  - weighted score row
  - reviewer recommendation
  - detailed recommendation text

## Data/Migration Changes
Added migration:
- `backend/reviews/migrations/0007_stage1score_recommendation_fields.py`
  - Adds `recommendation` and `detailed_recommendation` to `Stage1Score`.

## Tests Added/Updated
Added tests for:
- Token validation endpoint and redirect path logic.
- Grant cycle date validation rules.
- Stage 1 final submission recommendation requirements.
- Automated reviewer assignment endpoint.
- Weighted Stage 1 score property expectation.

## Verification
Executed:
- Python syntax validation via `py_compile` for modified backend files.
- Frontend production build (`tsc -b && vite build`) completed successfully.

Note:
- Django runtime tests were not executed in this environment because Django is not installed in the active Python interpreter.
