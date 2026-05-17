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
