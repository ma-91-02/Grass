# AI Task Context Guide

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`

## Used When

- Before starting any implementation task.
- When deciding which documentation files Big Pickle or another AI agent must load.

## Do Not Use For

- Do not use as a replacement for module documentation.
- Do not use as a financial rule source by itself.

## Context Selection Rules

- Always read `AI_GLOBAL_RULES.md` first.
- Read only the files needed for the task.
- If a task crosses modules, read all related module files plus `MODULE_BOUNDARIES.md`.
- If a task posts money or stock, read `POSTING_ENGINE.md`, `FINANCIAL_INVARIANTS.md`, and `TRANSACTION_RULES.md`.
- If a task changes state/status, read `STATE_MACHINES.md`.
- If a task changes database schema, read `DATABASE_CONSTRAINTS.md`.
- If a task changes APIs, read `API_STANDARDS.md`.
- If a task changes permissions/security/audit, read `AUTH_RBAC.md`, `AUDIT_LOGS.md`, and `SECURITY_ARCHITECTURE.md`.

## Task Type Matrix

| Task Type            | Must Read                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Accounting           | `AI_GLOBAL_RULES.md`, `ACCOUNTING_ENGINE.md`, `POSTING_ENGINE.md`, `FINANCIAL_INVARIANTS.md`, `TRANSACTION_RULES.md`, `API_STANDARDS.md` |
| Chart of Accounts    | `AI_GLOBAL_RULES.md`, `CHART_OF_ACCOUNTS.md`, `FINANCIAL_INVARIANTS.md`, `DATABASE_CONSTRAINTS.md`                                       |
| Posting Engine       | `AI_GLOBAL_RULES.md`, `POSTING_ENGINE.md`, `FINANCIAL_INVARIANTS.md`, `STATE_MACHINES.md`, `TRANSACTION_RULES.md`, `AUDIT_LOGS.md`       |
| Financial Closing    | `AI_GLOBAL_RULES.md`, `FINANCIAL_CLOSING.md`, `FINANCIAL_INVARIANTS.md`, `POSTING_ENGINE.md`, `REPORTING_BI.md`                          |
| Inventory            | `AI_GLOBAL_RULES.md`, `INVENTORY_ENGINE.md`, `STOCK_MOVEMENTS.md`, `INVENTORY_VALUATION.md`, `TRANSACTION_RULES.md`                      |
| Sales                | `AI_GLOBAL_RULES.md`, `SALES_MODULE.md`, `SALES_POSTING.md`, `POSTING_ENGINE.md`, `INVENTORY_ENGINE.md`, `API_STANDARDS.md`              |
| Purchases            | `AI_GLOBAL_RULES.md`, `PURCHASES_MODULE.md`, `PURCHASES_POSTING.md`, `POSTING_ENGINE.md`, `INVENTORY_VALUATION.md`, `API_STANDARDS.md`   |
| UI Only              | `AI_GLOBAL_RULES.md`, `SYSTEM_OVERVIEW.md`, `MODULE_BOUNDARIES.md`, `API_STANDARDS.md`                                                   |
| API                  | `AI_GLOBAL_RULES.md`, `API_STANDARDS.md`, relevant module file, `TRANSACTION_RULES.md` if mutation                                       |
| Database Schema      | `AI_GLOBAL_RULES.md`, `DATABASE_CONSTRAINTS.md`, relevant module file, `FINANCIAL_INVARIANTS.md` if financial                            |
| Auth/RBAC            | `AI_GLOBAL_RULES.md`, `AUTH_RBAC.md`, `SECURITY_ARCHITECTURE.md`, `AUDIT_LOGS.md`                                                        |
| Audit                | `AI_GLOBAL_RULES.md`, `AUDIT_LOGS.md`, `SECURITY_ARCHITECTURE.md`, relevant module file                                                  |
| Reports/BI           | `AI_GLOBAL_RULES.md`, `REPORTING_BI.md`, `FINANCIAL_INVARIANTS.md`, related module files                                                 |
| Multi-branch         | `AI_GLOBAL_RULES.md`, `MULTI_BRANCH_ACCOUNTING.md`, `MODULE_BOUNDARIES.md`, `TRANSACTION_RULES.md`, `FINANCIAL_INVARIANTS.md`            |
| Approval Workflows   | `AI_GLOBAL_RULES.md`, `APPROVAL_WORKFLOWS.md`, `STATE_MACHINES.md`, `AUTH_RBAC.md`, `AUDIT_LOGS.md`                                      |
| Reliability/Recovery | `AI_GLOBAL_RULES.md`, `RELIABILITY_RECOVERY.md`, `ERROR_HANDLING.md`, `TRANSACTION_RULES.md`, `AUDIT_LOGS.md`                            |
| Customers            | `AI_GLOBAL_RULES.md`, `CUSTOMERS_MODULE.md`, `ACCOUNTING_ENGINE.md`, `SALES_MODULE.md`                                                   |
| Suppliers            | `AI_GLOBAL_RULES.md`, `SUPPLIERS_MODULE.md`, `ACCOUNTING_ENGINE.md`, `PURCHASES_MODULE.md`                                               |
| Employees            | `AI_GLOBAL_RULES.md`, `EMPLOYEES_MODULE.md`, `AUTH_RBAC.md`                                                                              |
| Settings             | `AI_GLOBAL_RULES.md`, `SETTINGS_MODULE.md`, `CHART_OF_ACCOUNTS.md`, `SECURITY_ARCHITECTURE.md`                                           |
| Performance          | `AI_GLOBAL_RULES.md`, `PERFORMANCE_SCALABILITY.md`, `DATABASE_CONSTRAINTS.md`, `REPORTING_BI.md`                                         |
| Testing              | `AI_GLOBAL_RULES.md`, `TESTING_STRATEGY.md`, relevant module files                                                                       |
| Phase Planning       | `AI_GLOBAL_RULES.md`, `PHASES.md`, `ACCEPTANCE_CRITERIA.md`                                                                              |

## If Unsure

1. Read `AI_GLOBAL_RULES.md`.
2. Read `SYSTEM_OVERVIEW.md`.
3. Read `MODULE_BOUNDARIES.md`.
4. Read the relevant module file.
5. If financial or inventory effects exist, read the specialized engine files.

## Implementation Checklist

- [ ] Identify task type.
- [ ] Load required files only.
- [ ] Confirm whether posting, stock, approval, or audit is involved.
- [ ] Confirm whether state transition is involved.
- [ ] Confirm whether schema/API contracts are involved.

## Acceptance Criteria

- The agent reads the smallest safe context.
- Critical financial, inventory, security, and transaction rules are not skipped.
- Cross-module tasks include module boundaries.
