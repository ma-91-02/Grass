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

const stockMovementUpdateSchema = z.object({
  productId: z.string().min(1).optional(),
  warehouseId: z.string().min(1).optional(),
  movementType: z
    .enum([
      "OPENING_BALANCE",
      "IN",
      "OUT",
      "ADJUSTMENT_IN",
      "ADJUSTMENT_OUT",
      "TRANSFER_OUT",
      "TRANSFER_IN",
    ])
    .optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  movementDate: z.string().optional().nullable(),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().optional().nullable(),
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
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_MOVEMENTS_VIEW))
  )
    return forbiddenError();

  const { id } = await params;
  const movement = await prisma.stockMovement.findUnique({
    where: { id },
    include: {
      product: { select: { name: true, code: true } },
      warehouse: { select: { name: true, code: true } },
    },
  });

  if (!movement) return notFoundError();

  if (
    movement.companyId &&
    !(await canAccessCompany(user, movement.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse(movement);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_MOVEMENTS_EDIT))
  )
    return forbiddenError();

  const { id } = await params;
  const existing = await prisma.stockMovement.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (
    existing.companyId &&
    !(await canAccessCompany(user, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  // Only DRAFT can be edited
  if (existing.status !== "DRAFT") {
    return conflictError("لا يمكن تعديل حركة مخزون غير مسودة");
  }

  try {
    const body = await request.json();
    const parsed = stockMovementUpdateSchema.parse(body);

    // Validate product if changed
    if (parsed.productId && parsed.productId !== existing.productId) {
      const product = await prisma.product.findUnique({
        where: { id: parsed.productId },
        select: { companyId: true, isActive: true, productType: true },
      });
      if (!product) return errorResponse("المادة غير موجودة", 404);
      if (!product.isActive) return conflictError("المادة غير نشطة");
      if (product.productType === "SERVICE")
        return conflictError("المواد من نوع خدمة لا تسمح بحركات مخزون");
      if (product.companyId && product.companyId !== existing.companyId) {
        return conflictError("المادة لا تنتمي لنفس الشركة");
      }
    }

    // Validate warehouse if changed
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

    const movementDate = parsed.movementDate
      ? new Date(parsed.movementDate)
      : undefined;

    const updateData: Record<string, unknown> = { ...parsed };
    if (movementDate) updateData.movementDate = movementDate;
    delete updateData.movementDate; // handled above
    if (parsed.movementDate === null) updateData.movementDate = new Date();

    const movement = await prisma.stockMovement.update({
      where: { id },
      data: updateData,
    });

    await logAudit(user.userId, "UPDATE", "StockMovement", id, {
      productId: movement.productId,
      warehouseId: movement.warehouseId,
      movementType: movement.movementType,
      quantity: movement.quantity,
    });

    return successResponse(movement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث حركة المخزون", 500);
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
      PERMISSIONS.STOCK_MOVEMENTS_DELETE,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const movement = await prisma.stockMovement.findUnique({ where: { id } });
  if (!movement) return notFoundError();

  if (
    movement.companyId &&
    !(await canAccessCompany(user, movement.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  // Only DRAFT can be deleted
  if (movement.status !== "DRAFT") {
    return conflictError("لا يمكن حذف حركة مخزون غير مسودة");
  }

  await prisma.stockMovement.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "StockMovement", id, {
    productId: movement.productId,
    warehouseId: movement.warehouseId,
    movementType: movement.movementType,
    quantity: movement.quantity,
  });

  return successResponse({ id, action: "deleted" });
}
