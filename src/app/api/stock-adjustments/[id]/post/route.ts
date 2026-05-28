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
import { AdjustmentService } from "@/lib/services/adjustment-service";
import { PeriodGuard } from "@/lib/services/period-guard";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(
      user.userId,
      PERMISSIONS.STOCK_ADJUSTMENTS_POST,
    ))
  )
    return forbiddenError();

  const { id } = await params;
  const adjustment = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: {
      warehouse: { select: { name: true, code: true, isActive: true } },
      lines: {
        include: {
          product: { select: { name: true, code: true, isActive: true } },
        },
      },
    },
  });

  if (!adjustment) return notFoundError();

  if (
    adjustment.companyId &&
    !(await canAccessCompany(user, adjustment.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (adjustment.status !== "DRAFT") {
    return conflictError("لا يمكن ترحيل تسوية غير مسودة");
  }

  // Check fiscal period is open
  const periodCheck = await PeriodGuard.checkPeriodOpen(
    adjustment.companyId!,
    adjustment.adjustmentDate,
  );
  if (!periodCheck.allowed) {
    return conflictError(periodCheck.error || "الفترة المالية غير مفتوحة");
  }

  if (!adjustment.warehouse?.isActive) {
    return conflictError("المخزن غير نشط");
  }

  try {
    const result = await AdjustmentService.postAdjustment(id, user.userId);

    if (!result.success) {
      return conflictError(result.error || "فشل ترحيل التسوية");
    }

    await logAudit(user.userId, "POST", "StockAdjustment", id, {
      companyId: adjustment.companyId,
      warehouseId: adjustment.warehouseId,
      adjustmentType: adjustment.adjustmentType,
      lineCount: adjustment.lines.length,
      movementIds: result.movements?.map((m) => m.id),
      previousStatus: "DRAFT",
      newStatus: "POSTED",
    });

    return successResponse({
      id,
      action: "posted",
      status: "POSTED",
      adjustment: result.adjustment,
      movements: result.movements,
    });
  } catch (error) {
    console.error("Post stock adjustment error:", error);
    return errorResponse("فشل ترحيل تسوية المخزن", 500);
  }
}
