# Auth and RBAC

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/architecture/SECURITY_ARCHITECTURE.md`

## Used When

- Working on login, logout, sessions, users, roles, permissions, direct permissions, branch permissions, MFA, or route protection.

## Do Not Use For

- Financial posting rules.

## Auth Rules

- Login uses email and password.
- Passwords must be hashed.
- Sessions use secure httpOnly cookies.
- Failed login attempts are rate limited.
- User disable revokes access.
- Password change revokes prior sessions.

## RBAC

- User -> Roles -> Permissions.
- User -> Direct Permissions.
- Future explicit deny may be added.
- Backend checks are mandatory.

## Permission Enforcement

- Middleware protects dashboard access.
- Layout hides unavailable navigation.
- Pages verify permission.
- APIs enforce final permission checks.
- UI hiding is not security.

## User Management

- Create user.
- Link employee.
- Assign roles.
- Assign direct permissions.
- Disable user.
- Reset password.
- View/revoke sessions.

## Branch Scope

- Users may be scoped to branches.
- Branch scope must be checked in APIs.
- Central admin may have cross-branch scope.

## APIs

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `GET /api/roles`
- `POST /api/roles`
- `GET /api/permissions`
- `POST /api/users/:id/permissions`

## Audit

- Login success/failure.
- Logout.
- User create/update/disable.
- Role assignment.
- Permission change.
- Password reset.
- Session revoke.

## Implementation Checklist

- [ ] Hash passwords.
- [ ] Enforce server permissions.
- [ ] Add session trust checks.
- [ ] Write audit.
- [ ] Add security tests.

## Acceptance Criteria

- Unauthorized API calls are denied.
- Disabled users cannot access system.
- Permission changes are audited.
