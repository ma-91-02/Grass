import { prisma } from "@/lib/prisma";
import { StockBalanceService } from "./stock-balance-service";
import type { PrismaClient } from "@/generated/prisma/client";

export interface PostAdjustmentResult {
  success: boolean;
  error?: string;
  adjustment?: {
    id: string;
    status: string;
  };
  movements?: { id: string; movementType: string }[];
}

export class AdjustmentService {
  static async postAdjustment(
    adjustmentId: string,
    userId: string,
  ): Promise<PostAdjustmentResult> {
    return prisma.$transaction(async (tx) => {
      return this.postAdjustmentInTx(tx, adjustmentId, userId);
    });
  }

  static async postAdjustmentInTx(
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
    adjustmentId: string,
    userId: string,
  ): Promise<PostAdjustmentResult> {
    const adjustment = await tx.stockAdjustment.findUnique({
      where: { id: adjustmentId },
      include: {
        lines: true,
        warehouse: {
          select: { id: true, companyId: true, isActive: true },
        },
        company: { select: { id: true } },
      },
    });

    if (!adjustment) {
      return { success: false, error: "التسوية غير موجودة" };
    }

    if (adjustment.status !== "DRAFT") {
      return { success: false, error: "لا يمكن ترحيل تسوية غير مسودة" };
    }

    if (!adjustment.warehouse?.isActive) {
      return { success: false, error: "المخزن غير نشط" };
    }

    if (
      adjustment.warehouse.companyId &&
      adjustment.warehouse.companyId !== adjustment.companyId
    ) {
      return {
        success: false,
        error: "المخزن لا ينتمي لنفس الشركة",
      };
    }

    const movementType =
      adjustment.adjustmentType === "IN" ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const movements: { id: string; movementType: string }[] = [];

    for (const line of adjustment.lines) {
      const product = await tx.product.findUnique({
        where: { id: line.productId },
        select: { isActive: true, productType: true, companyId: true },
      });
      if (!product) {
        return {
          success: false,
          error: "المادة غير موجودة في سطر التسوية",
        };
      }
      if (!product.isActive) {
        return {
          success: false,
          error: "المادة غير نشطة في سطر التسوية",
        };
      }
      if (product.productType === "SERVICE") {
        return {
          success: false,
          error: "المواد من نوع خدمة لا تسمح بحركات مخزون",
        };
      }
      if (product.companyId && product.companyId !== adjustment.companyId) {
        return {
          success: false,
          error: "المادة لا تنتمي لنفس الشركة",
        };
      }

      if (movementType === "ADJUSTMENT_OUT") {
        const balance = await tx.stockBalance.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId: adjustment.companyId,
              productId: line.productId,
              warehouseId: adjustment.warehouseId,
            },
          },
        });
        if (!balance || balance.quantityOnHand < line.quantity) {
          return {
            success: false,
            error: "الرصيد غير كافٍ في المخزن للمادة",
          };
        }
      }

      const movement = await tx.stockMovement.create({
        data: {
          companyId: adjustment.companyId,
          productId: line.productId,
          warehouseId: adjustment.warehouseId,
          movementType: movementType as "ADJUSTMENT_IN" | "ADJUSTMENT_OUT",
          quantity: line.quantity,
          unitCost: line.unitCost ?? 0,
          currency: line.currency,
          movementDate: adjustment.adjustmentDate,
          referenceType: "StockAdjustment",
          referenceId: adjustment.id,
          reason: adjustment.reason,
          notes: line.notes ?? adjustment.notes,
          createdById: userId,
        },
      });

      const result = await StockBalanceService.applyPostedMovement(
        tx,
        movement.id,
      );
      if (!result.success) {
        return {
          success: false,
          error: result.error || "فشل ترحيل حركة التسوية",
        };
      }

      movements.push({
        id: movement.id,
        movementType: movement.movementType,
      });
    }

    const updatedAdjustment = await tx.stockAdjustment.update({
      where: { id: adjustmentId },
      data: { status: "POSTED" },
    });

    return {
      success: true,
      adjustment: {
        id: updatedAdjustment.id,
        status: updatedAdjustment.status,
      },
      movements,
    };
  }
}
