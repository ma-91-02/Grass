# Sales Posting

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/sales/SALES_MODULE.md`
- `docs/accounting/POSTING_ENGINE.md`
- `docs/inventory/INVENTORY_ENGINE.md`
- `docs/inventory/INVENTORY_VALUATION.md`

## Used When

- Implementing sales invoice posting, cancellation, returns, COGS, AR, cash, or stock effects.

## Do Not Use For

- Sales UI with no posting.

## Cash Sale Journal

- Debit: Cash/Bank.
- Credit: Sales Revenue.
- Debit: COGS.
- Credit: Inventory.
- Stock: OUT.

## Credit Sale Journal

- Debit: Customer AR.
- Credit: Sales Revenue.
- Debit: COGS.
- Credit: Inventory.
- Stock: OUT.

## Mixed Sale Journal

- Debit: Cash/Bank for paid amount.
- Debit: Customer AR for remaining amount.
- Credit: Sales Revenue.
- Debit: COGS.
- Credit: Inventory.

## Posting Validations

- Invoice state allows posting.
- Period open.
- Approval complete when required.
- Currency isolated.
- Customer active if AR exists.
- Payment account active if paid exists.
- Stock available or override.
- Product mappings exist:
  - inventory account.
  - revenue account.
  - COGS account.
- Totals recalculated server-side.

## Sales Return

- Quantity returned <= sold remaining quantity.
- Return currency equals original invoice currency.
- Journal:
  - Debit Sales Returns/Revenue Contra.
  - Credit Cash/AR.
  - Debit Inventory.
  - Credit COGS.
- Stock: RETURN_IN.

## Cancellation

- Draft: cancel without financial effect.
- Posted: reversal only.
- Closed period: reject unless reopening/current-period correction policy.

## APIs

- `POST /api/sales-invoices/:id/post`
- `POST /api/sales-invoices/:id/cancel`
- `POST /api/sales-returns`
- `POST /api/sales-returns/:id/post`

## Edge Cases

- Network failure after commit: use posting operation lookup.
- Duplicate post click: idempotent replay.
- Stock changed after draft: revalidate at posting.
- Exchange rate missing: reject.
- Customer disabled after draft: reject unless override.

## Implementation Checklist

- [ ] Build journal via JournalBuilder.
- [ ] Create stock OUT via inventory effect.
- [ ] Calculate COGS via ValuationEngine.
- [ ] Save posting links.
- [ ] Write audit.
- [ ] Add tests.

## Acceptance Criteria

- Sales posting creates balanced journal.
- Stock decreases exactly once.
- COGS is recorded.
- Customer/cash impact is correct.
- Retry does not duplicate posting.
