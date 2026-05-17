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
import { stockTransferFormSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_TRANSFERS_VIEW))
  )
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const fromWarehouseId = searchParams.get("fromWarehouseId");
  const toWarehouseId = searchParams.get("toWarehouseId");
  const status = searchParams.get("status");

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

  if (fromWarehouseId) whereClause.fromWarehouseId = fromWarehouseId;
  if (toWarehouseId) whereClause.toWarehouseId = toWarehouseId;
  if (status) whereClause.status = status;

  const transfers = await prisma.stockTransfer.findMany({
    where: whereClause,
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
    orderBy: { transferDate: "desc" },
  });

  return successResponse(transfers);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.STOCK_TRANSFERS_CREATE,
    ))
  )
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = stockTransferFormSchema.parse(body);

    if (!(await canAccessCompany(user, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Validate warehouses
    const [fromWarehouse, toWarehouse] = await Promise.all([
      prisma.warehouse.findUnique({
        where: { id: parsed.fromWarehouseId },
        select: { companyId: true, isActive: true, name: true },
      }),
      prisma.warehouse.findUnique({
        where: { id: parsed.toWarehouseId },
        select: { companyId: true, isActive: true, name: true },
      }),
    ]);

    if (!fromWarehouse) {
      return errorResponse("المخزن المصدر غير موجود", 404);
    }
    if (!toWarehouse) {
      return errorResponse("المخزن الوجهة غير موجود", 404);
    }
    if (!fromWarehouse.isActive) {
      return conflictError("المخزن المصدر غير نشط");
    }
    if (!toWarehouse.isActive) {
      return conflictError("المخزن الوجهة غير نشط");
    }
    if (
      fromWarehouse.companyId &&
      fromWarehouse.companyId !== parsed.companyId
    ) {
      return conflictError("المخزن المصدر لا ينتمي لنفس الشركة");
    }
    if (toWarehouse.companyId && toWarehouse.companyId !== parsed.companyId) {
      return conflictError("المخزن الوجهة لا ينتمي لنفس الشركة");
    }

    // Validate products
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

    // Generate transfer number
    const count = await prisma.stockTransfer.count({
      where: { companyId: parsed.companyId },
    });
    const transferNumber = `TR-${parsed.companyId.slice(-4)}-${String(count + 1).padStart(5, "0")}`;

    const transferDate = parsed.transferDate
      ? new Date(parsed.transferDate)
      : new Date();

    const transfer = await prisma.stockTransfer.create({
      data: {
        companyId: parsed.companyId,
        fromWarehouseId: parsed.fromWarehouseId,
        toWarehouseId: parsed.toWarehouseId,
        transferNumber,
        transferDate,
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
        fromWarehouse: { select: { name: true, code: true } },
        toWarehouse: { select: { name: true, code: true } },
        lines: {
          include: {
            product: { select: { name: true, code: true } },
          },
        },
      },
    });

    await logAudit(user.userId, "CREATE", "StockTransfer", transfer.id, {
      companyId: transfer.companyId,
      fromWarehouseId: transfer.fromWarehouseId,
      toWarehouseId: transfer.toWarehouseId,
      transferNumber: transfer.transferNumber,
      lineCount: parsed.lines.length,
    });

    return successResponse(transfer, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل إنشاء تحويل المخزن", 500);
  }
}
