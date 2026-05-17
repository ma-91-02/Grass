# Purchases Posting

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/purchases/PURCHASES_MODULE.md`
- `docs/accounting/POSTING_ENGINE.md`
- `docs/inventory/INVENTORY_VALUATION.md`

## Used When

- Implementing purchase posting, landed cost accounting, purchase returns, AP, cash, inventory valuation, or cost corrections.

## Do Not Use For

- Purchase UI with no financial or stock effect.

## Purchase Journal

### Cash Purchase

- Debit: Inventory.
- Credit: Cash/Bank.

### Credit Purchase

- Debit: Inventory.
- Credit: Supplier AP.

### Mixed Purchase

- Debit: Inventory.
- Credit: Cash/Bank.
- Credit: Supplier AP.

## Landed Cost

- Add freight/customs/handling to inventory cost if linked to goods.
- Allocation methods:
  - BY_VALUE.
  - BY_QUANTITY.
  - MANUAL.
- Distribution snapshot must be saved.

## Posting Effects

- Stock IN.
- Valuation layer created.
- Weighted average recalculated.
- Journal posted.
- Supplier AP/cash updated through ledger.

## Purchase Return

- Quantity returned <= purchased available quantity.
- If stock has already been sold, use cost adjustment policy.
- Journal:
  - Debit AP/Cash receivable from supplier.
  - Credit Inventory.
- Stock: RETURN_OUT.

## Validations

- Period open.
- Approval complete if required.
- Supplier/payment account currency matches.
- Warehouse active.
- Product active.
- Landed costs fully allocated.
- No negative final cost.

## APIs

- `POST /api/purchase-invoices/:id/post`
- `POST /api/purchase-invoices/:id/cancel`
- `POST /api/purchase-returns`
- `POST /api/purchase-returns/:id/post`

## Edge Cases

- Late landed cost after partial sale:
  - split adjustment between Inventory and COGS.
- Supplier disabled after draft:
  - reject unless override.
- Exchange rate missing:
  - reject.
- Duplicate retry:
  - idempotent replay.

## Implementation Checklist

- [ ] Allocate landed costs.
- [ ] Create valuation layers.
- [ ] Recalculate weighted average.
- [ ] Create balanced journal.
- [ ] Add audit.
- [ ] Test cost and AP effects.

## Acceptance Criteria

- Inventory value matches purchase cost.
- AP/cash impact is ledger-derived.
- Cost adjustment is auditable.
- Retry does not duplicate posting.
