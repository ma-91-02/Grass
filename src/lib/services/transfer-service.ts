import { prisma } from "@/lib/prisma";
import { StockBalanceService } from "./stock-balance-service";
import type { PrismaClient } from "@/generated/prisma/client";

export interface PostTransferResult {
  success: boolean;
  error?: string;
  transfer?: {
    id: string;
    status: string;
  };
  movements?: { id: string; movementType: string }[];
}

export class TransferService {
  /**
   * Posts a stock transfer by creating TRANSFER_OUT and TRANSFER_IN movements
   * for each line, updating balances atomically.
   */
  static async postTransfer(
    transferId: string,
    userId: string,
  ): Promise<PostTransferResult> {
    return prisma.$transaction(async (tx) => {
      return this.postTransferInTx(tx, transferId, userId);
    });
  }

  static async postTransferInTx(
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
    transferId: string,
    userId: string,
  ): Promise<PostTransferResult> {
    const transfer = await tx.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        lines: true,
        fromWarehouse: {
          select: { id: true, companyId: true, isActive: true },
        },
        toWarehouse: { select: { id: true, companyId: true, isActive: true } },
        company: { select: { id: true } },
      },
    });

    if (!transfer) {
      return { success: false, error: "التحويل غير موجود" };
    }

    if (transfer.status !== "DRAFT") {
      return { success: false, error: "لا يمكن ترحيل تحويل غير مسود" };
    }

    // Validate warehouses are active and belong to same company
    if (!transfer.fromWarehouse?.isActive) {
      return { success: false, error: "المخزن المصدر غير نشط" };
    }
    if (!transfer.toWarehouse?.isActive) {
      return { success: false, error: "المخزن الوجهة غير نشط" };
    }
    if (
      transfer.fromWarehouse.companyId &&
      transfer.fromWarehouse.companyId !== transfer.companyId
    ) {
      return {
        success: false,
        error: "المخزن المصدر لا ينتمي لنفس الشركة",
      };
    }
    if (
      transfer.toWarehouse.companyId &&
      transfer.toWarehouse.companyId !== transfer.companyId
    ) {
      return {
        success: false,
        error: "المخزن الوجهة لا ينتمي لنفس الشركة",
      };
    }

    const movements: { id: string; movementType: string }[] = [];

    for (const line of transfer.lines) {
      // Validate product
      const product = await tx.product.findUnique({
        where: { id: line.productId },
        select: { isActive: true, productType: true, companyId: true },
      });
      if (!product) {
        return {
          success: false,
          error: `المادة غير موجودة في سطر التحويل`,
        };
      }
      if (!product.isActive) {
        return {
          success: false,
          error: `المادة غير نشطة في سطر التحويل`,
        };
      }
      if (product.productType === "SERVICE") {
        return {
          success: false,
          error: `المواد من نوع خدمة لا تسمح بحركات مخزون`,
        };
      }
      if (product.companyId && product.companyId !== transfer.companyId) {
        return {
          success: false,
          error: `المادة لا تنتمي لنفس الشركة`,
        };
      }

      // Get current average cost from source warehouse
      const fromBalance = await tx.stockBalance.findUnique({
        where: {
          companyId_productId_warehouseId: {
            companyId: transfer.companyId,
            productId: line.productId,
            warehouseId: transfer.fromWarehouseId,
          },
        },
      });

      if (!fromBalance || fromBalance.quantityOnHand < line.quantity) {
        return {
          success: false,
          error: `الرصيد غير كافٍ في المخزن المصدر للمادة`,
        };
      }

      const transferUnitCost = Number(fromBalance.averageCost);

      // Create TRANSFER_OUT movement
      const outMovement = await tx.stockMovement.create({
        data: {
          companyId: transfer.companyId,
          productId: line.productId,
          warehouseId: transfer.fromWarehouseId,
          movementType: "TRANSFER_OUT",
          quantity: line.quantity,
          unitCost: transferUnitCost,
          currency: line.currency,
          movementDate: transfer.transferDate,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          notes: line.notes ?? transfer.notes,
          createdById: userId,
        },
      });

      // Create TRANSFER_IN movement
      const inMovement = await tx.stockMovement.create({
        data: {
          companyId: transfer.companyId,
          productId: line.productId,
          warehouseId: transfer.toWarehouseId,
          movementType: "TRANSFER_IN",
          quantity: line.quantity,
          unitCost: transferUnitCost,
          currency: line.currency,
          movementDate: transfer.transferDate,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          notes: line.notes ?? transfer.notes,
          createdById: userId,
        },
      });

      // Apply OUT movement to source balance
      const outResult = await StockBalanceService.applyPostedMovement(
        tx,
        outMovement.id,
      );
      if (!outResult.success) {
        return {
          success: false,
          error: outResult.error || "فشل ترحيل حركة الخروج",
        };
      }

      // Apply IN movement to destination balance
      const inResult = await StockBalanceService.applyPostedMovement(
        tx,
        inMovement.id,
      );
      if (!inResult.success) {
        return {
          success: false,
          error: inResult.error || "فشل ترحيل حركة الدخول",
        };
      }

      movements.push(
        { id: outMovement.id, movementType: outMovement.movementType },
        { id: inMovement.id, movementType: inMovement.movementType },
      );
    }

    // Update transfer status to POSTED
    const updatedTransfer = await tx.stockTransfer.update({
      where: { id: transferId },
      data: { status: "POSTED" },
    });

    return {
      success: true,
      transfer: {
        id: updatedTransfer.id,
        status: updatedTransfer.status,
      },
      movements,
    };
  }
}
