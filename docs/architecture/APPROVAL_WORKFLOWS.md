# Approval Workflows

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/STATE_MACHINES.md`
- `docs/users/AUTH_RBAC.md`
- `docs/users/AUDIT_LOGS.md`

## Used When

- Implementing maker/checker, amount thresholds, approval chains, delegation, rejection/rework, emergency override, or posting blocks.

## Do Not Use For

- Simple read-only screens with no approval behavior.

## Goal

Approval workflows enforce internal controls before risky financial, inventory, security, or closing actions are posted.

## Tables

| Table                      | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `approval_policies`        | Conditional policy by document type, branch, amount, or risk |
| `approval_policy_versions` | Immutable policy snapshot                                    |
| `approval_steps`           | Step order and approver rule                                 |
| `approval_requests`        | Approval request per document                                |
| `approval_actions`         | Approve/reject/delegate/escalate history                     |
| `approval_delegations`     | Temporary delegation                                         |
| `approval_sla_events`      | SLA timers and escalation                                    |
| `approval_notifications`   | Notification delivery tracking                               |

## State Machine

```text
NOT_REQUIRED
DRAFT -> SUBMITTED -> PENDING_APPROVAL -> PARTIALLY_APPROVED -> APPROVED
PENDING_APPROVAL -> REJECTED -> REWORK -> SUBMITTED
PENDING_APPROVAL -> EXPIRED -> SUBMITTED
PENDING_APPROVAL -> OVERRIDDEN
```

## Policy Triggers

- Amount above threshold.
- Discount above threshold.
- Credit limit exceeded.
- Negative stock override.
- Manual journal on protected accounts.
- Period reopening.
- Posted document cancellation.
- Full ledger export.
- Privileged permission changes.

## Posting Block

- PostingService must call `ApprovalGuard`.
- If approval is required and document is not APPROVED or OVERRIDDEN, posting is rejected.
- If document hash changed after approval, approval is invalid.
- Expired approval cannot be used for posting.

## Permissions

- `approvals.view`
- `approvals.submit`
- `approvals.approve`
- `approvals.reject`
- `approvals.delegate`
- `approvals.override.emergency`
- `approvalPolicies.manage`

## APIs

- `POST /api/approvals/evaluate`
- `POST /api/approvals/:documentType/:documentId/submit`
- `GET /api/approvals/inbox`
- `POST /api/approvals/:id/actions/approve`
- `POST /api/approvals/:id/actions/reject`
- `POST /api/approvals/:id/actions/rework`
- `POST /api/approvals/:id/actions/escalate`
- `POST /api/approvals/:id/actions/override`
- `POST /api/approval-policies`
- `PATCH /api/approval-policies/:id`

## Security Rules

- Maker cannot approve own document when policy forbids self-approval.
- Delegation is valid only within branch and permission scope.
- Emergency override requires MFA/step-up, reason, privileged permission, and audit.
- Policy changes do not alter existing approval requests; requests use policy version.

## Audit

- Policy create/update/disable.
- Submit, approve, reject, rework, delegate, escalate, override.
- Expiration and SLA escalation.
- Posting blocked due to missing approval.

## Edge Cases

- Approver loses permission: step must be reassigned or escalated.
- Document edited after approval: approval invalidates.
- Approval expires during posting: posting rejects.
- Emergency override used incorrectly: security event and finance review.

## Implementation Checklist

- [ ] Define policy condition.
- [ ] Store policy version.
- [ ] Enforce maker/checker.
- [ ] Block posting until approved.
- [ ] Add SLA/escalation if configured.
- [ ] Add audit and tests.

## Acceptance Criteria

- Risky documents cannot post without approval.
- Approval history is immutable.
- Overrides are privileged and audited.
- Rework invalidates old approval.
