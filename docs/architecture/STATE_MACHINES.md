# State Machines

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/MODULE_BOUNDARIES.md`

## Used When

- Adding or changing statuses.
- Implementing posting, cancellation, approval, inventory, sessions, or fiscal periods.

## Do Not Use For

- Database constraints alone; read `DATABASE_CONSTRAINTS.md`.

## Global Rules

- Every transition must be implemented by a use case.
- Every transition must check permission, current state, validations, locks, and audit.
- A missing transition is forbidden.
- Posted/closed/final states are immutable.
- Recovery transitions must be explicit.

## Core Diagrams

### Sales Invoice

```text
DRAFT -> RESERVED -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> PARTIALLY_RETURNED
POSTED -> FULLY_RETURNED
POSTED -> CANCELLING -> REVERSED
DRAFT/RESERVED/APPROVED -> CANCELLED
```

### Purchase Invoice

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> PARTIALLY_RETURNED
POSTED -> FULLY_RETURNED
POSTED -> CANCELLING -> REVERSED
```

### Sales/Purchase Return

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> CANCELLING -> REVERSED
DRAFT -> CANCELLED
```

### Voucher

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> CANCELLING -> REVERSED
DRAFT/APPROVED -> CANCELLED
```

### Journal Entry

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
DRAFT -> POSTING -> POSTED
POSTED -> REVERSING -> REVERSED
DRAFT -> CANCELLED
POSTING -> POSTING_FAILED
```

### Stock Transfer

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> DISPATCHING -> IN_TRANSIT -> RECEIVING -> RECEIVED -> POSTED
APPROVED -> POSTING -> POSTED
POSTED -> REVERSING -> REVERSED
DRAFT/APPROVED -> CANCELLED
```

