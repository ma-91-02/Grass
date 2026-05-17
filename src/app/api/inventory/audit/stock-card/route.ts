import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  successResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.INVENTORY_AUDIT_VIEW))
  )
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const productId = searchParams.get("productId");
  const warehouseId = searchParams.get("warehouseId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!productId) {
    return forbiddenError("المادة مطلوبة");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  let effectiveCompanyId = companyId;
  if (!effectiveCompanyId && !isGlobalAdmin && dbUser?.companyId) {
    effectiveCompanyId = dbUser.companyId;
  }

  if (effectiveCompanyId) {
    if (!(await canAccessCompany(user, effectiveCompanyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }
  } else {
    return forbiddenError("الشركة مطلوبة");
  }

  // Fetch product and warehouse info
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { name: true, code: true, companyId: true },
  });

  if (!product || product.companyId !== effectiveCompanyId) {
    return forbiddenError("المادة غير موجودة أو لا تنتمي لهذه الشركة");
  }

  const whereClause: Record<string, unknown> = {
    companyId: effectiveCompanyId,
    productId,
    status: "POSTED",
  };

  if (warehouseId) whereClause.warehouseId = warehouseId;

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
      warehouse: { select: { name: true, code: true } },
    },
    orderBy: { movementDate: "asc" },
  });

  // Calculate running totals
  let runningQuantity = 0;
  let runningValue = 0;

  const increaseTypes = new Set([
    "OPENING_BALANCE",
    "IN",
    "ADJUSTMENT_IN",
    "TRANSFER_IN",
  ]);

  const cardLines = movements.map((m) => {
    const qty = m.quantity;
    const unitCost = Number(m.unitCost ?? 0);

    if (increaseTypes.has(m.movementType)) {
      runningQuantity += qty;
      runningValue += qty * unitCost;
    } else {
      runningQuantity -= qty;
      runningValue -= qty * unitCost;
    }

    const avgCostAfter =
      runningQuantity > 0 ? runningValue / runningQuantity : 0;

    return {
      id: m.id,
      movementDate: m.movementDate,
      movementType: m.movementType,
      quantity: qty,
      unitCost,
      currency: m.currency,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      reason: m.reason,
      notes: m.notes,
      warehouseName: m.warehouse?.name || null,
      warehouseCode: m.warehouse?.code || null,
      runningQuantity,
      runningValue,
      averageCostAfter: avgCostAfter,
    };
  });

  const finalBalance = await prisma.stockBalance.findUnique({
    where: {
      companyId_productId_warehouseId: {
        companyId: effectiveCompanyId,
        productId,
        warehouseId: warehouseId || "",
      },
    },
  });

  const data = {
    product: {
      id: productId,
      name: product.name,
      code: product.code,
    },
    warehouseFilter: warehouseId || null,
    dateRange: { from, to },
    movements: cardLines,
    finalBalance: finalBalance
      ? {
          quantityOnHand: finalBalance.quantityOnHand,
          reservedQuantity: finalBalance.reservedQuantity,
          averageCost: Number(finalBalance.averageCost),
          totalValue: Number(finalBalance.totalValue),
          currency: finalBalance.currency,
        }
      : null,
  };

  return successResponse(data);
}
