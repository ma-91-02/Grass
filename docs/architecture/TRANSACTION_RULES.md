# Transaction Rules

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`

## Used When

- Implementing mutations, posting, inventory movements, approvals, closing, retries, or background workers.

## Do Not Use For

- Static UI-only work with no mutation.

## Ownership Matrix

| Operation | Transaction Owner |
|---|---|
| Sales posting | PostingTransactionManager |
| Purchase posting | PostingTransactionManager |
| Voucher posting | PostingTransactionManager |
| Manual journal posting | PostingTransactionManager |
| Financial reversal | ReversalService via PostingTransactionManager |
| Stock adjustment with financial impact | PostingTransactionManager |
| Non-financial inventory draft | Inventory use case |
| Approval action | Approval use case |
| Period close task | ClosingOrchestrator |
| Report export | Report job use case |

## Forbidden

- UI opening transactions.
- Routes owning business transactions.
- Repositories opening transactions.
- Nested transactions.
- External network/file/email calls inside transactions.

## Lifecycle

1. Validate auth and permission.
2. Validate input.
3. Acquire logical lock.
4. Open DB transaction.
5. Re-read source with row lock.
6. Re-run critical guards.
7. Persist writes.
8. Write audit.
9. Run post-condition checks.
10. Commit.
11. Publish outbox events after commit.

## Lock Order

1. Period.
2. Branch.
3. Source document.
4. Numbering sequence.
5. Accounts sorted by id.
6. Stock balances sorted by product/warehouse.
7. Valuation layers sorted.

## Rollback Rules

- Validation failure before transaction: no write.
- Failure inside transaction: rollback all.
- Failure after commit: no financial rollback; outbox retry.
- Reconciliation failure: no mutation without approved correction.

## Idempotency

- Required for posting, reversal, closing, payments, and exports.
- Same key and same hash returns same result.
- Same key and different hash returns `IDEMPOTENCY_CONFLICT`.
- Retry after commit must not duplicate journal entries.

## Implementation Checklist

- [ ] Identify transaction owner.
- [ ] Define locks.
- [ ] Define idempotency requirement.
- [ ] Avoid external calls inside transaction.
- [ ] Add rollback tests.

## Acceptance Criteria

- No partial financial or inventory effects.
- Duplicate requests are safe.
- Deadlocks retry safely.
- Outbox handles after-commit side effects.
