# API Standards

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/TRANSACTION_RULES.md` for mutations.

## Used When

- Creating or changing API routes.
- Designing DTOs, validation, errors, filtering, sorting, or pagination.

## Do Not Use For

- Internal-only pure domain calculations.

## Request Lifecycle

```text
request -> requestId -> auth -> session trust -> permission -> branch scope -> Zod validation -> business validation -> state guard -> invariant guard -> use case -> audit -> response
```

## Response Format

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_...",
    "page": 1,
    "pageSize": 50,
    "total": 100
  }
}
```

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "PERIOD_LOCKED",
    "message": "الفترة المالية مغلقة",
    "details": {},
    "requestId": "req_..."
  }
}
```

## Standard Error Codes

- `VALIDATION_ERROR`
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `STATE_TRANSITION_DENIED`
- `PERIOD_LOCKED`
- `CURRENCY_MISMATCH`
- `JOURNAL_NOT_BALANCED`
- `STOCK_NOT_AVAILABLE`
- `APPROVAL_REQUIRED`
- `IDEMPOTENCY_CONFLICT`
- `POSTING_LOCKED`

## Pagination

- Default `pageSize`: 50.
- Maximum `pageSize`: 200.
- Use keyset pagination for journal lines, stock movements, and audit logs.
- Use offset pagination only for small master data.

## Filtering and Sorting

- Filters must be allowlisted.
- Sort fields must be allowlisted.
- Date range is required for heavy reports.
- Search must be safe and parameterized.

## Mutation Standards

- Financial mutations require idempotency key.
- Editable documents require version/optimistic concurrency.
- Server recalculates totals.
- Client never sends audit fields.
- Mutation response returns new state and related ids.

## API Versioning

- Internal APIs remain stable.
- Breaking changes require versioning or migration.
- Response shape must not change silently.

## Implementation Checklist

- [ ] Add Zod schema.
- [ ] Add permission check.
- [ ] Add state guard.
- [ ] Add transaction boundary.
- [ ] Add audit.
- [ ] Normalize errors.
- [ ] Add API tests.

## Acceptance Criteria

- API contract is predictable.
- Errors are actionable and Arabic.
- Mutations are retry-safe where required.
- Sensitive APIs enforce permissions server-side.
