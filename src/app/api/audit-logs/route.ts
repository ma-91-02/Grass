import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireDbPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  successResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.AUDIT_LOGS_VIEW)))
    return forbiddenError();

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const data = logs.map((l) => ({
    id: l.id,
    userId: l.userId,
    userName: l.user?.name || "حدث أمني بدون مستخدم",
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    details: l.details,
    createdAt: l.createdAt.toISOString(),
  }));

  return successResponse(data);
}
