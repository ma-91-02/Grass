# Testing Strategy

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- Relevant module file.
- `docs/accounting/FINANCIAL_INVARIANTS.md` for financial tasks.

## Used When

- Adding tests, reviewing implementation, or validating ERP safety.

## Do Not Use For

- Replacing module-specific acceptance criteria.

## Test Types

- Unit tests:
  - calculators.
  - guards.
  - builders.
- Integration tests:
  - use case + DB.
  - posting.
  - inventory movement.
- Invariant tests:
  - journal balance.
  - currency isolation.
  - immutable posting.
- Concurrency tests:
  - idempotency.
  - stock locks.
  - duplicate numbering.
- E2E tests:
  - critical user workflows.
- Security tests:
  - permissions.
  - session trust.
  - export controls.

## Required Financial Tests

- Cash sales invoice.
- Credit sales invoice.
- Mixed sales invoice.
- Purchase cash invoice.
- Purchase credit invoice.
- Receipt voucher.
- Payment voucher.
- Exchange voucher.
- Reversal for posted types.
- Period lock rejection.
- Idempotent retry.

## Required Inventory Tests

- Purchase increases stock.
- Sale decreases stock.
- Transfer creates OUT/IN.
- Adjustment creates movement.
- Count creates adjustments for differences only.
- Negative stock blocked unless override.
- Valuation recalculation deterministic.

## Required Approval Tests

- Maker cannot approve own document when forbidden.
- Amount threshold triggers approval.
- Expired approval blocks posting.
- Edit after approval invalidates approval.
- Emergency override audited.

## Fixture Strategy

- Fixed chart of accounts.
- Fixed fiscal periods.
- Fixed exchange rates.
- Fixed products and costs.
- Deterministic document numbers.
- Decimal assertions with explicit precision.

## Implementation Checklist

- [ ] Add unit tests for calculations.
- [ ] Add integration tests for posting.
- [ ] Add failure tests.
- [ ] Add permission tests.
- [ ] Add concurrency/idempotency tests when needed.

## Acceptance Criteria

- Financial invariants are tested.
- Inventory integrity is tested.
- Rollback and retry are tested.
- Security rules are tested.
