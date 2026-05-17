# Chart of Accounts

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/FINANCIAL_INVARIANTS.md`
- `docs/architecture/DATABASE_CONSTRAINTS.md`

## Used When

- Creating or changing accounts, account tree, account mappings, payment accounts, AR/AP accounts, or protected/system accounts.

## Do Not Use For

- Voucher posting details; read `POSTING_ENGINE.md`.

## Structure

- 1 Assets
  - Cash IQD.
  - Cash USD.
  - Banks IQD/USD.
  - AR IQD/USD.
  - Inventory.
- 2 Liabilities
  - AP IQD/USD.
  - Accrued expenses.
- 3 Equity
  - Capital.
  - Retained earnings.
- 4 Revenue
  - Sales IQD/USD.
  - FX gains.
  - Discounts earned.
- 5 Expenses/Costs
  - COGS.
  - Operating expenses.
  - Discounts allowed.
  - Damage/inventory loss.
  - FX losses.

## Account Fields

- code.
- name.
- parentId.
- type.
- subtype.
- normalBalance.
- currency.
- level.
- isPosting.
- isSystem.
- isProtected.
- isActive.
- allowManualJournal.

## Rules

- Parent accounts do not receive journal lines.
- Posting accounts cannot have children.
- Account currency cannot change after activity.
- Protected/system accounts cannot change type/subtype/normalBalance.
- Accounts with activity cannot be deleted.
- Disable instead of delete when historical activity exists.

## System Mappings

- Default cash IQD/USD.
- Default bank IQD/USD.
- Default AR IQD/USD.
- Default AP IQD/USD.
- Inventory.
- Sales revenue.
- COGS.
- Discount allowed/earned.
- FX gain/loss.
- Opening balance equity.
- Rounding account if enabled.

## APIs

- `GET /api/accounts`
- `POST /api/accounts`
- `GET /api/accounts/:id`
- `PATCH /api/accounts/:id`
- `DELETE /api/accounts/:id`
- `POST /api/accounts/:id/disable`

## Validations

- Code unique per company.
- Name required.
- Currency required.
- Parent compatibility.
- isPosting false if children exist.
- Cannot delete account with children or journal lines.

## Implementation Checklist

- [ ] Preserve tree rules.
- [ ] Preserve currency isolation.
- [ ] Protect system accounts.
- [ ] Add audit.
- [ ] Add tests for deletion/disable constraints.

## Acceptance Criteria

- Chart supports ledger posting safely.
- System account mappings are complete.
- Protected accounts are safe from accidental mutation.
