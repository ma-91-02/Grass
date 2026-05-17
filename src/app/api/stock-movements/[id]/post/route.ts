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
import { StockBalanceService } from "@/lib/services/stock-balance-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_MOVEMENTS_POST))
  )
    return forbiddenError();

  const { id } = await params;
  const movement = await prisma.stockMovement.findUnique({
    where: { id },
    include: {
      product: { select: { name: true, code: true, isActive: true } },
      warehouse: { select: { name: true, code: true, isActive: true } },
    },
  });

  if (!movement) return notFoundError();

  if (
    movement.companyId &&
    !(await canAccessCompany(user, movement.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  // Only DRAFT can be posted
  if (movement.status !== "DRAFT") {
    return conflictError("لا يمكن ترحيل حركة مخزون غير مسودة");
  }

  // Validate product/warehouse still active
  if (!movement.product?.isActive) {
    return conflictError("المادة غير نشطة");
  }
  if (!movement.warehouse?.isActive) {
    return conflictError("المخزن غير نشط");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return StockBalanceService.applyPostedMovement(tx, id);
    });

    if (!result.success) {
      return conflictError(result.error || "فشل ترحيل حركة المخزون");
    }

    await logAudit(user.userId, "POST", "StockMovement", id, {
      productId: movement.productId,
      warehouseId: movement.warehouseId,
      movementType: movement.movementType,
      quantity: movement.quantity,
      unitCost: Number(movement.unitCost ?? 0),
      currency: movement.currency,
      previousStatus: "DRAFT",
      newStatus: "POSTED",
      newBalance: result.balance?.quantityOnHand,
      newAverageCost: result.balance?.averageCost,
      newTotalValue: result.balance?.totalValue,
    });

    return successResponse({
      id,
      action: "posted",
      status: "POSTED",
      movement: result.movement,
      balance: result.balance,
    });
  } catch (error) {
    console.error("Post stock movement error:", error);
    return errorResponse("فشل ترحيل حركة المخزون", 500);
  }
}
