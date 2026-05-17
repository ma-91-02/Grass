# Multi-Branch Accounting

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/MODULE_BOUNDARIES.md`
- `docs/accounting/FINANCIAL_INVARIANTS.md`
- `docs/architecture/TRANSACTION_RULES.md`

## Used When

- Implementing branches, branch users, branch warehouses, branch cash/bank accounts, inter-branch transfers, branch ledgers, branch period locks, or consolidated reporting.

## Do Not Use For

- Single-branch UI changes with no branch scope.
- Normal sales/purchase posting unless documents cross branches.

## Goal

GRASS ERP must support branch-level operations without breaking ledger-first accounting. Each operational document must have a branch scope, while consolidated reporting can eliminate inter-branch balances safely.

## Branch Tables

| Table                        | Purpose                       | Key Rules                                           |
| ---------------------------- | ----------------------------- | --------------------------------------------------- |
| `branches`                   | Branch master data            | Unique `companyId, code`; disable instead of delete |
| `branch_users`               | User branch scope             | Required for branch-scoped permissions              |
| `branch_accounts`            | Branch account mappings       | Cash/bank/AR/AP/inventory/due-to/due-from           |
| `branch_fiscal_periods`      | Branch period status          | Company close requires branch close                 |
| `branch_numbering_sequences` | Per-branch document numbering | Row lock for number generation                      |
| `inter_branch_transfers`     | Financial/inventory transfers | Requires source and destination branches            |

## Branch Isolation Rules

- Every operational document must carry `branchId` when multi-branch is enabled.
- Warehouses belong to one branch.
- Payment accounts belong to one branch or are central.
- Users cannot view or mutate branch data outside their branch scope.
- Branch ledgers use `journal_lines.branchId`.
- Company consolidated reports may aggregate branch ledgers.

## Posting Rules

- Same-branch sales/purchases post to the branch ledger.
- Inter-branch inventory transfer creates:
  - stock OUT in source branch.
  - stock IN in destination branch.
  - due-to/due-from journals when ownership changes.
- Inter-branch cash transfer creates:
  - source branch cash credit.
  - source due-from debit.
  - destination cash debit.
  - destination due-to credit.
- All inter-branch journals must remain currency-isolated.

## Due-To / Due-From

- `Due From Branch B` in Branch A must equal `Due To Branch A` in Branch B.
- Differences block consolidated period close.
- Consolidation eliminates matching due-to/due-from accounts.

## Numbering

```text
{BRANCH_CODE}-{DOC_TYPE}-{YEAR}-{SEQUENCE}
```

- Numbers must be unique per branch, fiscal year, and document type.
- Financial document numbers are not reused after cancellation.
- Sequence rows must be locked during number generation.

## Branch Fiscal Periods

- Branch period states:
  - OPEN.
  - CLOSING_IN_PROGRESS.
  - SOFT_CLOSED.
  - HARD_CLOSED.
  - REOPENED.
- A company period cannot hard close until all branch periods are hard closed.
- Reopening one branch invalidates final consolidated snapshots.

## APIs

- `GET /api/branches`
- `POST /api/branches`
- `PATCH /api/branches/:id`
- `POST /api/branches/:id/disable`
- `GET /api/branches/:id/trial-balance`
- `GET /api/branches/:id/periods`
- `POST /api/branches/:id/periods/:periodId/lock`
- `POST /api/inter-branch/transfers`
- `POST /api/inter-branch/transfers/:id/confirm`
- `POST /api/inter-branch/transfers/:id/post`
- `GET /api/inter-branch/reconciliation`
- `POST /api/consolidation/run`

## Permissions

- `branches.view`
- `branches.manage`
- `branches.accounting.view`
- `branches.accounting.post`
- `branches.consolidation.view`
- `branches.consolidation.close`
- `interBranchTransfers.create`
- `interBranchTransfers.post`

## Audit

- Branch create/update/disable.
- User branch scope changes.
- Branch period locks/reopens.
- Inter-branch transfer create/confirm/post/reverse.
- Consolidation run and reconciliation results.

## Edge Cases

- User has multiple branches: branch must be selected before creating documents.
- Transfer dispatched but not received: mark as in-transit and block close if policy requires.
- Destination branch disabled: reject new transfers.
- Different currencies between branches: require exchange workflow before transfer.

## Implementation Checklist

- [ ] Add branch scope to documents.
- [ ] Enforce branch permission checks.
- [ ] Use branch numbering sequences.
- [ ] Add due-to/due-from mappings.
- [ ] Add branch reconciliation.
- [ ] Add tests for branch isolation.

## Acceptance Criteria

- Branch data is isolated by permission.
- Inter-branch balances reconcile.
- Consolidation eliminates due-to/due-from safely.
- Branch close blocks company close when incomplete.
