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

| Table              | Constraint                       | Purpose                   |
| ------------------ | -------------------------------- | ------------------------- |
| users              | email                            | One login identity        |
| permissions        | key                              | Stable permission checks  |
| accounts           | companyId + code                 | Stable chart of accounts  |
| journal_entries    | companyId + entryNumber          | Unique journal number     |
| posting_operations | operation scope + idempotencyKey | Safe retry                |
| customers          | companyId + code                 | Stable customer identity  |
| suppliers          | companyId + code                 | Stable supplier identity  |
| products           | companyId + code                 | Stable product identity   |
| warehouses         | companyId + code                 | Stable warehouse identity |
| stock_balances     | productId + warehouseId          | One current balance       |
| customer_accounts  | customerId + currency            | Currency-isolated AR      |
| supplier_accounts  | supplierId + currency            | Currency-isolated AP      |
| sales_invoices     | companyId + branchId + number    | Stable invoice numbering  |
| purchase_invoices  | companyId + branchId + number    | Stable purchase numbering |

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

| Query             | Index                                                      |
| ----------------- | ---------------------------------------------------------- |
| Account statement | journal_lines(accountId, currency, createdAt, id)          |
| Customer ledger   | journal_lines(partnerType, partnerId, currency, createdAt) |
| Stock card        | stock_movements(productId, warehouseId, movementDate, id)  |
| Sales list        | sales_invoices(companyId, branchId, status, date)          |
| Purchases list    | purchase_invoices(companyId, branchId, status, date)       |
| Audit trace       | audit_logs(entity, entityId, createdAt)                    |
| Jobs              | background_jobs(queueName, status, runAt, priority)        |

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

## Table-Level Constraints

| Table               | Constraints                                                                    | Reason                        |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| `companies`         | unique code, isActive guard                                                    | Protect company identity       |
| `branches`          | unique code per company, isActive guard                                        | Protect branch identity        |
| `fiscal_periods`    | non-overlapping dates, status machine, no posting when HARD_CLOSED             | Protect period close           |
| `accounts`          | unique code per company, parent restrict, no currency change after activity    | Protect chart and ledger      |
| `journal_entries`   | unique number, immutable after POSTED, source link                             | Prevent duplicate ledger      |
| `journal_lines`     | debit/credit checks, account FK restrict, currency match by guard              | Protect double-entry          |
| `sales_invoices`    | unique branch number, immutable after POSTED, customer/payment currency checks | Protect revenue and AR        |
| `purchase_invoices` | unique branch number, immutable after POSTED, supplier/payment currency checks | Protect AP and inventory      |
| `stock_movements`   | positive quantity, source link, append-only                                    | Protect stock card            |
| `stock_balances`    | unique product/warehouse                                                       | Prevent split balances        |
| `approval_requests` | one active request per document                                                | Prevent conflicting approvals |
| `fiscal_periods`    | non-overlapping dates, locked status guards                                    | Protect period close          |
| `audit_logs`        | append-only                                                                    | Protect audit trail           |

## Cascade / Restrict Matrix

| Relationship                         | Policy                 | Notes                      |
| ------------------------------------ | ---------------------- | -------------------------- |
| role -> role_permissions             | CASCADE                | Safe join cleanup          |
| user -> user_roles                   | CASCADE                | Safe join cleanup          |
| draft invoice -> draft lines         | CASCADE before posting | Service-enforced only      |
| posted invoice -> lines              | RESTRICT               | Immutable financial record |
| account -> journal_lines             | RESTRICT               | Ledger history             |
| product -> stock_movements           | RESTRICT               | Inventory history          |
| warehouse -> stock_movements         | RESTRICT               | Inventory history          |
| payment_account -> vouchers/invoices | RESTRICT               | Cash/bank history          |
| approval_policy -> approval_requests | RESTRICT               | Approval trace             |

## Immutable Fields Matrix

| Entity           | Immutable Fields                                                | Trigger   |
| ---------------- | --------------------------------------------------------------- | --------- |
| Journal Entry    | date, currency, sourceType, sourceId, entryNumber               | POSTED    |
| Journal Line     | accountId, debit, credit, currency                              | POSTED    |
| Sales Invoice    | customerId, warehouseId, currency, exchangeRateSnapshot, totals | POSTED    |
| Purchase Invoice | supplierId, warehouseId, currency, landed costs, totals         | POSTED    |
| Voucher          | type, amount, paymentAccountId, currency                        | POSTED    |
| Stock Movement   | productId, warehouseId, type, quantity, source links            | creation  |
| Exchange Rate    | date, usdToIqd                                                  | once used |
| Closing Snapshot | all fields                                                      | creation  |
| Audit Log        | all fields                                                      | creation  |

## Concurrency-Safe Constraints

- `version` field on editable documents.
- unique idempotency key/hash on posting operations.
- row lock on numbering sequence.
- row lock on stock balance per product/warehouse.
- unique active approval request per document.
- one active close run per period/scope.

## Recovery Implications

- Constraint violation before commit: reject and rollback.
- Cache mismatch: rebuild from ledger/movements.
- Posted record mutation attempt: reject and audit.
- Missing FK due to orphan detection: create incident; do not auto-delete.

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
