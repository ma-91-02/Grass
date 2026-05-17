# Acceptance Criteria

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`

## Used When

- Reviewing tasks, PRs, AI output, or phase completion.

## Do Not Use For

- Detailed module implementation without module docs.

## Global Acceptance Criteria

- No direct balance updates.
- No direct stock updates.
- No posted record mutation.
- No financial write outside PostingService.
- No stock write outside InventoryMovementService/ValuationEngine.
- No business logic in routes.
- No Prisma inside UI.
- Permissions enforced server-side.
- Audit created for sensitive writes.
- Tests added for success and failure paths.
- Relevant documentation updated when APIs, workflows, schema, posting logic, permissions, architecture, module behavior, or business rules change.
- Checks are run: format, lint, typecheck, tests, build, and relevant health checks where available.
- Changes are committed with a clear commit message after checks pass.
- Changes are pushed to GitHub after checks pass.
- Arabic final report is provided.
- Secrets, `.env` files, tokens, API keys, credentials, and sensitive production data are never committed.

## Financial Acceptance

- Journal entries balance.
- Currency isolation is enforced.
- Exchange rate snapshots are stored.
- Reversal does not edit original record.
- Account statements derive from journal lines.
- AR/AP balances reconcile with ledger.

## Inventory Acceptance

- Every stock effect has movement.
- Stock balance reconciles with movements.
- Valuation is deterministic.
- Negative stock policy is enforced.
- Movement source links exist.

## API Acceptance

- Zod validation exists.
- Error format follows standard.
- Pagination/filtering rules are followed.
- Mutation has audit.
- Idempotency exists where required.

## UI Acceptance

- Arabic RTL.
- Loading/empty/error/success states.
- Permission-based actions.
- Currency visible.
- No business logic in components.

## Implementation Checklist

- [ ] Read required docs.
- [ ] Confirm module boundary.
- [ ] Confirm invariants.
- [ ] Confirm tests.
- [ ] Confirm audit.

## Acceptance Criteria

- This file is used during task review.
- Any violation blocks completion.
- A task is not DONE unless code, tests, documentation, checks, GitHub push, and Arabic final report are complete or blockers are explicitly reported.
