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
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_BALANCES_VIEW))
  )
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const productId = searchParams.get("productId");
  const warehouseId = searchParams.get("warehouseId");

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

  const balances = await prisma.stockBalance.findMany({
    where: whereClause,
    include: {
      product: { select: { name: true, code: true } },
      warehouse: { select: { name: true, code: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const data = balances.map((b) => ({
    id: b.id,
    companyId: b.companyId,
    productId: b.productId,
    productName: b.product?.name || null,
    productCode: b.product?.code || null,
    warehouseId: b.warehouseId,
    warehouseName: b.warehouse?.name || null,
    warehouseCode: b.warehouse?.code || null,
    quantityOnHand: b.quantityOnHand,
    reservedQuantity: b.reservedQuantity,
    availableQuantity: b.quantityOnHand - b.reservedQuantity,
    unitCost: Number(b.unitCost),
    averageCost: Number(b.averageCost),
    totalValue: Number(b.totalValue),
    currency: b.currency,
    lastMovementId: b.lastMovementId,
    updatedAt: b.updatedAt,
  }));

  return successResponse(data);
}
