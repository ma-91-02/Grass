# Customers Module

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/ACCOUNTING_ENGINE.md`
- `docs/sales/SALES_MODULE.md`

## Used When

- Implementing customers, categories, customer accounts, credit limits, statements, customer balances, or customer sales actions.

## Do Not Use For

- Supplier workflows.
- Sales posting internals.

## Goal

Customers module owns customer master data and account links. It does not own AR ledger values; customer balances derive from journal lines.

## Tables

- `customers`
- `customer_categories`
- `customer_accounts`
- AR linked `accounts`

## Fields

- code.
- name.
- phone.
- whatsapp.
- address.
- governorate.
- area.
- customerType.
- categoryId.
- salesAgentId.
- creditLimitIQD.
- creditLimitUSD.
- paymentTermDays.
- isActive.
- notes.

## Business Rules

- Customer code is unique per company.
- Disabled customers cannot receive new credit sales.
- Cash historical invoices remain visible.
- Customer can have separate IQD and USD AR accounts.
- Credit limit override requires permission.
- Delete is forbidden when invoices or ledger activity exist; disable instead.

## APIs

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `POST /api/customers/:id/disable`
- `GET /api/customer-balances`
- `GET /api/account-statement?customerId=...`

## Permissions

- `customers.view`
- `customers.create`
- `customers.edit`
- `customers.disable`
- `customers.balance.view`
- `sales.creditLimit.override`

## Audit

- Customer create/update/disable.
- AR account link changes.
- Credit limit changes.
- Credit limit overrides during sales.

## Edge Cases

- Customer disabled after invoice draft: posting rejects unless override.
- Customer has USD debt and IQD payment: direct settlement forbidden; use exchange workflow.
- Duplicate phone allowed only if policy permits; duplicate code never allowed.

## Implementation Checklist

- [ ] Do not update AR balance directly.
- [ ] Link AR accounts per currency.
- [ ] Enforce credit rules.
- [ ] Add audit for limit/account changes.
- [ ] Add tests for disabled/credit-limit cases.

## Acceptance Criteria

- Customer balances derive from ledger.
- Currency-specific AR accounts are enforced.
- Disabled customer rules are enforced.
