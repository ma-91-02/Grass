import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireDbPermission } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.ROLES_VIEW)))
    return forbiddenError();

  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: { permission: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const data = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissions: r.permissions.map((p) => p.permission.key),
  }));

  return successResponse(data);
}
