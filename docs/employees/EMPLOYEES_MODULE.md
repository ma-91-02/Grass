# Employees Module

## Required Reading

- `docs/ai/AI_GLOBAL_RULES.md`
- `docs/users/AUTH_RBAC.md`

## Used When

- Implementing employees, attendance, user-employee linking, shifts, overtime, or future payroll foundation.

## Do Not Use For

- User permission rules; read `AUTH_RBAC.md`.
- Payroll accounting posting until payroll docs exist.

## Goal

Employees module manages employee master data and attendance. Payroll is future scope and must later integrate through PostingService.

## Tables

- `employees`
- `attendance_records`
- optional user link through `users.employeeId`

## Employee Fields

- name.
- phone.
- address.
- jobTitle.
- monthlySalary.
- workingDays.
- dailyHours.
- hourlyRate.
- workStartTime.
- workEndTime.
- isActive.
- notes.

## Attendance Workflow

```text
NO_RECORD -> CHECKED_IN -> CHECKED_OUT
NO_RECORD -> ABSENT
CHECKED_IN -> MISSING_CHECKOUT
```

## Calculations

- totalHours = checkout - checkin.
- lateMinutes = max(0, checkin - shiftStart).
- overtime = max(0, totalHours - dailyHours).
- hourlyRate can be derived from salary policy or stored snapshot.

## Validations

- One attendance record per employee/date.
- checkOut must be after checkIn.
- Inactive employees cannot receive new attendance except correction.
- Correction requires reason and audit.

## APIs

- `GET /api/employees`
- `POST /api/employees`
- `PATCH /api/employees/:id`
- `POST /api/employees/:id/disable`
- `GET /api/attendance`
- `POST /api/attendance`
- `PATCH /api/attendance/:id`

## Permissions

- `employees.view`
- `employees.create`
- `employees.edit`
- `employees.disable`
- `employees.attendance`

## Audit

- Employee create/update/disable.
- Attendance create/update/correction.
- User-employee link changes.

## Edge Cases

- Duplicate attendance date: reject.
- Missing checkout: flag for review.
- Employee linked to user then disabled: user access handled by Auth/RBAC policy.

## Implementation Checklist

- [ ] Enforce unique employee/date attendance.
- [ ] Add time calculations.
- [ ] Add correction reason.
- [ ] Add audit.
- [ ] Keep payroll posting out until formally designed.

## Acceptance Criteria

- Attendance calculations are deterministic.
- Attendance corrections are audited.
- Employee/user linkage is safe.
