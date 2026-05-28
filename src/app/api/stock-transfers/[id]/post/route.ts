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
import { TransferService } from "@/lib/services/transfer-service";
import { PeriodGuard } from "@/lib/services/period-guard";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.STOCK_TRANSFERS_POST))
  )
    return forbiddenError();

  const { id } = await params;
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      fromWarehouse: { select: { name: true, code: true, isActive: true } },
      toWarehouse: { select: { name: true, code: true, isActive: true } },
      lines: {
        include: {
          product: { select: { name: true, code: true, isActive: true } },
        },
      },
    },
  });

  if (!transfer) return notFoundError();

  if (
    transfer.companyId &&
    !(await canAccessCompany(user, transfer.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  // Only DRAFT can be posted
  if (transfer.status !== "DRAFT") {
    return conflictError("لا يمكن ترحيل تحويل غير مسود");
  }

  // Check fiscal period is open
  const periodCheck = await PeriodGuard.checkPeriodOpen(
    transfer.companyId!,
    transfer.transferDate,
  );
  if (!periodCheck.allowed) {
    return conflictError(periodCheck.error || "الفترة المالية غير مفتوحة");
  }

  // Validate warehouses still active
  if (!transfer.fromWarehouse?.isActive) {
    return conflictError("المخزن المصدر غير نشط");
  }
  if (!transfer.toWarehouse?.isActive) {
    return conflictError("المخزن الوجهة غير نشط");
  }

  try {
    const result = await TransferService.postTransfer(id, user.userId);

    if (!result.success) {
      return conflictError(result.error || "فشل ترحيل التحويل");
    }

    await logAudit(user.userId, "POST", "StockTransfer", id, {
      companyId: transfer.companyId,
      fromWarehouseId: transfer.fromWarehouseId,
      toWarehouseId: transfer.toWarehouseId,
      lineCount: transfer.lines.length,
      movementIds: result.movements?.map((m) => m.id),
      previousStatus: "DRAFT",
      newStatus: "POSTED",
    });

    return successResponse({
      id,
      action: "posted",
      status: "POSTED",
      transfer: result.transfer,
      movements: result.movements,
    });
  } catch (error) {
    console.error("Post stock transfer error:", error);
    return errorResponse("فشل ترحيل تحويل المخزن", 500);
  }
}
