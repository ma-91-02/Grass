# Security Architecture

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/users/AUTH_RBAC.md`
- `docs/users/AUDIT_LOGS.md`

## Used When

- Implementing auth, sessions, MFA, permissions, exports, privileged operations, or suspicious activity monitoring.

## Do Not Use For

- Normal module UI with no sensitive operation; read relevant module docs instead.

## Security Principles

- Backend permission checks are mandatory.
- UI hiding is not security.
- Financial privileged operations require step-up verification when policy requires.
- Audit and security events must be append-only.
- Exports of sensitive data must be controlled and logged.

## Session Trust

- States:
  - ANONYMOUS.
  - AUTHENTICATED_LOW_TRUST.
  - ACTIVE.
  - STEP_UP_REQUIRED.
  - HIGH_TRUST.
  - LOCKED.
  - REVOKED.
  - EXPIRED.
- High trust expires quickly.
- Role/permission changes downgrade sessions.

## MFA and Step-Up

Required for:

- Manual journal posting on protected accounts.
- Period reopening.
- Emergency approval override.
- Full ledger export.
- Role/permission changes.
- Large payment vouchers when configured.

## Device and IP Controls

- New devices can trigger MFA.
- Trusted devices must store fingerprint hashes only.
- IP restrictions may apply to privileged roles.
- Suspicious IP/session changes create security events.

## Secure Export Controls

- Export permission must be specific.
- Full ledger exports require approval when configured.
- Files must expire.
- Downloads must be audited.
- Sensitive exports should be watermarked.

## Signed Financial Events

- Journal posted/reversed.
- Period closed/reopened.
- Exchange rate created.
- Security-sensitive permission changes.

## Implementation Checklist

- [ ] Enforce backend permission.
- [ ] Apply session trust.
- [ ] Add MFA/step-up if privileged.
- [ ] Add audit and security event.
- [ ] Avoid logging secrets.
- [ ] Add tests.

## Acceptance Criteria

- Privileged actions are protected.
- Sessions can be revoked/downgraded.
- Exports are logged.
- Security events are traceable.
