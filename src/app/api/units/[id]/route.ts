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
} from "@/lib/api-response";
import { z } from "zod";

const unitUpdateSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").optional(),
  symbol: z.string().optional().nullable(),
  type: z.enum(["PIECE", "BOX", "LITER", "KG", "OTHER"] as const).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.UNITS_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const unit = await prisma.unit.findUnique({ where: { id } });
  if (!unit) return notFoundError();

  if (unit.companyId && !(await canAccessCompany(user, unit.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse(unit);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.UNITS_EDIT)))
    return forbiddenError();

  const { id } = await params;
  const existing = await prisma.unit.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (
    existing.companyId &&
    !(await canAccessCompany(user, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = unitUpdateSchema.parse(body);

    const updated = await prisma.unit.update({
      where: { id },
      data: parsed,
    });

    await logAudit(user.userId, "UPDATE", "Unit", id, {
      name: updated.name,
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث الوحدة", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.UNITS_DELETE)))
    return forbiddenError();

  const { id } = await params;
  const unit = await prisma.unit.findUnique({ where: { id } });
  if (!unit) return notFoundError();

  if (unit.companyId && !(await canAccessCompany(user, unit.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  // Check if unit is used by any product
  const productsCount = await prisma.product.count({
    where: { unitId: id },
  });

  if (productsCount > 0) {
    // Safe deactivate
    await prisma.unit.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit(user.userId, "DEACTIVATE", "Unit", id, {
      name: unit.name,
      reason: "has_products",
      productsCount,
    });

    return successResponse({ id, action: "deactivated", isActive: false });
  }

  await prisma.unit.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "Unit", id, {
    name: unit.name,
    wasPermanent: true,
  });

  return successResponse({ id, action: "deleted" });
}
