# Purchases Module

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/purchases/PURCHASES_POSTING.md`
- `docs/inventory/INVENTORY_VALUATION.md`

## Used When

- Building purchase invoice screens, purchase APIs, landed costs, supplier workflows, and purchase returns.

## Do Not Use For

- Deep posting internals; read `PURCHASES_POSTING.md`.

## Goal

Purchases manages supplier invoices, landed costs, supplier debt, receiving inventory, and returns. Purchases must not directly update ledger balances, stock balances, or product cost fields.

## Pages

- `/dashboard/purchases`
- `/dashboard/purchases/new`
- `/dashboard/purchases/:id`
- `/dashboard/purchases/returns`
- `/dashboard/purchases/expenses`

## Workflow

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTED -> PARTIALLY_RETURNED/FULLY_RETURNED
POSTED -> CANCELLING -> REVERSED
```

## Business Rules

- Credit purchase requires supplier.
- Paid amount requires payment account.
- Warehouse is required.
- Currency must match payment/AP accounts.
- Landed cost allocation must be complete.
- Product must be active.
- Expiry date required when product tracks expiry.

## APIs

- `GET /api/purchase-invoices`
- `POST /api/purchase-invoices`
- `PATCH /api/purchase-invoices/:id`
- `POST /api/purchase-invoices/:id/post`
- `POST /api/purchase-invoices/:id/cancel`
- `POST /api/purchase-returns`
- `GET /api/purchase-invoices/:id/pdf`

## Permissions

- `purchases.view`
- `purchases.create`
- `purchases.post`
- `purchases.cancel`
- `purchases.return`
- `purchases.print`

## Implementation Checklist

- [ ] Do not update product cost directly.
- [ ] Do not update supplier balance directly.
- [ ] Use PostingService.
- [ ] Use ValuationEngine.
- [ ] Add landed cost validations.
- [ ] Add audit and tests.

## Acceptance Criteria

- Purchase invoice posts inventory and AP/cash correctly.
- Landed costs are distributed deterministically.
- Posted purchase invoice is immutable.
