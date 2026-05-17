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

const stockTransferUpdateSchema = z.object({
  fromWarehouseId: z.string().min(1).optional(),
  toWarehouseId: z.string().min(1).optional(),
  transferDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_TRANSFERS_VIEW))
  )
    return forbiddenError();

  const { id } = await params;
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      fromWarehouse: { select: { name: true, code: true } },
      toWarehouse: { select: { name: true, code: true } },
      lines: {
        include: {
          product: { select: { name: true, code: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!transfer) return notFoundError();

  if (
    transfer.companyId &&
    !(await canAccessCompany(user, transfer.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse(transfer);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_TRANSFERS_EDIT))
  )
    return forbiddenError();

  const { id } = await params;
  const existing = await prisma.stockTransfer.findUnique({
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
    return conflictError("لا يمكن تعديل تحويل غير مسود");
  }

  try {
    const body = await request.json();
    const parsed = stockTransferUpdateSchema.parse(body);

    // Validate warehouses if changed
    if (
      parsed.fromWarehouseId &&
      parsed.fromWarehouseId !== existing.fromWarehouseId
    ) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: parsed.fromWarehouseId },
        select: { companyId: true, isActive: true },
      });
      if (!warehouse) return errorResponse("المخزن المصدر غير موجود", 404);
      if (!warehouse.isActive) return conflictError("المخزن المصدر غير نشط");
      if (warehouse.companyId && warehouse.companyId !== existing.companyId) {
        return conflictError("المخزن المصدر لا ينتمي لنفس الشركة");
      }
    }

    if (
      parsed.toWarehouseId &&
      parsed.toWarehouseId !== existing.toWarehouseId
    ) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: parsed.toWarehouseId },
        select: { companyId: true, isActive: true },
      });
      if (!warehouse) return errorResponse("المخزن الوجهة غير موجود", 404);
      if (!warehouse.isActive) return conflictError("المخزن الوجهة غير نشط");
      if (warehouse.companyId && warehouse.companyId !== existing.companyId) {
        return conflictError("المخزن الوجهة لا ينتمي لنفس الشركة");
      }
    }

    if (
      parsed.fromWarehouseId &&
      parsed.toWarehouseId &&
      parsed.fromWarehouseId === parsed.toWarehouseId
    ) {
      return conflictError("المخزن المصدر والوجهة يجب أن يكونا مختلفين");
    }

    const updateData: Record<string, unknown> = { ...parsed };

    if (parsed.transferDate !== undefined) {
      if (parsed.transferDate === null) {
        delete updateData.transferDate;
      } else {
        updateData.transferDate = new Date(parsed.transferDate);
      }
    }

    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    }

    const transfer = await prisma.stockTransfer.update({
      where: { id },
      data: updateData,
    });

    await logAudit(user.userId, "UPDATE", "StockTransfer", id, {
      companyId: transfer.companyId,
      fromWarehouseId: transfer.fromWarehouseId,
      toWarehouseId: transfer.toWarehouseId,
    });

    return successResponse(transfer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث تحويل المخزن", 500);
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
      PERMISSIONS.STOCK_TRANSFERS_DELETE,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const transfer = await prisma.stockTransfer.findUnique({ where: { id } });
  if (!transfer) return notFoundError();

  if (
    transfer.companyId &&
    !(await canAccessCompany(user, transfer.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (transfer.status !== "DRAFT") {
    return conflictError("لا يمكن حذف تحويل غير مسود");
  }

  await prisma.stockTransfer.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "StockTransfer", id, {
    companyId: transfer.companyId,
    fromWarehouseId: transfer.fromWarehouseId,
    toWarehouseId: transfer.toWarehouseId,
  });

  return successResponse({ id, action: "deleted" });
}
