# Reporting and BI

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/FINANCIAL_INVARIANTS.md`

## Used When

- Building reports, dashboards, KPIs, exports, BI projections, materialized views, scheduled reports, or report reconciliation.

## Do Not Use For

- Operational posting logic.

## Principles

- Financial reports derive from journal lines or frozen snapshots.
- Inventory reports derive from stock movements, balances, valuation layers, or snapshots.
- Closed-period reports use snapshots.
- Heavy reports run async.
- Exports are audited and access-controlled.

## Report Layers

- Operational reports.
- Ledger reports.
- Reporting projections.
- Materialized views.
- Snapshot reports.
- BI warehouse-ready facts/dimensions.

## Reporting Tables

- `report_jobs`
- `report_snapshots`
- `report_cache_entries`
- `kpi_definitions`
- `kpi_values`
- `scheduled_reports`
- `scheduled_report_runs`

## Reconciliation Rules

- AR aging total = AR ledger.
- AP aging total = AP ledger.
- Sales total = revenue accounts after returns/discounts.
- Inventory valuation = inventory accounts after policy/tolerance.
- Cash movement = cash/bank ledger.

## APIs

- `POST /api/reports/run`
- `POST /api/reports/export`
- `GET /api/report-jobs/:id`
- `GET /api/reports/kpis`
- `POST /api/reports/cache/invalidate`
- `GET /api/reports/snapshots`
- `POST /api/scheduled-reports`

## Performance

- Use date range filters.
- Use materialized monthly aggregates.
- Use cache by filtersHash and permission scope.
- Use async export for large reports.
- Use snapshots for closed periods.

## Security

- Report permissions are specific.
- Branch scope applies.
- Sensitive exports require export permission.
- Full ledger export may require approval.
- Export downloads are audited.

## Implementation Checklist

- [ ] Define source of truth.
- [ ] Define reconciliation rule.
- [ ] Add permission.
- [ ] Add filters and pagination.
- [ ] Add export audit.
- [ ] Add performance strategy.

## Acceptance Criteria

- Reports reconcile with ledger/source.
- Heavy reports do not block UI.
- Exports are secure and audited.
