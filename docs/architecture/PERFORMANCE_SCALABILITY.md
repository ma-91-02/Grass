# Performance and Scalability

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/DATABASE_CONSTRAINTS.md`
- `docs/reports/REPORTING_BI.md`

## Used When

- Optimizing queries, reports, ledgers, inventory, dashboards, exports, background jobs, or indexing.

## Do Not Use For

- Small UI text or layout-only changes.

## Principles

- Do not optimize by weakening financial safety.
- Reports must not mutate operational data.
- Heavy work must run async.
- Closed-period reports should use snapshots.
- Large ledgers use keyset pagination and monthly snapshots.

## Pagination

- Journal lines: keyset by `entryDate, journalLineId`.
- Stock movements: keyset by `movementDate, id`.
- Audit logs: keyset by `createdAt, id`.
- Master data: offset allowed with max page size.

## Large Ledger Optimization

- Monthly account balance snapshots.
- Account/currency/date indexes.
- Avoid full ledger scans in request lifecycle.
- Start account statement from nearest snapshot.
- Future partitioning by fiscal year/month.

## Inventory Query Optimization

- `stock_balances` for current stock.
- `stock_movements` for audit trail.
- `inventory_valuation_layers` indexed by product/warehouse/date.
- Reservation summaries per product/warehouse.

## Reporting Optimization

- Materialized views for monthly summaries.
- Cache by filtersHash and permission scope.
- Async exports above threshold.
- Report jobs with status.
- Snapshot reports for closed periods.

## Cache Invalidation

- `financial.posted`: invalidate ledger, AR/AP, cash, P&L.
- `financial.reversed`: invalidate same as posted.
- `stock.moved`: invalidate inventory/product/warehouse reports.
- `period.closed`: freeze snapshot and invalidate live cache.
- `permission.changed`: invalidate permission/session cache.

## Queue Strategy

- Financial outbox: high priority.
- Reports: medium priority.
- Notifications: low priority.
- Jobs must be idempotent.
- Dead letters must be visible in ops UI.

## Indexing Matrix

| Table             | Index                                    | Purpose        |
| ----------------- | ---------------------------------------- | -------------- |
| journal_lines     | accountId, currency, createdAt, id       | statements     |
| journal_lines     | branchId, accountId, currency, createdAt | branch reports |
| stock_movements   | productId, warehouseId, movementDate, id | stock card     |
| sales_invoices    | companyId, branchId, status, date        | sales list     |
| purchase_invoices | companyId, branchId, status, date        | purchase list  |
| audit_logs        | entity, entityId, createdAt              | audit trace    |
| background_jobs   | queueName, status, runAt, priority       | worker pickup  |

## Implementation Checklist

- [ ] Choose pagination strategy.
- [ ] Add required indexes.
- [ ] Add cache invalidation.
- [ ] Use async job for heavy exports.
- [ ] Add performance tests for large data.

## Acceptance Criteria

- Large statements do not require full scans.
- Heavy reports do not block requests.
- Cache invalidates after posting.
- Performance improvements preserve financial safety.
