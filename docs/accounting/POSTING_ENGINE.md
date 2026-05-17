# Posting Engine

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/FINANCIAL_INVARIANTS.md`
- `docs/architecture/STATE_MACHINES.md`
- `docs/architecture/TRANSACTION_RULES.md`

## Used When

- Implementing any financial posting, reversal, cancellation, retry, or source-to-ledger workflow.

## Do Not Use For

- Read-only report formatting.
- UI-only screens without mutation.

## Goal

PostingService converts operational documents into balanced, immutable, auditable ledger and inventory effects inside safe transactions.

## Services

- `PostingService`
- `JournalBuilder`
- `LedgerValidator`
- `PostingTransactionManager`
- `PostingLockManager`
- `ReversalService`
- `IntegrityGuard`
- `PostingAuditService`
- `PostingEventPublisher`
- `ReconciliationService`

## Pipeline

1. Receive request.
2. Authenticate and authorize.
3. Validate idempotency key.
4. Acquire posting lock.
5. Load source document.
6. Validate state.
7. Validate fiscal period.
8. Validate approval.
9. Validate currency isolation.
10. Validate account mappings.
11. Build journal draft.
12. Build inventory effects if needed.
13. Run integrity guards.
14. Open transaction.
15. Re-check state inside transaction.
16. Persist journal lines.
17. Persist stock movements if applicable.
18. Update source state.
19. Write audit.
20. Run post-condition checks.
21. Commit.
22. Publish outbox events.

## Posting State

```text
REQUESTED -> LOCK_ACQUIRED -> VALIDATING -> BUILDING_JOURNAL -> PERSISTING -> COMMITTED
VALIDATING -> FAILED_VALIDATION
PERSISTING -> FAILED_ROLLED_BACK -> RETRY_PENDING
COMMITTED -> EVENT_PUBLISH_PENDING -> EVENTS_PUBLISHED
COMMITTED -> REVERSAL_REQUESTED -> REVERSED
```

## Idempotency

- Required for posting and reversal.
- Same key and same hash returns prior result.
- Same key and different hash returns `IDEMPOTENCY_CONFLICT`.
- Retry after commit must never duplicate journals.

## Reversal

- Original posted records are not edited.
- Reversal creates a new journal with debit/credit inverted.
- Reversal keeps original currency and exchange snapshot.
- Stock reversals are separate reverse movements.
- Closed period reversal requires reopening or current-period correction policy.

## APIs

- `POST /api/posting/simulate`
- `POST /api/posting/post`
- `POST /api/posting/reverse`
- `GET /api/posting/operations`
- `GET /api/posting/operations/:id`
- `POST /api/posting/retry`
- `POST /api/posting/reconcile`

## Locks

- Source document lock.
- Fiscal period lock.
- Numbering sequence lock.
- Account lock when needed.
- Stock balance lock when inventory is affected.

## Audit

- Requested by.
- Source snapshot.
- Validations passed/failed.
- Journal draft hash.
- Persisted journal ids.
- Transaction duration.
- Failure reason.

## Edge Cases

- Network failure after commit: client checks operation status.
- Deadlock: limited retry with same idempotency key.
- Missing mapping: reject before transaction.
- Rounding difference: reject unless rounding account configured.

## Implementation Checklist

- [ ] Define source type.
- [ ] Define journal builder.
- [ ] Add state guard.
- [ ] Add idempotency.
- [ ] Add locks.
- [ ] Add audit.
- [ ] Add reversal tests.

## Acceptance Criteria

- Posting is atomic.
- Duplicate retries are safe.
- Reversal never mutates original records.
- Audit trail is complete.
