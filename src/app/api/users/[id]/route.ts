import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hashPassword,
  logAudit,
  checkPermission,
} from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.USERS_VIEW)) return forbiddenError();

  const { id } = await params;
  const found = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });

  if (!found) return notFoundError();

  return successResponse({
    id: found.id,
    name: found.name,
    email: found.email,
    isActive: found.isActive,
    phone: found.phone,
    roles: found.roles.map((r) => r.role.name),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (!checkPermission(currentUser, PERMISSIONS.USERS_EDIT))
    return forbiddenError();

  const { id } = await params;
  const body = await request.json();
  const { name, email, password, phone, isActive, roleIds } = body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password) updateData.passwordHash = await hashPassword(password);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...updateData,
      roles: roleIds
        ? {
            deleteMany: {},
            create: roleIds.map((roleId: string) => ({ roleId })),
          }
        : undefined,
    },
    include: { roles: { include: { role: true } } },
  });

  await logAudit(currentUser.userId, "UPDATE", "User", id, { name, email });

  return successResponse({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    isActive: updated.isActive,
    phone: updated.phone,
    roles: updated.roles.map((r) => r.role.name),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();
  if (!checkPermission(currentUser, PERMISSIONS.USERS_DELETE))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  await prisma.user.delete({ where: { id } });
  await logAudit(currentUser.userId, "DELETE", "User", id);

  return successResponse({ deleted: true });
}
