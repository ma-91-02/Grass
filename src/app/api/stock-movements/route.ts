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
import { stockMovementFormSchema } from "@/lib/schemas";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_MOVEMENTS_VIEW))
  )
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const productId = searchParams.get("productId");
  const warehouseId = searchParams.get("warehouseId");
  const status = searchParams.get("status");
  const movementType = searchParams.get("movementType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

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

  if (productId) whereClause.productId = productId;
  if (warehouseId) whereClause.warehouseId = warehouseId;
  if (status) whereClause.status = status;
  if (movementType) whereClause.movementType = movementType;

  if (from || to) {
    whereClause.movementDate = {};
    if (from)
      (whereClause.movementDate as Record<string, unknown>).gte = new Date(
        from,
      );
    if (to)
      (whereClause.movementDate as Record<string, unknown>).lte = new Date(to);
  }

  const movements = await prisma.stockMovement.findMany({
    where: whereClause,
    include: {
      product: { select: { name: true, code: true, productType: true } },
      warehouse: { select: { name: true, code: true } },
    },
    orderBy: { movementDate: "desc" },
  });

  return successResponse(movements);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.STOCK_MOVEMENTS_CREATE,
    ))
  )
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = stockMovementFormSchema.parse(body);

    if (!(await canAccessCompany(user, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Product validation
    const product = await prisma.product.findUnique({
      where: { id: parsed.productId },
      select: {
        companyId: true,
        isActive: true,
        productType: true,
        name: true,
      },
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

    // Warehouse validation
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

    // Opening balance can only be created when no prior posted balance exists
    if (parsed.movementType === "OPENING_BALANCE") {
      const existingBalance = await prisma.stockBalance.findUnique({
        where: {
          companyId_productId_warehouseId: {
            companyId: parsed.companyId,
            productId: parsed.productId,
            warehouseId: parsed.warehouseId,
          },
        },
      });
      if (existingBalance) {
        return conflictError(
          "يوجد رصيد افتتاحي مسجل مسبقاً لهذه المادة في هذا المخزن",
        );
      }
    }

    const movementDate = parsed.movementDate
      ? new Date(parsed.movementDate)
      : new Date();

    const movement = await prisma.stockMovement.create({
      data: {
        companyId: parsed.companyId,
        productId: parsed.productId,
        warehouseId: parsed.warehouseId,
        movementType: parsed.movementType,
        quantity: parsed.quantity,
        unitCost: parsed.unitCost ?? 0,
        currency: parsed.currency,
        movementDate,
        referenceType: parsed.referenceType,
        referenceId: parsed.referenceId,
        reason: parsed.reason,
        notes: parsed.notes,
        createdById: user.userId,
      },
    });

    await logAudit(user.userId, "CREATE", "StockMovement", movement.id, {
      productId: movement.productId,
      warehouseId: movement.warehouseId,
      movementType: movement.movementType,
      quantity: movement.quantity,
      companyId: movement.companyId,
    });

    return successResponse(movement, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل إنشاء حركة المخزون", 500);
  }
}
