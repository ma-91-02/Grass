# Implementation Phases

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/ai/AI_TASK_CONTEXT_GUIDE.md`

## Used When

- Planning implementation, sprint work, Big Pickle tasks, or development sequencing.

## Do Not Use For

- Detailed coding without reading the phase-specific files.

## Phase 1: Foundation Core — ✅ Complete (10a735a, phase1/foundation-core)

### Goal

Build the safe foundation for auth, permissions, company/branch scope, fiscal periods, chart of accounts, ledger, posting foundation, and audit.

### Must Read

- `AI_GLOBAL_RULES.md`
- `AUTH_RBAC.md`
- `SECURITY_ARCHITECTURE.md`
- `CHART_OF_ACCOUNTS.md`
- `ACCOUNTING_ENGINE.md`
- `POSTING_ENGINE.md`
- `FINANCIAL_INVARIANTS.md`
- `DATABASE_CONSTRAINTS.md`
- `TRANSACTION_RULES.md`
- `AUDIT_LOGS.md`

### Outputs

- Auth and sessions.
- RBAC and permissions.
- Company and branch foundation.
- Fiscal periods.
- Chart of accounts.
- JournalEntry and JournalLine.
- PostingService foundation.
- Audit logs.

### Delivered

- **Schema additions**: `Company`, `Branch`, `FiscalPeriod`, `Account` (with parent/child tree), `JournalEntry`, `JournalLine`, `PostingOperation`. Enhanced `AuditLog` (requestId, userAgent, beforeJson, afterJson, metadataJson, companyId, branchId). New enums: `NormalBalance`, `PeriodStatus`, `PostingOperationStatus`, `JournalEntryStatus`.
- **Services**: 
  - `PostingService` — full journal posting pipeline with idempotency, validation, transaction safety, rollback.
  - `LedgerValidator` — balance/currency/line validation.
  - `PeriodGuard` — fiscal period status checks (OPEN, SOFT_CLOSED, HARD_CLOSED, etc.).
  - `CurrencyGuard` — currency isolation enforcement.
- **API routes** (13 total):
  - `GET/POST /api/companies`, `GET/PATCH/DELETE /api/companies/[id]`
  - `GET/POST /api/branches`, `GET/PATCH/DELETE /api/branches/[id]`
  - `GET/POST /api/fiscal-periods`, `GET/PATCH/DELETE /api/fiscal-periods/[id]`
  - `GET/POST /api/accounts`, `GET/PATCH/DELETE /api/accounts/[id]`, `GET /api/accounts/tree`
  - `GET/POST /api/journal-entries`, `GET/PATCH/DELETE /api/journal-entries/[id]`, `POST .../post`, `POST .../reverse`
- **Permissions**: 17 new permission keys (`ACCOUNTS_CREATE/EDIT/DELETE/STATEMENT/TREE`, `COMPANIES_VIEW/CREATE/EDIT`, `BRANCHES_VIEW/CREATE/EDIT`, `FISCAL_PERIODS_VIEW/MANAGE`, `JOURNALS_CREATE/POST/REVERSE`)
- **Types/Schemas**: Complete TypeScript types and Zod schemas for all new entities.
- **Seed**: Default company "شركة GRASS للتوزيع", branch "الفرع الرئيسي", fiscal period, full chart of accounts (30+ accounts with tree structure, system accounts, protected flagging).
- **Sidebar**: Added "القيود اليومية" and "الشركة والفروع" navigation items.
- **Foundation rules enforced**: No direct balance/stock updates, no business logic in routes, services own transactions, permissions checked server-side, audit logged on every mutation.

### Forbidden

- No invoice posting before ledger foundation.
- No direct balance updates.
- No UI business logic.

### Acceptance Criteria

- Users and permissions work.
- Journal posting foundation enforces balance/currency.
- Audit exists for sensitive writes.
- Period guard exists.

## Phase 2: Inventory Ledger

### Goal

Build movement-first inventory, stock balances, transfers, adjustments, counts, reservations, and valuation foundation.

### Must Read

- `INVENTORY_ENGINE.md`
- `STOCK_MOVEMENTS.md`
- `INVENTORY_VALUATION.md`
- `TRANSACTION_RULES.md`
- `DATABASE_CONSTRAINTS.md`

### Outputs

- Products.
- Warehouses.
- Stock movements.
- Stock balances.
- Transfers.
- Adjustments/damages.
- Opening balances.
- Weighted average valuation.

### Forbidden

- No direct stock updates.
- No cost mutation outside ValuationEngine.
- No movement without source.

### Acceptance Criteria

- Stock card rebuilds from movements.
- Stock balance reconciles.
- Valuation is deterministic.

## Phase 3: Sales Posting

### Goal

Implement sales invoice posting, returns, customer debt, cash/mixed payments, stock OUT, COGS.

### Must Read

- `SALES_MODULE.md`
- `SALES_POSTING.md`
- `POSTING_ENGINE.md`
- `INVENTORY_ENGINE.md`
- `INVENTORY_VALUATION.md`
- `API_STANDARDS.md`

### Outputs

- Sales invoice workflow.
- Posting endpoint.
- Returns.
- PDF/print.
- Customer ledger effects.

### Forbidden

- Sales cannot update ledger directly.
- Sales cannot update stock directly.
- No posting without period/currency/approval checks.

### Acceptance Criteria

- Cash, credit, and mixed sales post correctly.
- COGS and stock OUT are correct.
- Retry is idempotent.

## Phase 4: Purchases Posting

### Goal

Implement purchase invoices, landed costs, supplier AP, stock IN, valuation layers, and purchase returns.

### Must Read

- `PURCHASES_MODULE.md`
- `PURCHASES_POSTING.md`
- `INVENTORY_VALUATION.md`
- `POSTING_ENGINE.md`

### Outputs

- Purchase workflow.
- Landed cost allocation.
- Supplier AP.
- Inventory valuation.
- Purchase returns.

### Forbidden

- No direct supplier balance update.
- No direct product cost update.
- No posted purchase mutation.

### Acceptance Criteria

- Purchase cost updates valuation safely.
- AP/cash journal is balanced.
- Returns and adjustments are auditable.

## Phase 5: Reports

### Goal

Build financial, sales, inventory, debt, cash/bank, and BI-ready reports.

### Must Read

- `REPORTING_BI.md`
- `FINANCIAL_INVARIANTS.md`
- `ACCOUNTING_ENGINE.md`
- `INVENTORY_ENGINE.md`

### Outputs

- Account statements.
- Trial balance.
- P&L.
- AR/AP aging.
- Stock reports.
- Dashboard KPIs.
- Exports.

### Forbidden

- No report from stale/manual balances as source of truth.
- No heavy report without pagination/cache/async strategy.

### Acceptance Criteria

- Reports reconcile with ledger/movements.
- Exports are audited.
- Closed-period snapshots are used.

## Phase 6: Enterprise Controls

### Goal

Add approvals, closing, advanced security, reliability, queues, reconciliation, and operational hardening.

### Must Read

- `FINANCIAL_CLOSING.md`
- `SECURITY_ARCHITECTURE.md`
- `AUDIT_LOGS.md`
- `TESTING_STRATEGY.md`
- `ACCEPTANCE_CRITERIA.md`

### Outputs

- Approval workflows.
- Month/year close.
- Reconciliation jobs.
- Background jobs.
- MFA/step-up.
- Secure exports.
- Reliability monitoring.

### Forbidden

- No override without audit.
- No close without blockers resolved.
- No reconciliation repair without approval.

### Acceptance Criteria

- Period close is safe.
- Approvals block posting when required.
- Integrity jobs detect mismatches.

## Implementation Checklist

- [ ] Confirm the phase scope before coding.
- [ ] Read every file listed in the phase `Must Read` section.
- [ ] Implement phase outputs only; do not jump ahead into later phases.
- [ ] Enforce `AI_GLOBAL_RULES.md` for every task.
- [ ] Add or update tests required by `TESTING_STRATEGY.md`.
- [ ] Update relevant docs when APIs, workflows, schema, permissions, posting logic, or business rules change.
- [ ] Run format, lint, typecheck, tests when available, build, and relevant health checks.
- [ ] Commit with a clear message after checks pass.
- [ ] Push the branch to GitHub.
- [ ] Provide Arabic final report with branch, commit, changed files, docs, checks, risks, and push status.
