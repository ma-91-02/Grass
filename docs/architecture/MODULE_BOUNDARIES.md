# Module Boundaries

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/SYSTEM_OVERVIEW.md`

## Used When

- Working across modules.
- Adding services, use cases, or repositories.
- Preventing architecture drift.

## Do Not Use For

- Detailed posting rules; read `POSTING_ENGINE.md`.
- Detailed valuation rules; read `INVENTORY_VALUATION.md`.

## Boundary Rules

- UI never imports Prisma.
- Routes are thin and call use cases.
- Repositories only persist and query.
- Use cases orchestrate guards, services, transactions, and audit.
- Modules communicate by services, DTOs, or outbox events.
- Read-only cross-module queries are allowed through defined interfaces.
- Cross-module writes are forbidden unless routed through the owning use case/service.

## Module Contracts

| Module | Owns | Cannot Modify | Must Use |
|---|---|---|---|
| Sales | Sales invoices, returns, sales workflow | Ledger, balances, stock balances | PostingService, InventoryReservationService |
| Purchases | Purchase invoices, landed costs, returns | Ledger, direct product cost, AP balances | PostingService, ValuationEngine |
| Accounting | Accounts, journals, vouchers, ledger | Stock quantities | LedgerValidator, ReversalService |
| Inventory | Movements, balances cache, reservations, valuation layers | AR/AP/cash ledger | InventoryMovementService, ValuationEngine |
| Approvals | Policies, requests, actions | Source document financial effects | ApprovalGuard |
| Closing | Period status, close tasks, snapshots | Posted source mutation | ClosingOrchestrator |
| Reporting | Facts, projections, exports, snapshots | Operational data | ReportingEngine |
| Security | Auth, sessions, MFA, security events | Business source states | AuthService, PermissionService |
| Users | Users, roles, permissions | Financial data | PermissionService |

## Forbidden Dependencies

- Sales -> direct Accounting repositories for writes.
- Sales -> stock balance update.
- Purchases -> direct cost mutation.
- Inventory -> direct journal insert.
- Reporting -> operational writes.
- Route handlers -> business logic.
- UI -> Prisma.

## Communication Rules

- Synchronous writes: use owning use case.
- Async projections: use outbox events.
- Shared data: DTOs, not raw Prisma models.
- Financial effects: PostingService only.
- Stock effects: InventoryMovementService/ValuationEngine only.

## Implementation Checklist

- [ ] Identify owning module.
- [ ] Identify forbidden writes.
- [ ] Use owning service/use case.
- [ ] Use DTOs across module boundaries.
- [ ] Add tests for boundary violations when relevant.

## Acceptance Criteria

- No cross-module write bypass.
- No giant service.
- No business logic in route handlers.
- No direct stock/balance mutation.
