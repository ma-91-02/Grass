# Financial Closing

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/POSTING_ENGINE.md`
- `docs/accounting/FINANCIAL_INVARIANTS.md`
- `docs/reports/REPORTING_BI.md`

## Used When

- Implementing month-end close, year-end close, period locks, reopening, closing entries, FX revaluation, or closing reports.

## Do Not Use For

- Normal invoice posting unless period state is affected.

## Closing Types

- Soft close.
- Hard close.
- Inventory close.
- Financial close.
- Year close.
- Adjustment period.

## Workflow

1. Start closing run.
2. Freeze posting for the period.
3. Detect unposted documents.
4. Validate journal balance.
5. Validate currency isolation.
6. Reconcile AR/AP/cash/bank.
7. Reconcile inventory vs accounting.
8. Run FX revaluation if configured.
9. Generate closing entries.
10. Freeze historical snapshots.
11. Request approval.
12. Execute close.
13. Publish reporting snapshot events.

## Year-End

- Close temporary accounts.
- Transfer net income/loss to retained earnings.
- Carry forward balance sheet accounts.
- Create opening balances for new fiscal year.
- Freeze prior year.

## Tables

- `financial_closing_runs`
- `financial_closing_tasks`
- `financial_closing_snapshots`
- `financial_closing_journals`
- `reopening_requests`

## APIs

- `POST /api/financial-closing/month-end/start`
- `POST /api/financial-closing/year-end/start`
- `POST /api/financial-closing/:id/validate`
- `POST /api/financial-closing/:id/approve`
- `POST /api/financial-closing/:id/execute`
- `POST /api/financial-closing/:id/reopen-request`
- `GET /api/financial-closing/:id/blockers`

## Validations

- No unposted documents.
- No unbalanced journals.
- No unresolved approvals.
- No unresolved inter-branch transfers.
- Inventory valuation reconciles with inventory accounts.
- Closing exchange rates exist.

## Permissions

- `closing.month.start`
- `closing.year.start`
- `closing.validate`
- `closing.approve`
- `closing.execute`
- `closing.reopen.request`
- `closing.reopen.approve`

## Edge Cases

- Hard close error: requires reopening or current-period correction.
- Branch not closed: company consolidation close is blocked.
- FX rate missing: blocker.
- Inventory mismatch: blocker above tolerance.

## Implementation Checklist

- [ ] Create closing run.
- [ ] Run blockers.
- [ ] Freeze snapshots.
- [ ] Generate journals through PostingService.
- [ ] Require approval.
- [ ] Add audit.
- [ ] Add rollback/reopen path.

## Acceptance Criteria

- Closed periods cannot receive normal posting.
- Snapshots are immutable.
- Year-end carries balances correctly.
- Reopening is audited and approved.
