import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { StockBalanceService } from "@/lib/services/stock-balance-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stockBalance: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    stockMovement: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const createMockTx = () => ({
  stockBalance: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  stockMovement: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

describe("StockBalanceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("IN creates balance with average cost when none exists", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m1",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "IN",
      quantity: 10,
      unitCost: 5,
      currency: "IQD",
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue(null);
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
      averageCost: 5,
      totalValue: 50,
    });
    tx.stockMovement.update.mockResolvedValue({
      id: "m1",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m1",
    );
    expect(result.success).toBe(true);
    expect(result.balance?.quantityOnHand).toBe(10);
    expect(result.balance?.averageCost).toBe(5);
    expect(tx.stockBalance.upsert.mock.calls[0][0].create.averageCost).toBe(5);
  });

  it("second IN recalculates weighted average", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m2",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "IN",
      quantity: 10,
      unitCost: 15,
      currency: "IQD",
      status: "DRAFT",
    });
    // Existing: 10 qty @ 5 avg = 50 value
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
      averageCost: 5,
      totalValue: 50,
    });
    // New: 20 qty, oldValue=50 + inValue=150 = 200, avg = 200/20 = 10
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 20,
      reservedQuantity: 0,
      averageCost: 10,
      totalValue: 200,
    });
    tx.stockMovement.update.mockResolvedValue({
      id: "m2",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m2",
    );
    expect(result.success).toBe(true);
    expect(result.balance?.quantityOnHand).toBe(20);
    expect(result.balance?.averageCost).toBe(10);
    expect(result.balance?.totalValue).toBe(200);
    expect(tx.stockBalance.upsert.mock.calls[0][0].update.averageCost).toBe(10);
    expect(tx.stockBalance.upsert.mock.calls[0][0].update.totalValue).toBe(200);
  });

  it("OUT keeps average cost unchanged and reduces value", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m3",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OUT",
      quantity: 5,
      unitCost: 10,
      currency: "IQD",
      status: "DRAFT",
    });
    // Existing: 20 qty @ 10 avg = 200 value
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 20,
      reservedQuantity: 0,
      averageCost: 10,
      totalValue: 200,
    });
    // After OUT 5: 15 qty @ 10 avg = 150 value
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 15,
      reservedQuantity: 0,
      averageCost: 10,
      totalValue: 150,
    });
    tx.stockMovement.update.mockResolvedValue({
      id: "m3",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m3",
    );
    expect(result.success).toBe(true);
    expect(result.balance?.quantityOnHand).toBe(15);
    expect(result.balance?.averageCost).toBe(10);
    expect(result.balance?.totalValue).toBe(150);
  });

  it("OPENING_BALANCE creates balance with cost", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m4",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OPENING_BALANCE",
      quantity: 50,
      unitCost: 2,
      currency: "IQD",
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue(null);
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b2",
      quantityOnHand: 50,
      reservedQuantity: 0,
      averageCost: 2,
      totalValue: 100,
    });
    tx.stockMovement.update.mockResolvedValue({
      id: "m4",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m4",
    );
    expect(result.success).toBe(true);
    expect(result.balance?.quantityOnHand).toBe(50);
    expect(result.balance?.averageCost).toBe(2);
  });

  it("ADJUSTMENT_IN increases balance and recalculates average", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m5",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "ADJUSTMENT_IN",
      quantity: 5,
      unitCost: 20,
      currency: "IQD",
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 20,
      reservedQuantity: 0,
      averageCost: 10,
      totalValue: 200,
    });
    // New avg = (20*10 + 5*20) / 25 = 300/25 = 12
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 25,
      reservedQuantity: 0,
      averageCost: 12,
      totalValue: 300,
    });
    tx.stockMovement.update.mockResolvedValue({
      id: "m5",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m5",
    );
    expect(result.success).toBe(true);
    expect(result.balance?.quantityOnHand).toBe(25);
    expect(result.balance?.averageCost).toBe(12);
    expect(result.balance?.totalValue).toBe(300);
  });

  it("ADJUSTMENT_OUT decreases balance keeping average unchanged", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m6",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "ADJUSTMENT_OUT",
      quantity: 3,
      unitCost: 12,
      currency: "IQD",
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 25,
      reservedQuantity: 0,
      averageCost: 12,
      totalValue: 300,
    });
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 22,
      reservedQuantity: 0,
      averageCost: 12,
      totalValue: 264,
    });
    tx.stockMovement.update.mockResolvedValue({
      id: "m6",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m6",
    );
    expect(result.success).toBe(true);
    expect(result.balance?.quantityOnHand).toBe(22);
    expect(result.balance?.averageCost).toBe(12);
  });

  it("TRANSFER_OUT decreases existing balance", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m7",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "TRANSFER_OUT",
      quantity: 5,
      unitCost: 12,
      currency: "IQD",
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 22,
      reservedQuantity: 0,
      averageCost: 12,
      totalValue: 264,
    });
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 17,
      reservedQuantity: 0,
      averageCost: 12,
      totalValue: 204,
    });
    tx.stockMovement.update.mockResolvedValue({
      id: "m7",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m7",
    );
    expect(result.success).toBe(true);
    expect(result.balance?.quantityOnHand).toBe(17);
  });

  it("rejects OUT when no balance exists", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m8",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OUT",
      quantity: 5,
      unitCost: 0,
      currency: "IQD",
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue(null);

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m8",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("لا يوجد رصيد");
  });

  it("rejects OUT when insufficient stock", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m9",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OUT",
      quantity: 15,
      unitCost: 0,
      currency: "IQD",
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
      averageCost: 5,
      totalValue: 50,
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m9",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("الرصيد لا يكفي");
  });

  it("rejects posting already POSTED movement", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m10",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "IN",
      quantity: 5,
      unitCost: 5,
      currency: "IQD",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m10",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("مسودة");
  });

  it("rejects negative unitCost for increase movements", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m11",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "IN",
      quantity: 5,
      unitCost: -3,
      currency: "IQD",
      status: "DRAFT",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m11",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("تكلفة الوحدة لا يمكن أن تكون سالبة");
  });

  it("allows zero unitCost for opening balance", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m12",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OPENING_BALANCE",
      quantity: 10,
      unitCost: 0,
      currency: "IQD",
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue(null);
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
      averageCost: 0,
      totalValue: 0,
    });
    tx.stockMovement.update.mockResolvedValue({
      id: "m12",
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m12",
    );
    expect(result.success).toBe(true);
    expect(result.balance?.averageCost).toBe(0);
  });

  it("rejects second OPENING_BALANCE when balance already exists", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m13",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OPENING_BALANCE",
      quantity: 20,
      unitCost: 5,
      currency: "IQD",
      status: "DRAFT",
    });
    // Existing balance means an opening balance was already posted
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 50,
      reservedQuantity: 0,
      averageCost: 2,
      totalValue: 100,
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m13",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("يوجد رصيد افتتاحي مسجل مسبقاً");
  });

  it("rejects OPENING_BALANCE after any posted movement exists", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m14",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OPENING_BALANCE",
      quantity: 10,
      unitCost: 3,
      currency: "IQD",
      status: "DRAFT",
    });
    // Any existing balance (from IN, ADJUSTMENT_IN, etc.) blocks opening balance
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 30,
      reservedQuantity: 0,
      averageCost: 8,
      totalValue: 240,
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m14",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("يوجد رصيد افتتاحي مسجل مسبقاً");
  });

  it("getBalance returns balance with cost data", async () => {
    (
      prisma.stockBalance.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "b1",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      quantityOnHand: 42,
      reservedQuantity: 2,
      averageCost: 10,
      totalValue: 420,
      currency: "IQD",
    });

    const result = await StockBalanceService.getBalance("c1", "p1", "w1");
    expect(result).not.toBeNull();
    expect(result?.quantityOnHand).toBe(42);
    expect(result?.averageCost).toBe(10);
    expect(result?.totalValue).toBe(420);
  });

  it("ensureSufficientStock returns sufficient when enough", async () => {
    (
      prisma.stockBalance.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "b1",
      quantityOnHand: 20,
      reservedQuantity: 5,
      averageCost: 10,
      totalValue: 200,
    });

    const result = await StockBalanceService.ensureSufficientStock(
      "c1",
      "p1",
      "w1",
      10,
    );
    expect(result.sufficient).toBe(true);
    expect(result.available).toBe(15);
  });
});
