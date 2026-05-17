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
  const warehouseId = searchParams.get("warehouseId");
  const productId = searchParams.get("productId");

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

  // Fetch balances
  const balanceWhere: Record<string, unknown> = {
    companyId: effectiveCompanyId,
  };
  if (warehouseId) balanceWhere.warehouseId = warehouseId;
  if (productId) balanceWhere.productId = productId;

  const balances = await prisma.stockBalance.findMany({
    where: balanceWhere,
    include: {
      product: { select: { name: true, code: true } },
      warehouse: { select: { name: true, code: true } },
    },
  });

  // Fetch all POSTED movements for the same scope
  const movementWhere: Record<string, unknown> = {
    companyId: effectiveCompanyId,
    status: "POSTED",
  };
  if (warehouseId) movementWhere.warehouseId = warehouseId;
  if (productId) movementWhere.productId = productId;

  const movements = await prisma.stockMovement.findMany({
    where: movementWhere,
    select: {
      productId: true,
      warehouseId: true,
      movementType: true,
      quantity: true,
    },
  });

  // Aggregate movements per product+warehouse
  const movementSums: Record<string, { qty: number; value: number }> = {};

  const increaseTypes = new Set([
    "OPENING_BALANCE",
    "IN",
    "ADJUSTMENT_IN",
    "TRANSFER_IN",
  ]);

  for (const m of movements) {
    const key = `${m.productId}:${m.warehouseId}`;
    if (!movementSums[key]) {
      movementSums[key] = { qty: 0, value: 0 };
    }
    if (increaseTypes.has(m.movementType)) {
      movementSums[key].qty += m.quantity;
    } else {
      movementSums[key].qty -= m.quantity;
    }
  }

  const matched: unknown[] = [];
  const mismatches: unknown[] = [];
  const missingBalances: unknown[] = [];

  for (const b of balances) {
    const key = `${b.productId}:${b.warehouseId}`;
    const sum = movementSums[key];

    if (!sum) {
      // Balance exists but no movements (possible if only opening)
      if (b.quantityOnHand !== 0) {
        mismatches.push({
          productId: b.productId,
          productName: b.product?.name,
          warehouseId: b.warehouseId,
          warehouseName: b.warehouse?.name,
          balanceQty: b.quantityOnHand,
          balanceValue: Number(b.totalValue),
          movementQty: 0,
          issue: "رصيد بدون حركات مسجلة",
        });
      } else {
        matched.push({
          productId: b.productId,
          productName: b.product?.name,
          warehouseId: b.warehouseId,
          warehouseName: b.warehouse?.name,
          balanceQty: b.quantityOnHand,
          movementQty: 0,
        });
      }
      continue;
    }

    if (b.quantityOnHand === sum.qty) {
      matched.push({
        productId: b.productId,
        productName: b.product?.name,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouse?.name,
        balanceQty: b.quantityOnHand,
        movementQty: sum.qty,
      });
    } else {
      mismatches.push({
        productId: b.productId,
        productName: b.product?.name,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouse?.name,
        balanceQty: b.quantityOnHand,
        balanceValue: Number(b.totalValue),
        movementQty: sum.qty,
        difference: b.quantityOnHand - sum.qty,
        issue: "عدم تطابق بين الرصيد ومجموع الحركات",
      });
    }

    delete movementSums[key];
  }

  // Remaining movement sums without balances
  for (const [key, sum] of Object.entries(movementSums)) {
    const [pid, wid] = key.split(":");
    const prod = await prisma.product.findUnique({
      where: { id: pid },
      select: { name: true },
    });
    const wh = await prisma.warehouse.findUnique({
      where: { id: wid },
      select: { name: true },
    });
    missingBalances.push({
      productId: pid,
      productName: prod?.name,
      warehouseId: wid,
      warehouseName: wh?.name,
      movementQty: sum.qty,
      issue: "حركات مسجلة بدون رصيد",
    });
  }

  const totalChecked = balances.length + Object.keys(movementSums).length;

  const data = {
    summary: {
      totalChecked,
      matchedCount: matched.length,
      mismatchCount: mismatches.length,
      missingBalanceCount: missingBalances.length,
    },
    matched,
    mismatches,
    missingBalances,
  };

  return successResponse(data);
}
