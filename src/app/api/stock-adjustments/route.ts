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
  conflictError,
} from "@/lib/api-response";
import { stockAdjustmentFormSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.STOCK_ADJUSTMENTS_VIEW,
    ))
  )
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const warehouseId = searchParams.get("warehouseId");
  const status = searchParams.get("status");
  const adjustmentType = searchParams.get("adjustmentType");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  const whereClause: Record<string, unknown> = {};

  if (companyId) {
    if (!(await canAccessCompany(user, companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }
    whereClause.companyId = companyId;
  } else if (!isGlobalAdmin && dbUser?.companyId) {
    whereClause.companyId = dbUser.companyId;
  }

  if (warehouseId) whereClause.warehouseId = warehouseId;
  if (status) whereClause.status = status;
  if (adjustmentType) whereClause.adjustmentType = adjustmentType;

  const adjustments = await prisma.stockAdjustment.findMany({
    where: whereClause,
    include: {
      warehouse: { select: { name: true, code: true } },
      lines: {
        include: {
          product: { select: { name: true, code: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
    orderBy: { adjustmentDate: "desc" },
  });

  return successResponse(adjustments);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.STOCK_ADJUSTMENTS_CREATE,
    ))
  )
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = stockAdjustmentFormSchema.parse(body);

    if (!(await canAccessCompany(user, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: parsed.warehouseId },
      select: { companyId: true, isActive: true, name: true },
    });

    if (!warehouse) {
      return errorResponse("المخزن غير موجود", 404);
    }
    if (!warehouse.isActive) {
      return conflictError("المخزن غير نشط");
    }
    if (warehouse.companyId && warehouse.companyId !== parsed.companyId) {
      return conflictError("المخزن لا ينتمي لنفس الشركة");
    }

    for (const line of parsed.lines) {
      const product = await prisma.product.findUnique({
        where: { id: line.productId },
        select: { companyId: true, isActive: true, productType: true },
      });
      if (!product) {
        return errorResponse("المادة غير موجودة", 404);
      }
      if (!product.isActive) {
        return conflictError("المادة غير نشطة");
      }
      if (product.productType === "SERVICE") {
        return conflictError("المواد من نوع خدمة لا تسمح بحركات مخزون");
      }
      if (product.companyId && product.companyId !== parsed.companyId) {
        return conflictError("المادة لا تنتمي لنفس الشركة");
      }
    }

    const count = await prisma.stockAdjustment.count({
      where: { companyId: parsed.companyId },
    });
    const adjustmentNumber = `AD-${parsed.companyId.slice(-4)}-${String(count + 1).padStart(5, "0")}`;

    const adjustmentDate = parsed.adjustmentDate
      ? new Date(parsed.adjustmentDate)
      : new Date();

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        companyId: parsed.companyId,
        warehouseId: parsed.warehouseId,
        adjustmentNumber,
        adjustmentType: parsed.adjustmentType,
        adjustmentDate,
        reason: parsed.reason,
        notes: parsed.notes,
        createdById: user.userId,
        lines: {
          create: parsed.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitCost: line.unitCost ?? 0,
            currency: line.currency,
            notes: line.notes,
          })),
        },
      },
      include: {
        warehouse: { select: { name: true, code: true } },
        lines: {
          include: {
            product: { select: { name: true, code: true } },
          },
        },
      },
    });

    await logAudit(user.userId, "CREATE", "StockAdjustment", adjustment.id, {
      companyId: adjustment.companyId,
      warehouseId: adjustment.warehouseId,
      adjustmentType: adjustment.adjustmentType,
      adjustmentNumber: adjustment.adjustmentNumber,
      lineCount: parsed.lines.length,
    });

    return successResponse(adjustment, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل إنشاء تسوية المخزن", 500);
  }
}
