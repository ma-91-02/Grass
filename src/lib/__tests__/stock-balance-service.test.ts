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

  it("IN creates balance when none exists", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m1",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "IN",
      quantity: 10,
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue(null);
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
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
    expect(tx.stockBalance.upsert.mock.calls[0][0].create.quantityOnHand).toBe(
      10,
    );
  });

  it("OPENING_BALANCE creates balance", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m2",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OPENING_BALANCE",
      quantity: 50,
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue(null);
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b2",
      quantityOnHand: 50,
      reservedQuantity: 0,
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
    expect(result.balance?.quantityOnHand).toBe(50);
  });

  it("ADJUSTMENT_IN increases existing balance", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m3",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "ADJUSTMENT_IN",
      quantity: 5,
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 20,
      reservedQuantity: 0,
    });
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 25,
      reservedQuantity: 0,
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
    expect(tx.stockBalance.upsert.mock.calls[0][0].update.quantityOnHand).toBe(
      25,
    );
  });

  it("TRANSFER_IN increases existing balance", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m4",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w2",
      movementType: "TRANSFER_IN",
      quantity: 8,
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
    });
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 18,
      reservedQuantity: 0,
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
    expect(result.balance?.quantityOnHand).toBe(18);
  });

  it("OUT decreases existing balance", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m5",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "OUT",
      quantity: 7,
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 20,
      reservedQuantity: 0,
    });
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 13,
      reservedQuantity: 0,
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
    expect(result.balance?.quantityOnHand).toBe(13);
  });

  it("ADJUSTMENT_OUT decreases existing balance", async () => {
    const tx = createMockTx();
    tx.stockMovement.findUnique.mockResolvedValue({
      id: "m6",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      movementType: "ADJUSTMENT_OUT",
      quantity: 3,
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
    });
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 7,
      reservedQuantity: 0,
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
    expect(result.balance?.quantityOnHand).toBe(7);
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
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 15,
      reservedQuantity: 0,
    });
    tx.stockBalance.upsert.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
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
    expect(result.balance?.quantityOnHand).toBe(10);
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
      status: "DRAFT",
    });
    tx.stockBalance.findUnique.mockResolvedValue({
      id: "b1",
      quantityOnHand: 10,
      reservedQuantity: 0,
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
      status: "POSTED",
    });

    const result = await StockBalanceService.applyPostedMovement(
      tx as never,
      "m10",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("مسودة");
  });

  it("getBalance returns balance data", async () => {
    (
      prisma.stockBalance.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "b1",
      companyId: "c1",
      productId: "p1",
      warehouseId: "w1",
      quantityOnHand: 42,
      reservedQuantity: 2,
    });

    const result = await StockBalanceService.getBalance("c1", "p1", "w1");
    expect(result).not.toBeNull();
    expect(result?.quantityOnHand).toBe(42);
  });

  it("ensureSufficientStock returns sufficient when enough", async () => {
    (
      prisma.stockBalance.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "b1",
      quantityOnHand: 20,
      reservedQuantity: 5,
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

  it("ensureSufficientStock returns insufficient when not enough", async () => {
    (
      prisma.stockBalance.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "b1",
      quantityOnHand: 8,
      reservedQuantity: 3,
    });

    const result = await StockBalanceService.ensureSufficientStock(
      "c1",
      "p1",
      "w1",
      10,
    );
    expect(result.sufficient).toBe(false);
    expect(result.available).toBe(5);
  });
});
