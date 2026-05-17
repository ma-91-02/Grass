# Error Handling

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/API_STANDARDS.md`
- `docs/architecture/TRANSACTION_RULES.md`

## Used When

- Implementing API errors, posting failures, retries, deadlocks, lock recovery, user-facing errors, internal logs, or recovery workflows.

## Do Not Use For

- Static documentation or purely visual UI changes.

## Error Categories

| Category            |    HTTP |       Retry | Example            |
| ------------------- | ------: | ----------: | ------------------ |
| Validation          | 400/422 |          No | Invalid field      |
| Auth                |     401 | After login | Missing session    |
| Permission          |     403 |          No | Forbidden action   |
| State               |     409 |          No | Invalid transition |
| Lock                |     409 |         Yes | Posting lock held  |
| Period              |     423 |          No | Hard closed period |
| Financial Integrity |     422 |          No | Unbalanced journal |
| Deadlock/Timeout    | 409/503 |         Yes | DB deadlock        |
| System              |     500 |       Maybe | Unexpected failure |

## Posting Failure Flow

```text
pre-validation failure -> reject, no write
transaction failure -> rollback, posting_operation FAILED
after-commit event failure -> financial state committed, outbox retry
```

## Recovery Orchestration

```text
Detect -> Classify -> Isolate Scope -> Notify -> Evidence Snapshot -> Approve Recovery -> Execute Safe Correction -> Reconcile -> Close Incident
```

## Retry Rules

- Allowed:
  - deadlocks.
  - lock timeout if idempotent.
  - outbox publish.
  - export generation.
- Forbidden:
  - permission errors.
  - validation errors.
  - unbalanced journal.
  - period locked.
  - missing approval.

## Distributed Lock Recovery

- Locks must have owner token and TTL.
- Only owner can release lock.
- Stale locks are cleaned by job.
- Repeated lock conflicts create operational alert.

## User-Facing Errors

- Arabic actionable message.
- Include requestId.
- No stack traces.
- Include entity link when possible.
- Financial blockers must explain missing approval, locked period, stock shortage, or currency mismatch.

## Internal Logging

- requestId.
- userId.
- companyId.
- branchId.
- action.
- entity.
- duration.
- errorCode.
- stack trace internally only.
- never log secrets/tokens/passwords.

## Audit

- Financial error during posting.
- Recovery action.
- Override or retry by user.
- Critical invariant failure.
- Distributed lock manual release.

## Implementation Checklist

- [ ] Normalize error code.
- [ ] Define retry behavior.
- [ ] Preserve requestId.
- [ ] Add logs without secrets.
- [ ] Add audit for sensitive failure.

## Acceptance Criteria

- Errors are consistent and actionable.
- Financial failures do not create partial effects.
- Retry behavior is explicit.
- Critical failures escalate.
