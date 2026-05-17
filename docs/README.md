# GRASS ERP Documentation System

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/ai/AI_TASK_CONTEXT_GUIDE.md`

## Used When

- Navigating the documentation system.
- Planning tasks for AI agents or human developers.

## Do Not Use For

- Do not use as the only source for implementation details.
- Use the module-specific files listed below.

## Source of Truth Structure

- `docs/MASTER_PROJECT_MAP_AR.md` remains the full archival blueprint.
- The split files below are task-oriented references designed to reduce context size.
- If conflict appears, use this order:
  1. `AI_GLOBAL_RULES.md`
  2. Specialized module/engine file
  3. `MASTER_PROJECT_MAP_AR.md`

## File Index

| File | Always Read? | Used When | Related Files |
|---|---:|---|---|
| `ai/AI_GLOBAL_RULES.md` | Yes | Every task | All files |
| `ai/AI_TASK_CONTEXT_GUIDE.md` | Yes for task planning | Choosing context | All files |
| `architecture/SYSTEM_OVERVIEW.md` | Often | General architecture/UI/system tasks | Module boundaries |
| `architecture/MODULE_BOUNDARIES.md` | Often | Cross-module work | All module files |
| `architecture/STATE_MACHINES.md` | When state changes | Status workflows | Posting, inventory, approvals |
| `architecture/DATABASE_CONSTRAINTS.md` | Schema tasks | Constraints/indexes | Financial invariants |
| `architecture/API_STANDARDS.md` | API tasks | API contracts | Transaction rules |
| `architecture/TRANSACTION_RULES.md` | Mutations | Transactions/locks/idempotency | Posting engine |
| `architecture/SECURITY_ARCHITECTURE.md` | Security tasks | MFA/session/trust | Auth/RBAC, audit |
| `accounting/ACCOUNTING_ENGINE.md` | Accounting tasks | Ledger/journals/vouchers | Posting engine |
| `accounting/POSTING_ENGINE.md` | Financial posting | Posting pipeline | Transactions, invariants |
| `accounting/FINANCIAL_INVARIANTS.md` | Financial tasks | Non-negotiable rules | Database constraints |
| `accounting/CHART_OF_ACCOUNTS.md` | Accounts tasks | COA tree/mappings | Accounting engine |
| `accounting/FINANCIAL_CLOSING.md` | Closing tasks | Period close/year close | Reporting BI |
| `inventory/INVENTORY_ENGINE.md` | Inventory tasks | Stock ownership | Stock movements |
| `inventory/STOCK_MOVEMENTS.md` | Movement tasks | Transfers/adjustments/counts | Valuation |
| `inventory/INVENTORY_VALUATION.md` | Costing tasks | Weighted average/FIFO-ready | Purchases posting |
| `sales/SALES_MODULE.md` | Sales tasks | Invoice UI/workflow | Sales posting |
| `sales/SALES_POSTING.md` | Sales posting | Financial/stock impact | Posting engine |
| `purchases/PURCHASES_MODULE.md` | Purchase tasks | Purchase workflow | Purchases posting |
| `purchases/PURCHASES_POSTING.md` | Purchase posting | AP/inventory impact | Valuation |
| `users/AUTH_RBAC.md` | Auth/RBAC tasks | Users/roles/sessions | Security |
| `users/AUDIT_LOGS.md` | Audit tasks | Audit architecture | Security |
| `reports/REPORTING_BI.md` | Reports | BI/cache/snapshots | Financial invariants |
| `implementation/PHASES.md` | Planning | Implementation phases | Acceptance criteria |
| `implementation/ACCEPTANCE_CRITERIA.md` | QA | Done criteria | Testing strategy |
| `implementation/TESTING_STRATEGY.md` | Tests | ERP test strategy | Module docs |

## Big Pickle Usage Instructions

1. Always read `ai/AI_GLOBAL_RULES.md`.
2. Read `ai/AI_TASK_CONTEXT_GUIDE.md` to select task context.
3. Read only the relevant module and engine files.
4. Before editing code, identify:
   - module boundary.
   - state transition.
   - transaction owner.
   - audit requirement.
   - tests required.
5. Never infer financial behavior that is not documented.
6. If a task is unclear, stop and ask for clarification.

## Example Prompt

```text
Read:
- docs/ai/AI_GLOBAL_RULES.md
- docs/sales/SALES_MODULE.md
- docs/sales/SALES_POSTING.md
- docs/accounting/POSTING_ENGINE.md
- docs/architecture/TRANSACTION_RULES.md
- docs/architecture/API_STANDARDS.md

Task:
Implement POST /api/sales-invoices/:id/post.

Rules:
- Do not update balances directly.
- Do not update stock directly.
- Use PostingService.
- Enforce state machine transitions.
- Add audit logs.
- Add tests for success, insufficient stock, period locked, duplicate idempotency key, and reversal readiness.
```

## Implementation Checklist

- [ ] Use the context guide before every task.
- [ ] Keep `MASTER_PROJECT_MAP_AR.md` as full archive.
- [ ] Update split docs when architecture changes.
- [ ] Do not duplicate business rules inconsistently.

## Acceptance Criteria

- Agents can load minimal safe context.
- Global rules remain short and mandatory.
- Module files contain enough detail for implementation.
- Full blueprint remains available.
