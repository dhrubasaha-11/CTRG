# API Endpoints

Base URL: `/api/v1/`
All endpoints require JWT authentication unless noted.
Pagination: 20 items per page (max 100). Format: `?page=1&page_size=20`
Error format: `{"detail": "message", "code": "ERROR_CODE"}`

## Authentication
| Method | Endpoint               | Description                    | Auth Required |
|--------|------------------------|--------------------------------|---------------|
| POST   | /auth/login/           | Get access + refresh tokens    | No            |
| POST   | /auth/refresh/         | Refresh access token           | No (refresh token in body) |
| POST   | /auth/logout/          | Blacklist refresh token        | Yes           |
| GET    | /auth/me/              | Get current user profile       | Yes           |
| PATCH  | /auth/me/              | Update own profile             | Yes           |

### POST /auth/login/
Request: `{"username": "string", "password": "string"}`
Response 200: `{"access": "jwt_token", "refresh": "jwt_token", "user": {"id", "username", "email", "role", "full_name"}}`
Response 401: `{"detail": "Invalid credentials", "code": "INVALID_CREDENTIALS"}`

## Grant Cycles (SRC Chair only for CUD)
| Method | Endpoint               | Description                    | Roles         |
|--------|------------------------|--------------------------------|---------------|
| GET    | /cycles/               | List all cycles                | All           |
| POST   | /cycles/               | Create cycle                   | SRC Chair     |
| GET    | /cycles/{id}/          | Get cycle detail               | All           |
| PATCH  | /cycles/{id}/          | Update cycle                   | SRC Chair     |
| DELETE | /cycles/{id}/          | Delete cycle (if no proposals) | SRC Chair     |
| GET    | /cycles/{id}/stats/    | Cycle statistics               | SRC Chair     |

## Proposals
| Method | Endpoint                              | Description                          | Roles         |
|--------|---------------------------------------|--------------------------------------|---------------|
| GET    | /proposals/                           | List proposals (filtered by role)    | All           |
| POST   | /proposals/                           | Create proposal                      | SRC Chair, PI |
| GET    | /proposals/{id}/                      | Get proposal detail                  | Role-filtered |
| PATCH  | /proposals/{id}/                      | Update proposal metadata             | SRC Chair, PI (if editable) |
| DELETE | /proposals/{id}/                      | Delete proposal                      | SRC Chair     |
| GET    | /proposals/{id}/transitions/          | Get available transitions for user   | SRC Chair, PI |
| POST   | /proposals/{id}/transition/           | Execute a state transition           | SRC Chair, PI |
| POST   | /proposals/{id}/upload-revision/      | Upload revised proposal + response   | SRC Chair, PI |
| GET    | /proposals/{id}/files/                | List all files for proposal          | Role-filtered |
| GET    | /proposals/{id}/audit-log/            | Get state transition history         | SRC Chair     |

### POST /proposals/{id}/transition/
Request: `{"transition": "reject_stage1", "comments": "optional comments"}`
Response 200: `{"status": "stage1_rejected", "message": "Transition successful"}`
Response 400: `{"detail": "Transition not allowed", "code": "INVALID_TRANSITION"}`
Response 403: `{"detail": "Permission denied", "code": "PERMISSION_DENIED"}`

### GET /proposals/{id}/transitions/
Response 200: `{"available_transitions": [{"name": "reject_stage1", "label": "Reject", "target": "stage1_rejected"}, ...]}`

## Review Assignments
| Method | Endpoint                                    | Description                     | Roles     |
|--------|---------------------------------------------|---------------------------------|-----------|
| GET    | /proposals/{id}/assignments/                | List assignments for proposal   | SRC Chair |
| POST   | /proposals/{id}/assignments/                | Assign reviewer                 | SRC Chair |
| DELETE | /proposals/{id}/assignments/{assignment_id}/ | Remove assignment              | SRC Chair |
| POST   | /proposals/{id}/assignments/bulk-email/     | Email all assigned reviewers    | SRC Chair |

