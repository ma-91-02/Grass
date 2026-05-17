# Reliability and Recovery

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/ERROR_HANDLING.md`
- `docs/architecture/TRANSACTION_RULES.md`
- `docs/users/AUDIT_LOGS.md`

## Used When

- Implementing queues, background jobs, retries, reconciliation jobs, integrity checks, backup/restore, monitoring, or failure recovery.

## Do Not Use For

- Normal synchronous UI rendering.

## Goal

Reliability architecture must prevent partial failure from corrupting ledger, inventory, reporting, audit, or approvals.

## Workers

| Worker                  | Purpose                            |
| ----------------------- | ---------------------------------- |
| PostingOutboxWorker     | Publish committed financial events |
| ReportingWorker         | Generate projections and exports   |
| ReconciliationWorker    | Compare ledger, stock, AR/AP, cash |
| IntegrityWorker         | Detect orphan/corruption           |
| ReservationExpiryWorker | Release expired stock reservations |
| ClosingWorker           | Run closing tasks                  |
| NotificationWorker      | Send async notifications           |

## Queue Table

`background_jobs`:

- `id`
- `queueName`
- `jobType`
- `payloadJson`
- `status`
- `attempts`
- `maxAttempts`
- `priority`
- `runAt`
- `lockedBy`
- `lockedUntil`
- `lastError`

## Job States

```text
QUEUED -> RUNNING -> COMPLETED
RUNNING -> RETRYING -> QUEUED
RUNNING -> FAILED -> DEAD_LETTER
```

## Retry Rules

- Retry transient errors.
- Retry deadlocks with backoff.
- Retry outbox publishing.
- Do not retry validation errors.
- Do not auto-create financial corrections.

## Integrity Checks

- Journal balance.
- Source/journal links.
- Stock balance vs movements.
- Valuation layers vs stock.
- AR/AP reports vs ledger.
- Branch due-to/due-from.
- Audit hash chain.

## Self-Healing Allowed

- Rebuild read-model balances.
- Rebuild stock_balances from movements.
- Republish outbox events.
- Refresh report cache.

## Self-Healing Forbidden

- Editing posted journal.
- Creating correction journal automatically.
- Deleting financial orphan.
- Changing exchange snapshot.

## Disaster Recovery

1. Declare incident.
2. Freeze affected posting scope.
3. Preserve evidence snapshot.
4. Restore backup or point-in-time state.
5. Compare posting operations.
6. Run integrity checks.
7. Finance/security sign-off.
8. Resume operations.

## Monitoring Metrics

- posting failure count.
- queue depth.
- dead letter count.
- reconciliation failures.
- backup age.
- DB deadlocks.
- failed logins.
- suspicious postings.

## APIs

- `GET /api/ops/jobs`
- `POST /api/ops/jobs/:id/retry`
- `POST /api/ops/jobs/:id/cancel`
- `GET /api/ops/integrity/results`
- `POST /api/ops/integrity/run`
- `GET /api/ops/metrics`
- `GET /api/system/health`

## Audit

- Manual job retry/cancel.
- Integrity failure.
- Recovery action.
- Freeze/unfreeze.
- Backup/restore administrative action.

## Implementation Checklist

- [ ] Make jobs idempotent.
- [ ] Add dead letter handling.
- [ ] Add integrity checks.
- [ ] Add monitoring metrics.
- [ ] Add audit for manual recovery.

## Acceptance Criteria

- Background jobs do not duplicate financial effects.
- Integrity failures block close when critical.
- Recovery never mutates posted records silently.
- Operational alerts are visible.
