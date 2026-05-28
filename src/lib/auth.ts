import { prisma } from "./prisma";
import { hashPassword, verifyPassword } from "./auth/password";
import {
  createToken,
  verifyToken,
  setSessionCookie,
  removeSessionCookie,
  getSessionToken,
  getSessionUser,
  validateSession,
  validateSessionWithDb,
  isTokenExpired,
  type TokenPayload,
  type AuthContext,
} from "./auth/session";
import { loginSchema } from "./auth/validation";
import { recordAuthAudit } from "./auth/audit";
import { checkRateLimit, resetRateLimit } from "./auth/rate-limit";
import { ALL_PERMISSION_KEYS, PERMISSIONS } from "./permissions";

export {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  setSessionCookie as setAuthCookie,
  removeSessionCookie as removeAuthCookie,
  getSessionToken as getAuthToken,
  getSessionUser as getCurrentUser,
  validateSession,
  validateSessionWithDb,
  isTokenExpired,
  recordAuthAudit,
  checkRateLimit,
  resetRateLimit,
  loginSchema,
};

export type { TokenPayload, AuthContext };

export function isSystemOwnerEmail(email?: string | null): boolean {
  const ownerEmail = process.env["SYSTEM_OWNER_EMAIL"]?.trim().toLowerCase();
  if (!ownerEmail || !email) return false;
  return email.trim().toLowerCase() === ownerEmail;
}

export function canBypassPermissions(user: TokenPayload | null): boolean {
  return isSystemOwnerEmail(user?.email);
}

export function resolvePermissionsForUser(
  user: Pick<TokenPayload, "email" | "permissions">,
): string[] {
  if (isSystemOwnerEmail(user.email)) return [...ALL_PERMISSION_KEYS];
  return user.permissions;
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = user.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.key),
  );

  const payload: Omit<TokenPayload, "iat" | "exp"> = {
    userId: user.id,
    email: user.email,
    name: user.name,
    roles,
    permissions,
  };

  const token = await createToken(payload);
  await setSessionCookie(token);

  return { user, token, payload };
}

export async function hasPermission(permissionKey: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  if (canBypassPermissions(user)) return true;
  return user.permissions.includes(permissionKey);
}

export async function hasRole(roleName: string): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  return user.roles.includes(roleName);
}

export function checkPermission(
  user: TokenPayload | null,
  permissionKey: string,
): boolean {
  if (!user) return false;
  if (canBypassPermissions(user)) return true;
  return user.permissions.includes(permissionKey);
}

export function checkRole(
  user: TokenPayload | null,
  roleName: string,
): boolean {
  if (!user) return false;
  return user.roles.includes(roleName);
}

export async function checkDbPermission(
  userId: string,
  permissionKey: string,
): Promise<boolean> {
  try {
    if (await isSystemOwnerById(userId)) return true;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
    if (!dbUser) return false;
    return dbUser.roles.some((ur) =>
      ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
    );
  } catch {
    return false;
  }
}

export async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      details: details as never,
      ipAddress,
    },
  });
}

/**
 * Checks if a user is the system owner (single user from SYSTEM_OWNER_EMAIL env var).
 * System owner bypasses ALL permission and company checks.
 */
export async function isSystemOwner(user: TokenPayload): Promise<boolean> {
  return canBypassPermissions(user);
}

export async function isSystemOwnerById(userId: string): Promise<boolean> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!dbUser) return false;
  return isSystemOwnerEmail(dbUser.email);
}

/**
 * Checks if a user can access a specific company.
 * - System owner bypasses company restriction.
 * - Users with `SETTINGS_MANAGE` permission (global admins) can access any company.
 * - Users with a `companyId` set can only access that company.
 * - Users without `companyId` and without global admin permission are denied.
 */
export async function canAccessCompany(
  user: TokenPayload,
  companyId: string,
): Promise<boolean> {
  // System owner bypasses company restriction
  if (await isSystemOwner(user)) return true;

  // Global admins (with SETTINGS_MANAGE) bypass company restriction
  const isGlobalAdmin = await checkDbPermission(
    user.userId,
    PERMISSIONS.SETTINGS_MANAGE,
  );
  if (isGlobalAdmin) return true;

  // Load user from DB to get current companyId (not stale JWT)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  if (!dbUser) return false;
  if (!dbUser.companyId) return false; // No company = no access unless global admin
  return dbUser.companyId === companyId;
}

/**
 * Server-side permission check using the database.
 * System owner bypasses all permission checks.
 * Use this for sensitive operations instead of JWT-based checkPermission
 * to avoid stale permission risks.
 */
export async function requireDbPermission(
  userId: string,
  permissionKey: string,
): Promise<boolean> {
  return checkDbPermission(userId, permissionKey);
}