### POST /proposals/{id}/assignments/
Request: `{"reviewer_id": "uuid", "stage": "stage1", "deadline": "2025-06-01T00:00:00Z"}`
Response 201: `{"id": "uuid", "reviewer": {...}, "stage": "stage1", ...}`
Response 400 (duplicate): `{"detail": "Reviewer already assigned", "code": "DUPLICATE_ASSIGNMENT"}`
Response 400 (overloaded): `{"detail": "Reviewer exceeds max workload", "code": "REVIEWER_OVERLOADED", "current_load": 5, "max_load": 5}`

## Reviews
| Method | Endpoint                              | Description                     | Roles              |
|--------|---------------------------------------|---------------------------------|--------------------|
| GET    | /reviews/my/                          | List my review assignments      | Reviewer           |
| GET    | /reviews/{assignment_id}/             | Get review form (draft or submitted) | Reviewer, SRC Chair |
| PUT    | /reviews/{assignment_id}/             | Save review (draft)             | Reviewer           |
| POST   | /reviews/{assignment_id}/submit/      | Submit final review (locks it)  | Reviewer           |
| GET    | /proposals/{id}/reviews/summary/      | Aggregated review scores        | SRC Chair          |
| GET    | /proposals/{id}/reviews/combined/     | All reviews combined view       | SRC Chair          |

### PUT /reviews/{assignment_id}/ (Save Draft)
Request (Stage 1):
```json
{
  "originality": 12,
  "clarity_rationality": 10,
  "literature_review": 13,
  "methodology": 11,
  "potential_impact": 14,
  "publication_potential": 8,
  "budget_appropriateness": 7,
  "timeframe_practicality": 4,
  "narrative_comments": "The methodology section needs...",
  "recommendation": "tentatively_accept"
}
```

Request (Stage 2):
```json
{
  "concerns_addressed": "partially",
  "recommendation": "accept",
  "revised_score": 82.5,
  "comments": "Most concerns adequately addressed..."
}
```

## Reviewer Management
| Method | Endpoint                    | Description                      | Roles     |
|--------|-----------------------------|----------------------------------|-----------|
| GET    | /reviewers/                 | List all reviewers with workload | SRC Chair |
| POST   | /reviewers/                 | Create reviewer account          | SRC Chair |
| PATCH  | /reviewers/{id}/            | Update reviewer details          | SRC Chair |
| POST   | /reviewers/{id}/toggle-active/ | Activate/deactivate          | SRC Chair |
| GET    | /reviewers/{id}/workload/   | Detailed workload stats          | SRC Chair |
| POST   | /reviewers/send-email/      | Email specific reviewer(s)       | SRC Chair |

## Reports
| Method | Endpoint                              | Description                   | Roles     |
|--------|---------------------------------------|-------------------------------|-----------|
| GET    | /reports/proposal/{id}/pdf/           | Generate proposal report PDF  | SRC Chair |
| GET    | /reports/cycle/{id}/summary/          | Cycle summary statistics      | SRC Chair |
| GET    | /reports/cycle/{id}/summary/pdf/      | Cycle summary PDF             | SRC Chair |
| GET    | /reports/review-template/{assignment_id}/ | Single reviewer template DOCX | SRC Chair, Reviewer |
| GET    | /reports/combined-review/{proposal_id}/ | Combined review report DOCX | SRC Chair |

## Dashboard
| Method | Endpoint                    | Description                      | Roles     |
|--------|-----------------------------|----------------------------------|-----------|
| GET    | /dashboard/src-chair/       | SRC Chair dashboard stats        | SRC Chair |
| GET    | /dashboard/reviewer/        | Reviewer dashboard stats         | Reviewer  |
| GET    | /dashboard/pi/              | PI dashboard stats               | PI        |

### GET /dashboard/src-chair/
Response:
```json
{
  "total_proposals": 45,
  "by_status": {"submitted": 5, "under_stage1_review": 12, ...},
  "pending_reviews": 8,
  "proposals_awaiting_decision": 3,
  "tentative_awaiting_revision": 2,
  "active_cycle": {"id": "uuid", "name": "CTRG 2025-2026"}
}
```