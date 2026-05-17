# Suppliers Module

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/ACCOUNTING_ENGINE.md`
- `docs/purchases/PURCHASES_MODULE.md`

## Used When

- Implementing suppliers, supplier accounts, AP balances, supplier statements, payment terms, or purchase supplier flows.

## Do Not Use For

- Customer workflows.
- Purchase posting internals.

## Goal

Suppliers module owns supplier master data and AP account links. It must not directly update supplier balances.

## Tables

- `suppliers`
- `supplier_accounts`
- AP linked `accounts`

## Fields

- code.
- name.
- phone.
- address.
- governorate.
- paymentTermDays.
- isActive.
- notes.

## Business Rules

- Supplier code is unique per company.
- Disabled suppliers cannot be used for new credit purchases.
- Supplier can have separate IQD and USD AP accounts.
- Delete is forbidden when purchases or ledger activity exist; disable instead.
- Supplier balance is derived from AP ledger.

## APIs

- `GET /api/suppliers`
- `POST /api/suppliers`
- `GET /api/suppliers/:id`
- `PATCH /api/suppliers/:id`
- `POST /api/suppliers/:id/disable`
- `GET /api/supplier-balances`
- `GET /api/account-statement?supplierId=...`

## Permissions

- `suppliers.view`
- `suppliers.create`
- `suppliers.edit`
- `suppliers.disable`
- `suppliers.balance.view`

## Audit

- Supplier create/update/disable.
- AP account link changes.
- Payment term changes.

## Edge Cases

- Supplier disabled after purchase draft: posting rejects unless override.
- Supplier AP currency mismatch: reject.
- Overpayment to supplier creates advance only if policy allows.

## Implementation Checklist

- [ ] Do not update AP balance directly.
- [ ] Link AP accounts per currency.
- [ ] Enforce disable rules.
- [ ] Add audit.
- [ ] Add tests for AP currency isolation.

## Acceptance Criteria

- Supplier balances derive from ledger.
- AP is currency-isolated.
- Disabled supplier cannot be used for new credit purchases.
