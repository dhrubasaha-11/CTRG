# Permission Matrix

## Role Definitions
- **SRC Chair (src_chair):** Full control. Can do everything.
- **Reviewer (reviewer):** Can only see and review assigned proposals.
- **PI (pi):** Can submit proposals, view own proposal status, upload revisions. (Optional role — SRC Chair can create proposals on behalf of PI)

## Resource × Action × Role Matrix

### Proposals
| Action                        | SRC Chair | Reviewer | PI        |
|-------------------------------|-----------|----------|-----------|
| Create proposal               | ✅        | ❌       | ✅ (own)  |
| View all proposals            | ✅        | ❌       | ❌        |
| View own proposals            | ✅        | ❌       | ✅        |
| View assigned proposals       | ✅        | ✅       | ❌        |
| Edit proposal metadata        | ✅        | ❌       | ✅ (own, if status=submitted) |
| Upload proposal files         | ✅        | ❌       | ✅ (own)  |
| Upload revised proposal       | ✅        | ❌       | ✅ (own, if status=revision_requested) |
| Delete proposal               | ✅        | ❌       | ❌        |
| Trigger state transitions     | ✅        | ❌       | ✅ (submit_revision only) |
| View available transitions    | ✅        | ❌       | ✅ (own)  |

### Reviews
| Action                        | SRC Chair | Reviewer | PI        |
|-------------------------------|-----------|----------|-----------|
| Assign reviewers              | ✅        | ❌       | ❌        |
| View all reviews              | ✅        | ❌       | ❌        |
| View own reviews              | ✅        | ✅       | ❌        |
| Submit Stage 1 review         | ❌        | ✅ (assigned) | ❌   |
| Submit Stage 2 review         | ✅        | ✅ (assigned) | ❌   |
| Save review draft             | ❌        | ✅ (assigned) | ❌   |
| View review scores (PI view)  | ❌        | ❌       | ✅ (own proposals, after decision) |

### Grant Cycles
| Action                        | SRC Chair | Reviewer | PI        |
|-------------------------------|-----------|----------|-----------|
| Create cycle                  | ✅        | ❌       | ❌        |
| Edit cycle                    | ✅        | ❌       | ❌        |
| View cycles                   | ✅        | ✅       | ✅        |
| Delete cycle                  | ✅        | ❌       | ❌        |

### Reviewers (user management)
| Action                        | SRC Chair | Reviewer | PI        |
|-------------------------------|-----------|----------|-----------|
| Add/edit reviewer             | ✅        | ❌       | ❌        |
| Activate/deactivate reviewer  | ✅        | ❌       | ❌        |
| View reviewer workload        | ✅        | ❌       | ❌        |

### Reports
| Action                        | SRC Chair | Reviewer | PI        |
|-------------------------------|-----------|----------|-----------|
| Generate proposal report      | ✅        | ❌       | ❌        |
| Generate cycle summary        | ✅        | ❌       | ❌        |
| Generate reviewer template    | ✅        | ✅ (own) | ❌        |
| View combined review report   | ✅        | ❌       | ❌        |

## Data-Level Access Rules
- PI sees ONLY proposals where `created_by=current_user` OR `pi_email=current_user.email`
- Reviewer sees ONLY proposals where they have an active `ReviewAssignment`
- SRC Chair sees ALL proposals, ALL reviews, ALL data
- Reviewer comments are NEVER shown to PI until SRC Chair makes a decision
- After Stage 1 decision, PI sees aggregated scores and anonymized comments (no reviewer names)

## DRF Permission Classes
```python
# common/permissions.py
class IsSRCChair(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'src_chair'

class IsReviewer(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'reviewer'

class IsPI(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'pi'

class IsProposalOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.created_by == request.user or obj.pi_email == request.user.email

class IsAssignedReviewer(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.review_assignments.filter(reviewer=request.user, is_active=True).exists()
```