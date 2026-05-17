# Accounting Engine

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/FINANCIAL_INVARIANTS.md`
- `docs/architecture/TRANSACTION_RULES.md`

## Used When

- Working on accounts, journals, vouchers, ledgers, statements, balances, cash/bank, AR/AP, or accounting reports.

## Do Not Use For

- Inventory valuation details; read `INVENTORY_VALUATION.md`.
- Sales invoice UI-only tasks; read sales docs.

## Goal

The accounting engine is ledger-first. Journal entries and journal lines are the source of truth for financial reporting, balances, AR/AP, cash/bank, and statements.

## Core Rules

- Double entry accounting is mandatory.
- Debit total must equal credit total.
- Each journal has one currency.
- Account currency must match journal line currency.
- Posted financial records are immutable.
- Corrections use reversal or correction journals.
- Balances are derived from journal lines.
- Exchange rate snapshots are stored on documents.

## Core Tables

- `accounts`
- `journal_entries`
- `journal_lines`
- `vouchers`
- `voucher_lines`
- `account_opening_balances`
- `exchange_rates`
- `payment_accounts`
- `posting_operations`
- `posting_links`

## Vouchers

- Receipt voucher:
  - Debit cash/bank.
  - Credit customer AR or selected account.
- Payment voucher:
  - Debit supplier AP/expense/selected account.
  - Credit cash/bank.
- Exchange voucher:
  - Uses currency-safe exchange workflow.
- Allowance voucher:
  - Customer allowance: Debit discount allowed, Credit AR.
  - Supplier allowance: Debit AP, Credit discount earned.
- Entry voucher:
  - Manual journal with strict approval and balancing.

## Account Statement

- Opening balance is calculated from journal lines before `fromDate`.
- Running balance:
  - Debit-normal accounts: balance += debit - credit.
  - Credit-normal accounts: balance += credit - debit.
- Use keyset pagination.
- Filter by account, currency, date, source, partner, warehouse, product.

## APIs

- `GET /api/accounts`
- `POST /api/accounts`
- `PATCH /api/accounts/:id`
- `DELETE /api/accounts/:id`
- `GET /api/account-statement`
- `GET /api/account-balances`
- `POST /api/vouchers`
- `POST /api/vouchers/:id/post`
- `POST /api/vouchers/:id/cancel`
- `POST /api/journals`
- `POST /api/journals/:id/post`
- `POST /api/journals/:id/reverse`

## Validations

- Account must be active and posting-enabled.
- Parent accounts cannot receive postings.
- Journal must balance.
- Currency must be isolated.
- Fiscal period must be open.
- Protected accounts require permission/approval.

## Permissions

- `accounts.view`
- `accounts.create`
- `accounts.edit`
- `accounts.delete`
- `accounts.statement`
- `accounts.balances`
- `journals.create`
- `journals.post`
- `journals.reverse`
- `vouchers.receipt`
- `vouchers.payment`
- `vouchers.exchange`
- `vouchers.allowance`
- `vouchers.entry`

## Audit

- Account create/update/disable.
- Voucher draft/post/reverse/cancel.
- Journal draft/post/reverse.
- Opening balances.
- Exchange rates.

## Edge Cases

- Duplicate journal source: reject or idempotent replay.
- Posted mutation attempt: reject and audit.
- Missing account mapping: reject posting.
- Currency mismatch: reject and require exchange workflow.

## Implementation Checklist

- [ ] Use ledger as source of truth.
- [ ] Use PostingService for financial effects.
- [ ] Validate period/currency/account state.
- [ ] Write audit.
- [ ] Add tests for balanced/unbalanced cases.

## Acceptance Criteria

- No unbalanced journal can post.
- No mixed-currency journal can post.
- Posted journals cannot mutate.
- Statements derive from journal lines.
