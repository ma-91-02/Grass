# Database Constraints

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/FINANCIAL_INVARIANTS.md`

## Used When

- Changing Prisma schema.
- Adding tables, indexes, foreign keys, constraints, soft delete, or archival behavior.

## Do Not Use For

- UI-only tasks.

## Constraint Principles

- Database constraints are the last line of defense.
- Financial records must not be hard deleted.
- Posted records must be immutable by service and, where possible, DB policy.
- Balances are derived/cached, not source-of-truth mutations.
- Stock movements are append-only after creation.

## Unique Constraints

| Table | Constraint | Purpose |
|---|---|---|
| users | email | One login identity |
| permissions | key | Stable permission checks |
| accounts | companyId + code | Stable chart of accounts |
| journal_entries | companyId + entryNumber | Unique journal number |
| posting_operations | operation scope + idempotencyKey | Safe retry |
| customers | companyId + code | Stable customer identity |
| suppliers | companyId + code | Stable supplier identity |
| products | companyId + code | Stable product identity |
| warehouses | companyId + code | Stable warehouse identity |
| stock_balances | productId + warehouseId | One current balance |
| customer_accounts | customerId + currency | Currency-isolated AR |
| supplier_accounts | supplierId + currency | Currency-isolated AP |
| sales_invoices | companyId + branchId + number | Stable invoice numbering |
| purchase_invoices | companyId + branchId + number | Stable purchase numbering |

## Foreign Key Rules

- `journal_lines.accountId -> accounts.id`: restrict.
- `stock_movements.productId -> products.id`: restrict.
- `stock_movements.warehouseId -> warehouses.id`: restrict.
- `payment_accounts.accountId -> accounts.id`: restrict.
- `customer_accounts.accountId -> accounts.id`: restrict.
- `supplier_accounts.accountId -> accounts.id`: restrict.
- Draft child lines may cascade before posting only.
- Posted child lines must be protected by state guards.

## Immutable Fields

- Posted financial documents:
  - date, number, currency, exchangeRateSnapshot, totals, account links.
- Journal lines:
  - accountId, debit, credit, currency.
- Stock movements:
  - productId, warehouseId, quantity, type, source links.
- Audit logs:
  - all fields.
- Closing snapshots:
  - all financial and inventory values.

## Soft Delete Rules

- Customers, suppliers, products, warehouses, users: disable/soft delete.
- Financial documents: cancel/reverse only.
- Accounts with activity: disable only.
- Audit logs: never delete.

## Indexing Strategy

| Query | Index |
|---|---|
| Account statement | journal_lines(accountId, currency, createdAt, id) |
| Customer ledger | journal_lines(partnerType, partnerId, currency, createdAt) |
| Stock card | stock_movements(productId, warehouseId, movementDate, id) |
| Sales list | sales_invoices(companyId, branchId, status, date) |
| Purchases list | purchase_invoices(companyId, branchId, status, date) |
| Audit trace | audit_logs(entity, entityId, createdAt) |
| Jobs | background_jobs(queueName, status, runAt, priority) |

## Financial Protection Constraints

- debit and credit are non-negative.
- one of debit/credit must be positive.
- debit and credit cannot both be positive in the same line.
- journal must balance before posting.
- line currency must match account currency.
- source document must not post twice.

## Inventory Protection Constraints

- movement quantity > 0.
- transfer source and destination warehouses must differ.
- reservation quantity > 0.
- active reservation cannot exceed available stock.
- stock balance is unique per product/warehouse.

## Implementation Checklist

- [ ] Define unique constraints.
- [ ] Define FK behavior.
- [ ] Protect posted records.
- [ ] Add indexes for expected queries.
- [ ] Add migration-safe defaults.
- [ ] Add tests for constraints.

## Acceptance Criteria

- Schema prevents duplicate source-of-truth records.
- Posted financial records cannot be mutated by normal workflows.
- Inventory records remain auditable.
- Indexes support statements, reports, and stock cards.
