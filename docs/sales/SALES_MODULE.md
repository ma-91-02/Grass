# Sales Module

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/STATE_MACHINES.md`
- `docs/sales/SALES_POSTING.md`

## Used When

- Building sales invoice screens, sales APIs, returns, collections, customer pricing, sales tables, or sales workflows.

## Do Not Use For

- Posting internals; read `SALES_POSTING.md` and `POSTING_ENGINE.md`.

## Goal

Sales manages invoices, customer selection, pricing, discounts, payment state, and returns. It must not directly modify ledger balances or stock balances.

## Pages

- `/dashboard/sales`
- `/dashboard/sales/new`
- `/dashboard/sales/:id`
- `/dashboard/sales/returns`
- `/dashboard/sales/collections`

## Invoice Fields

- customerId.
- warehouseId.
- date.
- currency.
- exchangeRateSnapshot.
- customerTypeSnapshot.
- paymentType.
- paymentAccountId.
- subtotal.
- discount.
- tax.
- total.
- paid.
- remaining.
- status.
- lines.

## Workflow

```text
DRAFT -> RESERVED -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
POSTED -> PARTIALLY_RETURNED/FULLY_RETURNED
POSTED -> CANCELLING -> REVERSED
```

## Business Rules

- Credit invoice requires customer.
- Paid amount requires payment account.
- Payment account currency must match invoice currency.
- Customer AR currency must match invoice currency.
- Stock must be available unless override permission exists.
- Discount override requires permission if above threshold.
- Credit limit override requires permission.

## APIs

- `GET /api/sales-invoices`
- `POST /api/sales-invoices`
- `PATCH /api/sales-invoices/:id`
- `POST /api/sales-invoices/:id/post`
- `POST /api/sales-invoices/:id/cancel`
- `POST /api/sales-returns`
- `GET /api/sales-invoices/:id/pdf`

## Permissions

- `sales.view`
- `sales.create`
- `sales.post`
- `sales.cancel`
- `sales.return`
- `sales.print`
- `sales.discount.override`
- `sales.creditLimit.override`

## UI Behavior

- Product selector supports barcode/code/name.
- Show available stock per line.
- Show currency badge.
- Show posting preview when allowed.
- Disable editing after approval/posting.
- Show clear errors for stock, period, approval, and currency issues.

## Implementation Checklist

- [ ] Do not update stock directly.
- [ ] Do not update balances directly.
- [ ] Use state machine.
- [ ] Use PostingService to post.
- [ ] Use reservation service if reserving.
- [ ] Add audit and tests.

## Acceptance Criteria

- Sales invoice can post only through PostingService.
- Credit/cash/mixed payment rules are enforced.
- Stock and customer debt rules are enforced.
- Posted sales invoice is immutable.
