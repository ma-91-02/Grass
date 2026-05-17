# System Overview

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`

## Used When

- Starting general architecture, UI layout, navigation, module planning, or onboarding tasks.

## Do Not Use For

- Detailed posting logic.
- Detailed inventory valuation.
- Detailed security implementation.

## Goal

GRASS ERP is an Arabic RTL distribution ERP for Iraq and the Middle East. It supports distribution, wholesale, multi-warehouse operations, IQD/USD currency isolation, accounting-first workflows, and audit-safe financial records.

## Architecture

- Frontend/Backend: Next.js App Router.
- Database: PostgreSQL.
- ORM: Prisma.
- Validation: Zod.
- UI: Tailwind and shadcn/ui.
- Style: Arabic-only, RTL-only, dense ERP screens.
- Architecture: Clean Architecture, SOLID, DRY, KISS, type safety, separation of concerns.

## Layers

- Presentation:
  - Dashboard pages.
  - Arabic RTL forms.
  - Dense tables.
  - Dialogs/drawers for entity selection and confirmation.
- Application:
  - Use cases.
  - Transaction orchestration.
  - Permission and guard checks.
- Domain:
  - Accounting, Inventory, Sales, Purchases, Partners, Users, Reports.
- Infrastructure:
  - Prisma repositories.
  - PostgreSQL transactions.
  - Audit writer.
  - Outbox/worker jobs.

## Core Modules

- Dashboard.
- Accounting.
- Sales.
- Purchases.
- Inventory.
- Warehouses.
- Customers.
- Suppliers.
- Employees.
- Users and permissions.
- Reports.
- Settings.

## Navigation

- `/dashboard`
- `/dashboard/accounts`
- `/dashboard/sales`
- `/dashboard/purchases`
- `/dashboard/products`
- `/dashboard/warehouses`
- `/dashboard/customers`
- `/dashboard/suppliers`
- `/dashboard/users`
- `/dashboard/roles`
- `/dashboard/reports`
- `/dashboard/settings`
- `/dashboard/audit-logs`

## UX Rules

- Sidebar on the right.
- Topbar includes search, quick create, current exchange rate, user/session.
- Breadcrumbs on detail pages.
- Every table supports loading, empty, error, and success states.
- Every financial amount shows currency.
- Do not put business logic in UI.

## Implementation Checklist

- [ ] Confirm feature belongs to a module.
- [ ] Confirm Arabic RTL UI.
- [ ] Confirm route and API boundaries.
- [ ] Confirm permissions and audit.
- [ ] Confirm whether posting or inventory effects exist.

## Acceptance Criteria

- Feature fits existing module structure.
- UI is Arabic RTL.
- No cross-module writes from UI/routes.
- Required specialized docs were read for financial/inventory/security work.
