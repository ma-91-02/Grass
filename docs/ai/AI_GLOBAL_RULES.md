# AI Global Rules

## Required Reading

- This file must be read before every task.

## Used When

- Always.
- Before editing code, schema, APIs, UI, tests, reports, workflows, or documentation.

## Do Not Use For

- Never skip this file.

## Non-Negotiable Rules

- GRASS ERP is Arabic-only and RTL-only for the current phase.
- Ledger-first architecture is mandatory.
- Financial records are immutable after posting.
- Corrections must use reversal or formal correction documents.
- Every financial effect must create balanced journal entries.
- Every inventory effect must create stock movements.
- Currency isolation is mandatory: IQD and USD must not be mixed in one ledger operation.
- Exchange rate snapshots must be stored on documents and never changed retroactively.
- Backend validation is mandatory; UI validation is only for convenience.
- Every sensitive write must create audit logs.
- Every sensitive API must enforce permissions server-side.

## Financial Invariants

- Journal debit total must equal credit total.
- Journal line currency must match journal currency and account currency.
- Posted journals, invoices, vouchers, stock movements, and closing snapshots are immutable.
- AR/AP balances are derived from ledger lines, not manually updated.
- Cash/bank balances are derived from ledger lines, not manually updated.
- Stock balances are derived from stock movements and may only be cached/rebuilt.
- Fiscal period locks must block posting.
- Reversal-only correction is mandatory for posted records.
- Audit logs and signed financial events are append-only.

## Forbidden Patterns

- Do not update balances directly.
- Do not update stock directly.
- Do not mutate posted records.
- Do not create financial writes outside `PostingService`.
- Do not create stock writes outside `InventoryMovementService` or `ValuationEngine`.
- Do not bypass `ApprovalGuard`, `PeriodGuard`, `CurrencyGuard`, or `LedgerValidator`.
- Do not put business logic inside route handlers.
- Do not import Prisma inside UI components.
- Do not create giant services.
- Do not write cross-module mutations.
- Do not duplicate calculations between UI and backend as independent sources of truth.
- Do not trust totals sent by the client.

## Transaction Ownership Rules

- UI components must never open transactions.
- Route handlers must never own business transactions.
- Repositories must never open transactions; they receive `tx`.
- Use cases own normal business transactions.
- `PostingTransactionManager` owns financial posting transactions.
- `ClosingOrchestrator` owns closing task transactions.
- No external calls inside database transactions.
- Use outbox events for after-commit side effects.
- Retryable financial mutations require idempotency keys.

## Audit Rules

- Audit is mandatory for create/update/disable/post/reverse/cancel/approve/export/security actions.
- Audit must include actor, entity, action, before/after or snapshot, requestId, IP/userAgent when available.
- Financial audit failure must fail the transaction.
- Audit records must not be edited or deleted.

## Permission Rules

- Frontend hiding is not security.
- Every API must check auth, session trust, permission, and branch scope when applicable.
- A user must not grant permissions they do not own unless super admin policy allows it.
- Maker/checker separation must be enforced where approval policies require it.

## RTL and UX Rules

- UI must be Arabic and RTL.
- ERP screens should be dense, clear, and accountant-friendly.
- Financial amounts must show currency clearly.
- Loading, empty, error, and success states are required.

## Testing Rules

- Financial mutations require tests.
- Posting requires invariant tests.
- Inventory changes require movement and balance tests.
- Permission-sensitive APIs require authorization tests.
- Reversal and rollback paths must be tested.

## Definition of Done

- Required context files were read.
- State transition is documented and enforced.
- Zod validation exists.
- Backend business validation exists.
- Permissions are enforced server-side.
- Transaction boundary is correct.
- Audit is written.
- Ledger/stock invariants are preserved.
- Tests cover success, failure, and forbidden paths.

## Implementation Checklist

- [ ] Confirm module boundary.
- [ ] Confirm source of truth.
- [ ] Confirm transaction owner.
- [ ] Confirm permissions.
- [ ] Confirm audit.
- [ ] Confirm tests.

## Acceptance Criteria

- No direct balance or stock updates.
- No mutable posted records.
- No business logic in routes.
- No UI Prisma usage.
- Financial and inventory invariants remain intact.
