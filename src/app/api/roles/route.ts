import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, requireDbPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  serverError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  try {
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
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedError();
    if (
      !(await requireDbPermission(currentUser.userId, PERMISSIONS.ROLES_MANAGE))
    )
      return forbiddenError();

    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name) {
      return errorResponse("اسم الدور مطلوب");
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return errorResponse("الدور موجود مسبقاً", 409);
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissionIds?.length
          ? {
              create: permissionIds.map((permissionId: string) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    await logAudit(currentUser.userId, "CREATE", "Role", role.id, {
      name,
      description,
    });

    return successResponse(
      {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.permissions.map((p) => p.permission.key),
      },
      201,
    );
  } catch (error) {
    return serverError(error);
  }
}
