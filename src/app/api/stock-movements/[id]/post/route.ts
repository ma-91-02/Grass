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

  // Only DRAFT can be posted
  if (movement.status !== "DRAFT") {
    return conflictError("لا يمكن ترحيل حركة مخزون غير مسودة");
  }

  // Foundation only: change status to POSTED without balance calculation
  // Phase 2.4 will implement actual stock balance updates
  const updated = await prisma.stockMovement.update({
    where: { id },
    data: { status: "POSTED" },
  });

  await logAudit(user.userId, "POST", "StockMovement", id, {
    productId: movement.productId,
    warehouseId: movement.warehouseId,
    movementType: movement.movementType,
    quantity: movement.quantity,
    previousStatus: "DRAFT",
    newStatus: "POSTED",
    note: "Posted without balance calculation (Phase 2.3 foundation)",
  });

  return successResponse({
    id,
    action: "posted",
    status: "POSTED",
    movement: updated,
  });
}
