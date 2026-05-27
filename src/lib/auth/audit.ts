import { prisma } from "@/lib/prisma";

export type AuthAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "PASSWORD_CHANGED";

export async function recordAuthAudit(params: {
  userId?: string;
  email?: string;
  action: AuthAction;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const success =
      params.action === "LOGIN_SUCCESS" ||
      params.action === "LOGOUT" ||
      params.action === "PASSWORD_CHANGED";

    await prisma.auditLog.create({
      data: {
        ...(params.userId ? { userId: params.userId } : {}),
        action: params.action,
        entity: "AUTH",
        entityId: params.userId || null,
        details: {
          email: params.email,
          success,
          ...params.details,
        } as never,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to record auth audit", error);
    return false;
  }
}
