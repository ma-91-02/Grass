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

  const whereClause: Record<string, unknown> = {
    companyId: effectiveCompanyId,
  };
  if (warehouseId) whereClause.warehouseId = warehouseId;
  if (productId) whereClause.productId = productId;

  const balances = await prisma.stockBalance.findMany({
    where: whereClause,
    include: {
      product: { select: { name: true, code: true } },
      warehouse: { select: { name: true, code: true } },
    },
  });

  const movements = await prisma.stockMovement.findMany({
    where: {
      companyId: effectiveCompanyId,
      status: "POSTED",
      ...(warehouseId ? { warehouseId } : {}),
      ...(productId ? { productId } : {}),
    },
    select: {
      id: true,
      productId: true,
      warehouseId: true,
      companyId: true,
      movementType: true,
      quantity: true,
      status: true,
      movementDate: true,
    },
  });

  interface Issue {
    type: string;
    severity: string;
    entity: string;
    entityId: string;
    productId?: string;
    productName?: string;
    warehouseId?: string | null;
    warehouseName?: string;
    details: Record<string, unknown>;
  }

  const issues: Issue[] = [];

  // Balance issues
  for (const b of balances) {
    if (b.quantityOnHand < 0) {
      issues.push({
        type: "NEGATIVE_QUANTITY",
        severity: "critical",
        entity: "StockBalance",
        entityId: b.id,
        productId: b.productId,
        productName: b.product?.name,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouse?.name,
        details: {
          quantityOnHand: b.quantityOnHand,
          message: "الرصيد سالب",
        },
      });
    }

    if (b.reservedQuantity > b.quantityOnHand) {
      issues.push({
        type: "RESERVED_EXCEEDS_ONHAND",
        severity: "warning",
        entity: "StockBalance",
        entityId: b.id,
        productId: b.productId,
        productName: b.product?.name,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouse?.name,
        details: {
          quantityOnHand: b.quantityOnHand,
          reservedQuantity: b.reservedQuantity,
          message: "الكمية المحجوزة تتجاوز الرصيد",
        },
      });
    }

    if (Number(b.averageCost) < 0) {
      issues.push({
        type: "NEGATIVE_AVERAGE_COST",
        severity: "critical",
        entity: "StockBalance",
        entityId: b.id,
        productId: b.productId,
        productName: b.product?.name,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouse?.name,
        details: {
          averageCost: Number(b.averageCost),
          message: "متوسط التكلفة سالب",
        },
      });
    }

    if (Number(b.totalValue) < 0) {
      issues.push({
        type: "NEGATIVE_TOTAL_VALUE",
        severity: "critical",
        entity: "StockBalance",
        entityId: b.id,
        productId: b.productId,
        productName: b.product?.name,
        warehouseId: b.warehouseId,
        warehouseName: b.warehouse?.name,
        details: {
          totalValue: Number(b.totalValue),
          message: "القيمة الإجمالية سالبة",
        },
      });
    }
  }

  // Movement issues
  const movementKeys = new Set<string>();
  for (const m of movements) {
    if (!m.companyId) {
      issues.push({
        type: "MOVEMENT_MISSING_COMPANY",
        severity: "warning",
        entity: "StockMovement",
        entityId: m.id,
        productId: m.productId,
        warehouseId: m.warehouseId,
        details: {
          message: "حركة بدون شركة",
        },
      });
    }

    if (!m.warehouseId) {
      issues.push({
        type: "MOVEMENT_MISSING_WAREHOUSE",
        severity: "warning",
        entity: "StockMovement",
        entityId: m.id,
        productId: m.productId,
        details: {
          message: "حركة بدون مخزن",
        },
      });
    }

    // Check for posted movements without matching balance
    const key = `${m.productId}:${m.warehouseId || ""}`;
    if (!movementKeys.has(key)) {
      movementKeys.add(key);
      const hasBalance = balances.some(
        (b) =>
          b.productId === m.productId &&
          b.warehouseId === (m.warehouseId || ""),
      );
      if (!hasBalance && m.warehouseId) {
        issues.push({
          type: "MOVEMENT_WITHOUT_BALANCE",
          severity: "info",
          entity: "StockMovement",
          entityId: m.id,
          productId: m.productId,
          warehouseId: m.warehouseId,
          details: {
            message: "حركة مرحلة بدون رصيد مطابق",
          },
        });
      }
    }
  }

  const summary = {
    totalCheckedBalances: balances.length,
    totalCheckedMovements: movements.length,
    totalIssues: issues.length,
    criticalCount: issues.filter((i) => i.severity === "critical").length,
    warningCount: issues.filter((i) => i.severity === "warning").length,
    infoCount: issues.filter((i) => i.severity === "info").length,
  };

  const data = {
    summary,
    issues,
  };

  return successResponse(data);
}
