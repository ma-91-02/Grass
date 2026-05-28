import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, requireDbPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

const categorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const { id } = await params;
  const category = await prisma.customerCategory.findUnique({
    where: { id },
    include: { _count: { select: { customers: true } } },
  });
  if (!category) return notFoundError();

  return successResponse({
    id: category.id,
    name: category.name,
    description: category.description,
    isActive: category.isActive,
    customerCount: category._count.customers,
    createdAt: category.createdAt,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!(await requireDbPermission(currentUser.userId, PERMISSIONS.CUSTOMER_CATEGORIES_EDIT))) {
    return forbiddenError("لا تملك صلاحية تعديل قسم");
  }

  const { id } = await params;
  const existing = await prisma.customerCategory.findUnique({
    where: { id },
  });
  if (!existing) return notFoundError();

  try {
    const body = await request.json();
    const parsed = categorySchema.parse(body);

    if (parsed.name && parsed.name !== existing.name) {
      const duplicate = await prisma.customerCategory.findUnique({
        where: { name: parsed.name },
      });
      if (duplicate) {
        return conflictError("القسم موجود مسبقاً");
      }
    }

    const category = await prisma.customerCategory.update({
      where: { id },
      data: parsed,
    });

    try {
      await logAudit(currentUser.userId, "UPDATE", "CustomerCategory", id, {
        name: category.name,
      });
    } catch {
      console.error("Audit log failed for category update");
    }

    return successResponse(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث القسم", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!(await requireDbPermission(currentUser.userId, PERMISSIONS.CUSTOMER_CATEGORIES_DELETE))) {
    return forbiddenError("لا تملك صلاحية حذف قسم");
  }

  try {
    const { id } = await params;

    const category = await prisma.customerCategory.findUnique({
      where: { id },
      include: { _count: { select: { customers: true } } },
    });
    if (!category) return notFoundError();

    if (category._count.customers > 0) {
      return conflictError(
        "لا يمكن حذف هذا القسم لأنه مستخدم في عملاء. يمكنك تعطيله فقط.",
      );
    }

    await prisma.customerCategory.delete({ where: { id } });

    try {
      await logAudit(currentUser.userId, "DELETE", "CustomerCategory", id, {
        name: category.name,
      });
    } catch {
      console.error("Audit log failed for category delete");
    }

    return successResponse({ id });
  } catch (error) {
    console.error("Delete customer category error:", error);
    return errorResponse("فشل حذف القسم", 500);
  }
}
