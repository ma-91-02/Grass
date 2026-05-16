import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const data = logs.map((l) => ({
    id: l.id,
    userId: l.userId,
    userName: l.user.name,
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    details: l.details,
    createdAt: l.createdAt.toISOString(),
  }));

  return successResponse(data);
}
