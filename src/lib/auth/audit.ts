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
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || "unknown",
        action: params.action,
        entity: "AUTH",
        entityId: params.userId,
        details: {
          email: params.email,
          ...params.details,
        } as never,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch {
    console.error("Failed to record auth audit");
  }
}
