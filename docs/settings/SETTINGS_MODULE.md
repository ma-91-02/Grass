# Settings Module

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/accounting/CHART_OF_ACCOUNTS.md`
- `docs/architecture/SECURITY_ARCHITECTURE.md`

## Used When

- Implementing company settings, system account mappings, numbering, currencies, exchange rates, fiscal periods, sales policies, inventory policies, or protected configuration.

## Do Not Use For

- Normal operational document posting.

## Goal

Settings define policies and mappings required by posting, inventory, security, and reporting. Missing or unsafe settings must block affected operations.

## Setting Areas

- Company profile.
- Currencies.
- Exchange rates.
- Fiscal years and periods.
- Document numbering.
- System account mappings.
- Sales policies.
- Inventory policies.
- Approval policies.
- Export/security policies.

## Required Account Mappings

- defaultCashIQDAccount.
- defaultCashUSDAccount.
- defaultBankIQDAccount.
- defaultBankUSDAccount.
- defaultAR_IQD.
- defaultAR_USD.
- defaultAP_IQD.
- defaultAP_USD.
- inventoryAccount.
- salesRevenueIQD/USD.
- cogsAccount.
- discountAllowed.
- discountEarned.
- fxGain.
- fxLoss.
- openingBalanceEquity.
- roundingAccount if rounding is enabled.

## Policy Examples

- `inventory.allowNegativeStock`
- `sales.requireCustomerForCreditInvoice`
- `sales.allowOverpayment`
- `sales.creditLimitOverrideRequiresApproval`
- `posting.requireApprovalAboveAmount`
- `exports.fullLedgerRequiresApproval`
- `security.requireMfaForPrivilegedOperations`

## APIs

- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/exchange-rates`
- `POST /api/exchange-rates`
- `GET /api/fiscal-periods`
- `POST /api/fiscal-periods/:id/lock`
- `POST /api/fiscal-periods/:id/reopen`

## Permissions

- `settings.view`
- `settings.manage`
- `exchangeRates.view`
- `exchangeRates.manage`
- `periods.lock`
- `periods.reopen.request`
- `periods.reopen.approve`

## Audit

- Any setting change.
- Exchange rate creation.
- System account mapping changes.
- Numbering policy changes.
- Period lock/reopen.
- Security/export policy changes.

## Edge Cases

- Missing system account mapping: posting rejects.
- Exchange rate used by document: cannot edit retroactively.
- Numbering sequence conflict: lock and retry.
- Changing policy affects future operations only unless explicitly versioned.

## Implementation Checklist

- [ ] Validate required mappings before posting.
- [ ] Protect system settings with permissions.
- [ ] Audit all changes.
- [ ] Version policies where historical behavior matters.
- [ ] Add tests for missing mappings.

## Acceptance Criteria

- Posting cannot proceed with missing mappings.
- Exchange snapshots remain historical.
- Sensitive settings require permission and audit.
