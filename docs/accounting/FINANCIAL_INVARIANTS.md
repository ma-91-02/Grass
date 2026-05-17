# Financial Invariants

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`

## Used When

- Any task touching ledger, posting, balances, currency, audit, fiscal periods, inventory accounting, or reports.

## Do Not Use For

- Pure static UI with no financial meaning.

## Non-Negotiable Invariants

| Invariant | Enforcement | Failure | Recovery |
|---|---|---|---|
| Journal balancing | JournalBuilder + LedgerValidator | Reject/rollback | Fix builder/source |
| Immutable posting | State guard + repository allowlist | Reject and audit | Reversal/correction |
| Reversal-only correction | ReversalService | Reject direct edit | Reverse original |
| Currency isolation | CurrencyGuard | Reject | Exchange voucher/workflow |
| Ledger consistency | Posting links + reconciliation | Block close | Approved repair |
| AR/AP derived | Reporting from journal lines | Ignore direct balance | Rebuild read model |
| Stock movement integrity | InventoryMovementService | Reject/block close | Correction movement |
| Fiscal period locking | PeriodGuard | 423 reject | Reopen/adjustment |
| Audit immutability | AuditService + append-only policy | Security incident | Restore/investigate |
| Posting atomicity | TransactionManager | Rollback | Retry/recover |

## Journal Rules

- At least two lines.
- Debit and credit non-negative.
- One of debit/credit must be positive.
- Both cannot be positive in the same line.
- Total debit equals total credit.
- All lines use one currency.
- Account currency matches line currency.

## Currency Rules

- IQD and USD are isolated.
- Cash IQD and Cash USD are separate accounts.
- Bank IQD and Bank USD are separate accounts.
- Customer and supplier accounts are per currency.
- Exchange rate snapshots never change retroactively.

## Inventory Accounting Rules

- Sales create COGS and Inventory credit.
- Purchases create Inventory debit and AP/Cash credit.
- Damage creates expense and Inventory credit.
- Adjustments create formal movement and journal when financial.

## Period Rules

- OPEN allows posting.
- CLOSING_IN_PROGRESS blocks normal posting.
- SOFT_CLOSED allows approved adjustments only.
- HARD_CLOSED blocks all posting.
- Reopening requires approval and audit.

## Audit Implications

- Invariant failure creates audit/security event.
- Critical financial invariant failure freezes affected scope.
- Recovery requires approval and documented reason.

## Implementation Checklist

- [ ] Validate invariant before commit.
- [ ] Validate post-condition after persistence.
- [ ] Add failure behavior.
- [ ] Add reconciliation path.
- [ ] Add tests for invariant failures.

## Acceptance Criteria

- No financial corruption can be silently persisted.
- Reports reconcile with ledger.
- Corrections are traceable.
- Currency isolation is enforced.
