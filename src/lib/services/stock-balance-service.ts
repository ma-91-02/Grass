import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

const INCREASE_TYPES = new Set([
  "OPENING_BALANCE",
  "IN",
  "ADJUSTMENT_IN",
  "TRANSFER_IN",
]);

const DECREASE_TYPES = new Set(["OUT", "ADJUSTMENT_OUT", "TRANSFER_OUT"]);

export interface ApplyMovementResult {
  success: boolean;
  error?: string;
  balance?: {
    id: string;
    quantityOnHand: number;
    reservedQuantity: number;
    averageCost: number;
    totalValue: number;
  };
  movement?: {
    id: string;
    status: string;
  };
}

export class StockBalanceService {
  /**
   * Applies a posted stock movement to the stock balance.
   * Must be called inside a transaction for atomicity.
   * This method receives an existing transaction client.
   */
  static async applyPostedMovement(
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
    movementId: string,
  ): Promise<ApplyMovementResult> {
    const movement = await tx.stockMovement.findUnique({
      where: { id: movementId },
      select: {
        id: true,
        companyId: true,
        productId: true,
        warehouseId: true,
        movementType: true,
        quantity: true,
        unitCost: true,
        currency: true,
        status: true,
      },
    });

    if (!movement) {
      return { success: false, error: "الحركة غير موجودة" };
    }

    if (movement.status !== "DRAFT") {
      return { success: false, error: "الحركة يجب أن تكون مسودة قبل الترحيل" };
    }

    if (!movement.warehouseId) {
      return { success: false, error: "الحركة لا تحتوي على مخزن" };
    }

    if (!movement.companyId) {
      return { success: false, error: "الحركة لا تحتوي على شركة" };
    }

    const movementType = movement.movementType;
    const companyId = movement.companyId;
    const movementUnitCost = Number(movement.unitCost ?? 0);

    // Get or create balance
    const balance = await tx.stockBalance.findUnique({
      where: {
        companyId_productId_warehouseId: {
          companyId,
          productId: movement.productId,
          warehouseId: movement.warehouseId,
        },
      },
    });

    let newQuantity: number;
    let newAverageCost: number;
    let newTotalValue: number;

    if (INCREASE_TYPES.has(movementType)) {
      // Validate unitCost for increase movements
      if (movementUnitCost < 0) {
        return { success: false, error: "تكلفة الوحدة لا يمكن أن تكون سالبة" };
      }

      if (!balance) {
        // First balance record
        newQuantity = movement.quantity;
        newAverageCost = movementUnitCost;
      } else {
        newQuantity = balance.quantityOnHand + movement.quantity;
        const oldValue =
          Number(balance.quantityOnHand) * Number(balance.averageCost);
        const inValue = movement.quantity * movementUnitCost;
        newAverageCost =
          newQuantity > 0 ? (oldValue + inValue) / newQuantity : 0;
      }
      newTotalValue = newQuantity * newAverageCost;
    } else if (DECREASE_TYPES.has(movementType)) {
      // Decrease balance - requires existing balance
      if (!balance) {
        return {
          success: false,
          error: "لا يوجد رصيد لهذه المادة في هذا المخزن",
        };
      }
      newQuantity = balance.quantityOnHand - movement.quantity;
      if (newQuantity < 0) {
        return {
          success: false,
          error: "الرصيد لا يكفي لإخراج هذه الكمية",
        };
      }
      // Average cost does not change on decrease
      newAverageCost = Number(balance.averageCost);
      newTotalValue = newQuantity * newAverageCost;
    } else {
      return { success: false, error: "نوع الحركة غير معروف" };
    }

    // Upsert balance
    const upsertedBalance = await tx.stockBalance.upsert({
      where: {
        companyId_productId_warehouseId: {
          companyId,
          productId: movement.productId,
          warehouseId: movement.warehouseId,
        },
      },
      update: {
        quantityOnHand: newQuantity,
        averageCost: newAverageCost,
        totalValue: newTotalValue,
        currency: movement.currency,
        lastMovementId: movement.id,
      },
      create: {
        companyId,
        productId: movement.productId,
        warehouseId: movement.warehouseId,
        quantityOnHand: newQuantity,
        reservedQuantity: 0,
        unitCost: movementUnitCost,
        averageCost: newAverageCost,
        totalValue: newTotalValue,
        currency: movement.currency,
        lastMovementId: movement.id,
      },
    });

    // Update movement status
    const updatedMovement = await tx.stockMovement.update({
      where: { id: movementId },
      data: { status: "POSTED" },
    });

    return {
      success: true,
      balance: {
        id: upsertedBalance.id,
        quantityOnHand: upsertedBalance.quantityOnHand,
        reservedQuantity: upsertedBalance.reservedQuantity,
        averageCost: Number(upsertedBalance.averageCost),
        totalValue: Number(upsertedBalance.totalValue),
      },
      movement: {
        id: updatedMovement.id,
        status: updatedMovement.status,
      },
    };
  }

  /**
   * Reads the current balance for a product/warehouse.
   * Returns null if no balance exists.
   */
  static async getBalance(
    companyId: string,
    productId: string,
    warehouseId: string,
  ) {
    return prisma.stockBalance.findUnique({
      where: {
        companyId_productId_warehouseId: {
          companyId,
          productId,
          warehouseId,
        },
      },
    });
  }

  /**
   * Checks if there is sufficient stock available.
   * available = onHand - reserved
   */
  static async ensureSufficientStock(
    companyId: string,
    productId: string,
    warehouseId: string,
    requiredQuantity: number,
  ): Promise<{ sufficient: boolean; available: number }> {
    const balance = await this.getBalance(companyId, productId, warehouseId);
    if (!balance) {
      return { sufficient: false, available: 0 };
    }
    const available = balance.quantityOnHand - balance.reservedQuantity;
    return { sufficient: available >= requiredQuantity, available };
  }
}
