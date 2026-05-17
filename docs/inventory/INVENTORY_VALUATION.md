# Inventory Valuation

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/inventory/INVENTORY_ENGINE.md`
- `docs/accounting/POSTING_ENGINE.md`

## Used When

- Implementing costs, weighted average, FIFO-ready layers, landed cost allocation, cost adjustments, negative stock recovery, batch/serial costing, or valuation reports.

## Do Not Use For

- Stock UI-only lists with no cost impact.

## Goal

Inventory valuation must be auditable, deterministic, and tied to accounting entries. Weighted Average is the first policy, with FIFO-ready valuation layers.

## Weighted Average

```text
newAvg = ((oldQty * oldAvg) + (inQty * inUnitCost)) / (oldQty + inQty)
cogs = outQty * currentAvgCost
```

## Valuation Layers

- Every purchase/opening/adjustment_in creates a layer.
- FIFO future support consumes oldest layers.
- Batch/serial costing scopes layers by batch or serial.
- Cost allocations link OUT movements to layers when needed.

## Landed Cost

- Allocation methods:
  - BY_VALUE.
  - BY_QUANTITY.
  - MANUAL.
  - BY_WEIGHT future.
- Expense share must equal total expenses.
- Final line cost must not be negative.

## Retroactive Cost Adjustment

- Do not edit posted purchase.
- Create cost adjustment.
- Split effect:
  - remaining quantity -> Inventory.
  - sold quantity -> COGS.
- Post adjustment journal.

## Negative Stock Recovery

- Negative stock is forbidden by default.
- If allowed:
  - use provisional cost.
  - later purchase creates recovery adjustment.
  - audit override, provisional cost, and recovery result.

## Tables

- `inventory_valuation_layers`
- `inventory_cost_allocations`
- `cost_recalculation_runs`
- `cost_adjustment_entries`
- `stock_reservations`
- `valuation_snapshots`

## APIs

- `GET /api/inventory/valuation`
- `GET /api/inventory/layers`
- `POST /api/inventory/cost-adjustments`
- `POST /api/inventory/cost-recalculations`
- `POST /api/inventory/reservations`
- `POST /api/inventory/reservations/:id/release`
- `POST /api/inventory/reconcile`

## Locking

- Lock stock balance per product/warehouse.
- Lock valuation layers when consuming or recalculating.
- Recalculation blocks posting for same product/warehouse scope.

## Implementation Checklist

- [ ] Create valuation layer for incoming cost.
- [ ] Calculate weighted average deterministically.
- [ ] Link COGS to outgoing movement.
- [ ] Post cost adjustments through PostingService.
- [ ] Add reconciliation tests.

## Acceptance Criteria

- Valuation is reproducible.
- COGS matches inventory accounting.
- Cost corrections are auditable.
- No direct cost mutation outside ValuationEngine.
