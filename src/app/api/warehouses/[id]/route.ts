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

const warehouseUpdateSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").optional(),
  code: z.string().min(1, "كود المخزن مطلوب").optional(),
  branchId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.WAREHOUSES_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: { branch: { select: { name: true, code: true } } },
  });

  if (!warehouse) return notFoundError();

  if (
    warehouse.companyId &&
    !(await canAccessCompany(user, warehouse.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse(warehouse);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.WAREHOUSES_EDIT)))
    return forbiddenError();

  const { id } = await params;
  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (
    existing.companyId &&
    !(await canAccessCompany(user, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = warehouseUpdateSchema.parse(body);

    // Prevent changing companyId
    // (companyId is not in update schema, so this is enforced by schema design)

    // Per-company duplicate code check
    if (parsed.code && parsed.code !== existing.code && existing.companyId) {
      const duplicateCode = await prisma.warehouse.findFirst({
        where: {
          companyId: existing.companyId,
          code: parsed.code,
          id: { not: id },
        },
      });
      if (duplicateCode) {
        return conflictError("كود المخزن مستخدم مسبقاً في هذه الشركة");
      }
    }

    // Per-company duplicate name check
    if (parsed.name && parsed.name !== existing.name && existing.companyId) {
      const duplicateName = await prisma.warehouse.findFirst({
        where: {
          companyId: existing.companyId,
          name: parsed.name,
          id: { not: id },
        },
      });
      if (duplicateName) {
        return conflictError("اسم المخزن مستخدم مسبقاً في هذه الشركة");
      }
    }

    // Branch validation: if branchId provided or changed, must belong to same company and be active
    if (
      parsed.branchId !== undefined &&
      parsed.branchId !== existing.branchId
    ) {
      if (parsed.branchId === null) {
        // Allow clearing branchId
      } else if (existing.companyId) {
        const branch = await prisma.branch.findUnique({
          where: { id: parsed.branchId },
          select: { companyId: true, isActive: true },
        });
        if (!branch) {
          return errorResponse("الفرع غير موجود", 404);
        }
        if (branch.companyId !== existing.companyId) {
          return conflictError("الفرع لا ينتمي لنفس الشركة");
        }
        if (!branch.isActive) {
          return conflictError("الفرع غير نشط");
        }
      }
    }

    // Safe deactivate: if setting isActive=false, only allow if no business activity
    if (parsed.isActive === false) {
      const [invoiceCount, purchaseInvoiceCount, stockMovementCount] =
        await Promise.all([
          prisma.invoice.count({ where: { warehouseId: id } }),
          prisma.purchaseInvoice.count({ where: { warehouseId: id } }),
          prisma.stockMovement.count({ where: { warehouseId: id } }),
        ]);

      const totalRelated =
        invoiceCount + purchaseInvoiceCount + stockMovementCount;

      if (totalRelated > 0) {
        return conflictError(
          "لا يمكن تعطيل هذا المخزن لأنه يحتوي على عمليات أو بيانات مرتبطة",
        );
      }
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: parsed,
    });

    await logAudit(user.userId, "UPDATE", "Warehouse", id, {
      name: warehouse.name,
      code: warehouse.code,
    });

    return successResponse(warehouse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث المخزن", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.WAREHOUSES_DELETE)))
    return forbiddenError();

  const { id } = await params;
  const warehouse = await prisma.warehouse.findUnique({ where: { id } });
  if (!warehouse) return notFoundError();

  if (
    warehouse.companyId &&
    !(await canAccessCompany(user, warehouse.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const [invoiceCount, purchaseInvoiceCount, stockMovementCount] =
      await Promise.all([
        prisma.invoice.count({ where: { warehouseId: id } }),
        prisma.purchaseInvoice.count({ where: { warehouseId: id } }),
        prisma.stockMovement.count({ where: { warehouseId: id } }),
      ]);

    const totalRelated =
      invoiceCount + purchaseInvoiceCount + stockMovementCount;

    if (totalRelated > 0) {
      // Safe deactivate
      await prisma.warehouse.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit(user.userId, "DEACTIVATE", "Warehouse", id, {
        name: warehouse.name,
        reason: "has_activity",
        invoices: invoiceCount,
        purchaseInvoices: purchaseInvoiceCount,
        stockMovements: stockMovementCount,
      });

      return successResponse({
        id,
        action: "deactivated",
        isActive: false,
      });
    }

    // Hard delete allowed if no activity
    await prisma.warehouse.delete({ where: { id } });

    await logAudit(user.userId, "DELETE", "Warehouse", id, {
      name: warehouse.name,
      wasPermanent: true,
    });

    return successResponse({ id, action: "deleted" });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    return errorResponse("فشل حذف المخزن", 500);
  }
}
