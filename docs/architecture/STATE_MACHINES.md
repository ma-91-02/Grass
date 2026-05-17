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