### Stock Adjustment

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED
POSTING -> POSTING_FAILED -> POSTING
POSTED -> REVERSING -> REVERSED
DRAFT -> CANCELLED
```

### Inventory Count

```text
DRAFT -> COUNTING -> REVIEW -> PENDING_APPROVAL -> APPROVED -> POSTING -> POSTED -> LOCKED
COUNTING/REVIEW -> CANCELLED
POSTING -> POSTING_FAILED -> POSTING
```

### Fiscal Period

```text
FUTURE -> OPEN -> CLOSING_IN_PROGRESS -> SOFT_CLOSED -> HARD_CLOSED -> ARCHIVED
HARD_CLOSED -> REOPEN_REQUESTED -> REOPENED -> CLOSING_IN_PROGRESS
CLOSING_IN_PROGRESS -> OPEN
```

### Approval Workflow

```text
NOT_REQUIRED
DRAFT -> SUBMITTED -> PENDING_APPROVAL -> PARTIALLY_APPROVED -> APPROVED
PENDING_APPROVAL -> REJECTED -> REWORK -> SUBMITTED
PENDING_APPROVAL -> EXPIRED -> SUBMITTED
PENDING_APPROVAL -> OVERRIDDEN
```

### Financial Posting

```text
REQUESTED -> LOCK_ACQUIRED -> VALIDATING -> BUILDING_JOURNAL -> PERSISTING -> COMMITTED
VALIDATING -> FAILED_VALIDATION
PERSISTING -> FAILED_ROLLED_BACK -> RETRY_PENDING -> REQUESTED
COMMITTED -> EVENT_PUBLISH_PENDING -> EVENTS_PUBLISHED
COMMITTED -> REVERSAL_REQUESTED -> REVERSED
```

### User Session

```text
ANONYMOUS -> AUTHENTICATED_LOW_TRUST -> ACTIVE
ACTIVE -> STEP_UP_REQUIRED -> HIGH_TRUST -> ACTIVE
ACTIVE -> REVOKED
ACTIVE -> EXPIRED
ANY -> LOCKED
LOCKED -> ACTIVE
```

## Forbidden Transitions

- POSTED -> DRAFT.
- POSTED -> CANCELLED without reversal.
- HARD_CLOSED -> OPEN without reopening workflow.
- PENDING_APPROVAL -> POSTING without approval/override.
- REVERSED -> POSTED.
- CANCELLED -> POSTING.

## Transition Matrices

### Sales Invoice

| Transition                                  | Permission          | Validations                                    | Lock                     | Posting                    | Rollback/Recovery                  | Audit             |
| ------------------------------------------- | ------------------- | ---------------------------------------------- | ------------------------ | -------------------------- | ---------------------------------- | ----------------- |
| DRAFT -> RESERVED                           | `sales.create`      | active lines, stock available                  | invoice + stock          | reservation only           | keep DRAFT on failure              | reservation audit |
| DRAFT/RESERVED -> PENDING_APPROVAL          | `sales.create`      | approval policy matched                        | invoice                  | none                       | rejection -> REJECTED              | submit snapshot   |
| PENDING_APPROVAL -> APPROVED                | `approvals.approve` | maker/checker, not expired                     | approval request         | none                       | edit invalidates approval          | approval action   |
| APPROVED/DRAFT/RESERVED -> POSTING          | `sales.post`        | period open, currency, approval, stock, totals | invoice + period + stock | journal + stock OUT + COGS | failure -> POSTING_FAILED          | posting start     |
| POSTING -> POSTED                           | system              | post-condition checks                          | DB tx                    | commit final               | no recovery needed                 | posted event      |
| POSTING_FAILED -> POSTING                   | `sales.post`        | same idempotency or safe retry                 | invoice                  | retry full posting         | fail remains POSTING_FAILED        | retry audit       |
| POSTED -> CANCELLING                        | `sales.cancel`      | reason, not reversed, period policy            | invoice + period         | start reversal             | failure -> REVERSAL_FAILED         | cancel request    |
| CANCELLING -> REVERSED                      | system              | reversal balanced, stock reverse valid         | invoice + stock          | reversal journal/movements | retry CANCELLING if failed         | reversal audit    |
| POSTED -> PARTIALLY_RETURNED/FULLY_RETURNED | `sales.return`      | returned qty valid                             | invoice + return         | creates return document    | return failure no invoice mutation | return audit      |

### Purchase Invoice

| Transition                                  | Permission          | Validations                                       | Lock              | Posting                        | Rollback/Recovery          | Audit          |
| ------------------------------------------- | ------------------- | ------------------------------------------------- | ----------------- | ------------------------------ | -------------------------- | -------------- |
| DRAFT -> PENDING_APPROVAL                   | `purchases.create`  | supplier, warehouse, lines, landed costs          | purchase          | none                           | rejection -> REWORK        | submit audit   |
| PENDING_APPROVAL -> APPROVED                | `approvals.approve` | approver eligible                                 | approval          | none                           | edit invalidates approval  | approval audit |
| DRAFT/APPROVED -> POSTING                   | `purchases.post`    | period, currency, mapping, valuation inputs       | purchase + stock  | inventory IN + AP/cash journal | failure -> POSTING_FAILED  | posting audit  |
| POSTING -> POSTED                           | system              | journal and valuation committed                   | DB tx             | final                          | no mutation after commit   | posted audit   |
| POSTED -> CANCELLING                        | `purchases.cancel`  | valuation layers not blocked or correction policy | purchase + layers | reversal/correction            | failure -> REVERSAL_FAILED | cancel audit   |
| POSTED -> PARTIALLY_RETURNED/FULLY_RETURNED | `purchases.return`  | return qty valid                                  | purchase + stock  | purchase return document       | return failure no mutation | return audit   |

### Voucher

| Transition                | Permission            | Validations                   | Lock               | Posting         | Rollback/Recovery         | Audit              |
| ------------------------- | --------------------- | ----------------------------- | ------------------ | --------------- | ------------------------- | ------------------ |
| DRAFT -> PENDING_APPROVAL | voucher-specific      | amount, account, counterparty | voucher            | none            | reject/rework             | submit audit       |
| DRAFT/APPROVED -> POSTING | voucher-specific post | period, currency, approval    | voucher + accounts | voucher journal | failure -> POSTING_FAILED | posting audit      |
| POSTED -> CANCELLING      | `vouchers.cancel`     | reason, period policy         | voucher            | reversal        | retry reversal            | cancellation audit |

### Stock Transfer

| Transition                      | Permission           | Validations                    | Lock                   | Posting                              | Rollback/Recovery                  | Audit          |
| ------------------------------- | -------------------- | ------------------------------ | ---------------------- | ------------------------------------ | ---------------------------------- | -------------- |
| DRAFT -> PENDING_APPROVAL       | `inventory.transfer` | warehouses differ, lines valid | transfer               | none                                 | reject/rework                      | submit audit   |
| APPROVED -> DISPATCHING/POSTING | `inventory.transfer` | source stock available         | source stock           | stock OUT or transfer pair           | failure -> approved/posting_failed | dispatch audit |
| IN_TRANSIT -> RECEIVED          | `inventory.transfer` | received qty <= dispatched     | transfer + destination | destination receipt                  | partial policy applies             | receive audit  |
| RECEIVED -> POSTED              | system               | movements balanced             | DB tx                  | OUT/IN and due-to/due-from if branch | rollback all                       | post audit     |

### Fiscal Period

| Transition                         | Permission               | Validations            | Lock   | Behavior              | Recovery                | Audit            |
| ---------------------------------- | ------------------------ | ---------------------- | ------ | --------------------- | ----------------------- | ---------------- |
| OPEN -> CLOSING_IN_PROGRESS        | `closing.month.start`    | no existing close run  | period | freeze posting        | abort -> OPEN           | close start      |
| CLOSING_IN_PROGRESS -> SOFT_CLOSED | `closing.execute`        | soft blockers resolved | period | soft lock             | reopen by permission    | close audit      |
| SOFT_CLOSED -> HARD_CLOSED         | `closing.execute`        | approvals, snapshots   | period | hard lock             | reopening only          | hard close audit |
| HARD_CLOSED -> REOPEN_REQUESTED    | `closing.reopen.request` | reason                 | period | request only          | reject keeps hard close | request audit    |
| REOPEN_REQUESTED -> REOPENED       | `closing.reopen.approve` | approver eligible      | period | unlock scoped posting | re-close required       | reopen audit     |

## Edge Cases

- Approval expires between approve and post: posting rejects.
- Document changes after approval: approval invalidates.
- Network failure after commit: query posting operation by idempotency key.
- Period closes while document is being posted: period lock order prevents race.
- Reversal fails after request: entity remains in REVERSAL_FAILED and can retry reversal only.

## Implementation Checklist

- [ ] Define transition in use case.
- [ ] Check permission.
- [ ] Check current state.
- [ ] Check period and approval guards.
- [ ] Add audit.
- [ ] Add tests for allowed and forbidden transitions.

## Acceptance Criteria

- No undocumented transition exists.
- State changes are transactional.
- Final states are immutable.
- Recovery states are explicit.
