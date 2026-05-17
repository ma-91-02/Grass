# Audit Logs

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/SECURITY_ARCHITECTURE.md`

## Used When

- Implementing audit, financial event logs, entity history, exports, security events, or signed events.

## Do Not Use For

- Pure UI display without audit implications.

## Audit Principles

- Audit is append-only.
- Financial audit is mandatory.
- Sensitive mutation fails if audit cannot be written.
- Before/after or source snapshot must be captured.
- Audit records are never edited or deleted.

## What to Audit

- Auth events.
- User/role/permission changes.
- Master data changes.
- Financial drafts/posts/reversals/cancellations.
- Inventory movements.
- Approvals.
- Period close/reopen.
- Exports.
- Security events.

## Audit Fields

- userId.
- action.
- entity.
- entityId.
- beforeJson.
- afterJson.
- diffJson.
- metadataJson.
- ipAddress.
- userAgent.
- requestId.
- createdAt.

## Financial Event Logs

- posting.
- reversal.
- period lock override.
- exchange rate creation.
- opening balances.
- emergency override.

## Signed Events

- payload hash.
- previous hash.
- signature.
- key id.
- createdAt.

## APIs

- `GET /api/audit-logs`
- `GET /api/security/events`
- `GET /api/security/export-logs`
- `GET /api/security/audit-chain/verify`

## Implementation Checklist

- [ ] Define audit action.
- [ ] Capture before/after.
- [ ] Include requestId.
- [ ] Include actor and scope.
- [ ] Fail sensitive transaction if audit fails.

## Acceptance Criteria

- Every sensitive write is traceable.
- Posted financial events have audit chain.
- Audit logs cannot be mutated by normal APIs.
