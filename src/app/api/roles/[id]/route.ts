import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, requireDbPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  serverError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();
    if (!(await requireDbPermission(user.userId, PERMISSIONS.ROLES_VIEW)))
      return forbiddenError();

    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!role) return notFoundError();

    return successResponse({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((p) => p.permission.key),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedError();
    if (
      !(await requireDbPermission(currentUser.userId, PERMISSIONS.ROLES_MANAGE))
    )
      return forbiddenError();

    const { id } = await params;
    const body = await request.json();
    const { name, description, permissionIds } = body;

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return notFoundError();

    if (existing.isSystem && name !== undefined && name !== existing.name) {
      return errorResponse("لا يمكن تغيير اسم دور النظام");
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...updateData,
        permissions:
          permissionIds !== undefined
            ? {
                deleteMany: {},
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

    await logAudit(currentUser.userId, "UPDATE", "Role", id, {
      name: updated.name,
    });

    return successResponse({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isSystem: updated.isSystem,
      permissions: updated.permissions.map((p) => p.permission.key),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedError();
    if (
      !(await requireDbPermission(currentUser.userId, PERMISSIONS.ROLES_MANAGE))
    )
      return forbiddenError();

    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!role) return notFoundError();

    if (role.isSystem) {
      return errorResponse("لا يمكن حذف دور النظام");
    }

    if (role._count.users > 0) {
      return errorResponse(
        "لا يمكن حذف دور مرتبط بمستخدمين. قم بإزالة المستخدمين من الدور أولاً",
      );
    }

    await prisma.role.delete({ where: { id } });
    await logAudit(currentUser.userId, "DELETE", "Role", id);

    return successResponse({ action: "deleted", roleId: id });
  } catch (error) {
    return serverError(error);
  }
}
