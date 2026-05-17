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

const stockAdjustmentUpdateSchema = z.object({
  warehouseId: z.string().min(1).optional(),
  adjustmentDate: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
      PERMISSIONS.STOCK_ADJUSTMENTS_VIEW,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const adjustment = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: {
      warehouse: { select: { name: true, code: true } },
      lines: {
        include: {
          product: { select: { name: true, code: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!adjustment) return notFoundError();

  if (
    adjustment.companyId &&
    !(await canAccessCompany(user, adjustment.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse(adjustment);
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
      PERMISSIONS.STOCK_ADJUSTMENTS_EDIT,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const existing = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing) return notFoundError();

  if (
    existing.companyId &&
    !(await canAccessCompany(user, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (existing.status !== "DRAFT") {
    return conflictError("لا يمكن تعديل تسوية غير مسودة");
  }

  try {
    const body = await request.json();
    const parsed = stockAdjustmentUpdateSchema.parse(body);

    if (parsed.warehouseId && parsed.warehouseId !== existing.warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: parsed.warehouseId },
        select: { companyId: true, isActive: true },
      });
      if (!warehouse) return errorResponse("المخزن غير موجود", 404);
      if (!warehouse.isActive) return conflictError("المخزن غير نشط");
      if (warehouse.companyId && warehouse.companyId !== existing.companyId) {
        return conflictError("المخزن لا ينتمي لنفس الشركة");
      }
    }

    const updateData: Record<string, unknown> = { ...parsed };

    if (parsed.adjustmentDate !== undefined) {
      if (parsed.adjustmentDate === null) {
        delete updateData.adjustmentDate;
      } else {
        updateData.adjustmentDate = new Date(parsed.adjustmentDate);
      }
    }

    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }

    const adjustment = await prisma.stockAdjustment.update({
      where: { id },
      data: updateData,
    });

    await logAudit(user.userId, "UPDATE", "StockAdjustment", id, {
      companyId: adjustment.companyId,
      warehouseId: adjustment.warehouseId,
      adjustmentType: adjustment.adjustmentType,
    });

    return successResponse(adjustment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث تسوية المخزن", 500);
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
      PERMISSIONS.STOCK_ADJUSTMENTS_DELETE,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const adjustment = await prisma.stockAdjustment.findUnique({ where: { id } });
  if (!adjustment) return notFoundError();

  if (
    adjustment.companyId &&
    !(await canAccessCompany(user, adjustment.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (adjustment.status !== "DRAFT") {
    return conflictError("لا يمكن حذف تسوية غير مسودة");
  }

  await prisma.stockAdjustment.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "StockAdjustment", id, {
    companyId: adjustment.companyId,
    warehouseId: adjustment.warehouseId,
    adjustmentType: adjustment.adjustmentType,
  });

  return successResponse({ id, action: "deleted" });
}
