import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  logAudit,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
} from "@/lib/api-response";
import { z } from "zod";

const categoryUpdateSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").optional(),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.PRODUCT_CATEGORIES_VIEW,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const category = await prisma.productCategory.findUnique({ where: { id } });
  if (!category) return notFoundError();

  if (
    category.companyId &&
    !(await canAccessCompany(user, category.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse(category);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.PRODUCT_CATEGORIES_EDIT,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const existing = await prisma.productCategory.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (
    existing.companyId &&
    !(await canAccessCompany(user, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = categoryUpdateSchema.parse(body);

    // Duplicate name check within same company
    if (parsed.name && parsed.name !== existing.name) {
      const duplicate = await prisma.productCategory.findFirst({
        where: {
          companyId: existing.companyId,
          name: parsed.name,
          id: { not: id },
        },
      });
      if (duplicate) {
        return conflictError("اسم التصنيف موجود مسبقاً في هذه الشركة");
      }
    }

    const updated = await prisma.productCategory.update({
      where: { id },
      data: parsed,
    });

    await logAudit(user.userId, "UPDATE", "ProductCategory", id, {
      name: updated.name,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث التصنيف", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.PRODUCT_CATEGORIES_DELETE,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const category = await prisma.productCategory.findUnique({ where: { id } });
  if (!category) return notFoundError();

  if (
    category.companyId &&
    !(await canAccessCompany(user, category.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const productsCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productsCount > 0) {
    // Safe deactivate instead of hard delete
    const updated = await prisma.productCategory.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit(user.userId, "DEACTIVATE", "ProductCategory", id, {
      name: category.name,
      reason: "has_products",
      productsCount,
    });

    return successResponse({ id, action: "deactivated", isActive: false });
  }

  await prisma.productCategory.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "ProductCategory", id, {
    name: category.name,
  });

  return successResponse({ id, action: "deleted" });
}
