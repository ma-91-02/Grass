# Inventory Engine

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/inventory/STOCK_MOVEMENTS.md`
- `docs/inventory/INVENTORY_VALUATION.md`

## Used When

- Working on products, warehouses, stock balances, reservations, transfers, adjustments, counts, damages, or inventory reports.

## Do Not Use For

- Financial posting details; read `POSTING_ENGINE.md`.

## Goal

Inventory is movement-first. Stock balances are derived or cached from stock movements. Inventory modules must not write accounting ledger directly; financial inventory effects go through PostingService.

## Core Rules

- Every inventory effect creates a stock movement.
- Stock movements are append-only after creation.
- Stock balance is a cache and can be rebuilt.
- Negative stock is forbidden unless policy and permission allow it.
- Transfers create OUT and IN movements.
- Counts create adjustments only for differences.
- Damage creates OUT movement and financial expense when posted.

## Core Tables

- `products`
- `product_categories`
- `product_prices`
- `warehouses`
- `stock_movements`
- `stock_balances`
- `stock_transfers`
- `stock_adjustments`
- `inventory_counts`
- `stock_reservations`

## Inventory Formula

```text
onHand = sum(IN movements) - sum(OUT movements)
reserved = sum(active reservations)
available = onHand - reserved - blocked
```

## APIs

- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id`
- `GET /api/stock-balances`
- `GET /api/stock-movements`
- `POST /api/stock-transfers`
- `POST /api/stock-transfers/:id/post`
- `POST /api/stock-adjustments`
- `POST /api/damages`
- `POST /api/inventory-counts`
- `POST /api/inventory-counts/:id/post`

## Permissions

- `products.view`
- `products.create`
- `products.edit`
- `products.disable`
- `products.cost.view`
- `inventory.view`
- `inventory.transfer`
- `inventory.adjust`
- `inventory.damage`
- `inventory.count`
- `inventory.negative.override`

## Audit

- Product create/update/disable.
- Stock movement posting.
- Transfer dispatch/receive/post.
- Adjustment and damage reasons.
- Negative stock overrides.
- Count approval/posting.

## Edge Cases

- Product disabled: no new movement except corrections.
- Warehouse disabled: no new operational movement.
- Transfer to same warehouse: reject.
- Sale without cost: reject unless override.
- Closed inventory period: reject.

## Implementation Checklist

- [ ] Use movement-first logic.
- [ ] Do not update stock directly.
- [ ] Lock product/warehouse balance on mutation.
- [ ] Add audit.
- [ ] Add tests for movement and balance.

## Acceptance Criteria

- Stock balances reconcile with movements.
- No inventory mutation bypasses movement service.
- Negative stock policy is enforced.
