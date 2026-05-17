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
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.INVENTORY_VALUATION_VIEW,
    ))
  )
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const warehouseId = searchParams.get("warehouseId");
  const productId = searchParams.get("productId");
  const categoryId = searchParams.get("categoryId");

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
  if (productId) whereClause.productId = productId;

  if (categoryId) {
    whereClause.product = {
      categoryId,
    };
  }

  const balances = await prisma.stockBalance.findMany({
    where: whereClause,
    include: {
      product: {
        select: {
          name: true,
          code: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      },
      warehouse: { select: { name: true, code: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  let totalQuantity = 0;
  let totalValue = 0;
  let totalAvailable = 0;

  const byWarehouse: Record<
    string,
    {
      warehouseId: string;
      warehouseName: string;
      warehouseCode: string;
      quantity: number;
      availableQuantity: number;
      totalValue: number;
      averageCost: number;
    }
  > = {};

  const byProduct: Record<
    string,
    {
      productId: string;
      productName: string;
      productCode: string;
      categoryId: string | null;
      categoryName: string | null;
      quantity: number;
      availableQuantity: number;
      totalValue: number;
      averageCost: number;
    }
  > = {};

  for (const b of balances) {
    const qty = b.quantityOnHand;
    const reserved = b.reservedQuantity;
    const available = qty - reserved;
    const value = Number(b.totalValue);

    totalQuantity += qty;
    totalValue += value;
    totalAvailable += available;

    // byWarehouse
    const whKey = b.warehouseId;
    if (!byWarehouse[whKey]) {
      byWarehouse[whKey] = {
        warehouseId: whKey,
        warehouseName: b.warehouse?.name || "",
        warehouseCode: b.warehouse?.code || "",
        quantity: 0,
        availableQuantity: 0,
        totalValue: 0,
        averageCost: 0,
      };
    }
    byWarehouse[whKey].quantity += qty;
    byWarehouse[whKey].availableQuantity += available;
    byWarehouse[whKey].totalValue += value;
    // weighted average for warehouse
    if (byWarehouse[whKey].quantity > 0) {
      byWarehouse[whKey].averageCost =
        byWarehouse[whKey].totalValue / byWarehouse[whKey].quantity;
    }

    // byProduct
    const pKey = b.productId;
    if (!byProduct[pKey]) {
      byProduct[pKey] = {
        productId: pKey,
        productName: b.product?.name || "",
        productCode: b.product?.code || "",
        categoryId: b.product?.categoryId || null,
        categoryName: b.product?.category?.name || null,
        quantity: 0,
        availableQuantity: 0,
        totalValue: 0,
        averageCost: 0,
      };
    }
    byProduct[pKey].quantity += qty;
    byProduct[pKey].availableQuantity += available;
    byProduct[pKey].totalValue += value;
    if (byProduct[pKey].quantity > 0) {
      byProduct[pKey].averageCost =
        byProduct[pKey].totalValue / byProduct[pKey].quantity;
    }
  }

  const overallAverageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

  const data = {
    totalQuantity,
    totalAvailableQuantity: totalAvailable,
    totalValue,
    currency: balances.length > 0 ? balances[0].currency : "IQD",
    overallAverageCost,
    itemCount: balances.length,
    byWarehouse: Object.values(byWarehouse),
    byProduct: Object.values(byProduct),
  };

  return successResponse(data);
}
