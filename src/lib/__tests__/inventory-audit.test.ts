import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stockBalance: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    stockMovement: {
      findMany: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    warehouse: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  requireDbPermission: vi.fn(),
  canAccessCompany: vi.fn(),
}));

vi.mock("@/lib/api-response", () => ({
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status }),
  unauthorizedError: () =>
    new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
    }),
  forbiddenError: (message = "Forbidden") =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status: 403,
    }),
}));

describe("inventory audit stock-card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns movements ordered by date", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      name: "Product A",
      code: "PA",
      companyId: "c1",
    });
    (
      prisma.stockMovement.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        id: "m1",
        movementDate: new Date("2025-01-01"),
        movementType: "OPENING_BALANCE",
        quantity: 10,
        unitCost: 5,
        currency: "IQD",
        referenceType: null,
        referenceId: null,
        reason: null,
        notes: null,
        warehouse: { name: "WH1", code: "W1" },
      },
      {
        id: "m2",
        movementDate: new Date("2025-01-02"),
        movementType: "IN",
        quantity: 5,
        unitCost: 8,
        currency: "IQD",
        referenceType: null,
        referenceId: null,
        reason: null,
        notes: null,
        warehouse: { name: "WH1", code: "W1" },
      },
    ]);
    (
      prisma.stockBalance.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      quantityOnHand: 15,
      reservedQuantity: 0,
      averageCost: 6,
      totalValue: 90,
      currency: "IQD",
    });

    const { GET } = await import("@/app/api/inventory/audit/stock-card/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/stock-card?companyId=c1&productId=p1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.movements).toHaveLength(2);
    expect(json.data.movements[0].movementType).toBe("OPENING_BALANCE");
    expect(json.data.movements[1].movementType).toBe("IN");
  });

  it("calculates running quantity", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      name: "Product A",
      code: "PA",
      companyId: "c1",
    });
    (
      prisma.stockMovement.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        id: "m1",
        movementDate: new Date("2025-01-01"),
        movementType: "OPENING_BALANCE",
        quantity: 10,
        unitCost: 5,
        currency: "IQD",
        referenceType: null,
        referenceId: null,
        reason: null,
        notes: null,
        warehouse: { name: "WH1", code: "W1" },
      },
      {
        id: "m2",
        movementDate: new Date("2025-01-02"),
        movementType: "OUT",
        quantity: 3,
        unitCost: 5,
        currency: "IQD",
        referenceType: null,
        referenceId: null,
        reason: null,
        notes: null,
        warehouse: { name: "WH1", code: "W1" },
      },
    ]);
    (
      prisma.stockBalance.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      quantityOnHand: 7,
      reservedQuantity: 0,
      averageCost: 5,
      totalValue: 35,
      currency: "IQD",
    });

    const { GET } = await import("@/app/api/inventory/audit/stock-card/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/stock-card?companyId=c1&productId=p1",
    );
    const res = await GET(req as never);
    const json = await res.json();
    expect(json.data.movements[0].runningQuantity).toBe(10);
    expect(json.data.movements[1].runningQuantity).toBe(7);
    expect(json.data.finalBalance.quantityOnHand).toBe(7);
  });

  it("rejects 401 without session", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import("@/app/api/inventory/audit/stock-card/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/stock-card?companyId=c1&productId=p1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("rejects 403 without permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } = await import("@/app/api/inventory/audit/stock-card/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/stock-card?companyId=c1&productId=p1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("rejects cross-company product", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      name: "Product A",
      code: "PA",
      companyId: "c-other",
    });

    const { GET } = await import("@/app/api/inventory/audit/stock-card/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/stock-card?companyId=c1&productId=p1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });
});

describe("inventory audit reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects matched balance", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.stockBalance.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        id: "b1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: 15,
        totalValue: 150,
        product: { name: "PA" },
        warehouse: { name: "WH1" },
      },
    ]);
    (
      prisma.stockMovement.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        productId: "p1",
        warehouseId: "w1",
        movementType: "OPENING_BALANCE",
        quantity: 10,
      },
      { productId: "p1", warehouseId: "w1", movementType: "IN", quantity: 5 },
    ]);

    const { GET } =
      await import("@/app/api/inventory/audit/reconciliation/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/reconciliation?companyId=c1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.summary.matchedCount).toBe(1);
    expect(json.data.summary.mismatchCount).toBe(0);
  });

  it("detects mismatch quantity", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.stockBalance.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        id: "b1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: 20,
        totalValue: 200,
        product: { name: "PA" },
        warehouse: { name: "WH1" },
      },
    ]);
    (
      prisma.stockMovement.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        productId: "p1",
        warehouseId: "w1",
        movementType: "OPENING_BALANCE",
        quantity: 10,
      },
    ]);

    const { GET } =
      await import("@/app/api/inventory/audit/reconciliation/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/reconciliation?companyId=c1",
    );
    const res = await GET(req as never);
    const json = await res.json();
    expect(json.data.summary.matchedCount).toBe(0);
    expect(json.data.summary.mismatchCount).toBe(1);
    expect(json.data.mismatches[0].difference).toBe(10);
  });

  it("detects missing balance", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.stockBalance.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    (
      prisma.stockMovement.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      { productId: "p1", warehouseId: "w1", movementType: "IN", quantity: 10 },
    ]);
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "PA",
    });
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      { name: "WH1" },
    );

    const { GET } =
      await import("@/app/api/inventory/audit/reconciliation/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/reconciliation?companyId=c1",
    );
    const res = await GET(req as never);
    const json = await res.json();
    expect(json.data.summary.missingBalanceCount).toBe(1);
    expect(json.data.missingBalances).toHaveLength(1);
  });

  it("rejects 403 without permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } =
      await import("@/app/api/inventory/audit/reconciliation/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/reconciliation?companyId=c1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });
});

describe("inventory audit issues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects negative balance", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.stockBalance.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        id: "b1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: -5,
        reservedQuantity: 0,
        averageCost: 10,
        totalValue: -50,
        product: { name: "PA" },
        warehouse: { name: "WH1" },
      },
    ]);
    (
      prisma.stockMovement.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);

    const { GET } = await import("@/app/api/inventory/audit/issues/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/issues?companyId=c1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    const negativeQty = json.data.issues.find(
      (i: Record<string, unknown>) => i.type === "NEGATIVE_QUANTITY",
    );
    expect(negativeQty).toBeDefined();
    expect(negativeQty.severity).toBe("critical");
  });

  it("detects reserved exceeds onHand", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.stockBalance.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        id: "b1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: 5,
        reservedQuantity: 10,
        averageCost: 10,
        totalValue: 50,
        product: { name: "PA" },
        warehouse: { name: "WH1" },
      },
    ]);
    (
      prisma.stockMovement.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);

    const { GET } = await import("@/app/api/inventory/audit/issues/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/issues?companyId=c1",
    );
    const res = await GET(req as never);
    const json = await res.json();
    const reservedIssue = json.data.issues.find(
      (i: Record<string, unknown>) => i.type === "RESERVED_EXCEEDS_ONHAND",
    );
    expect(reservedIssue).toBeDefined();
    expect(reservedIssue.severity).toBe("warning");
  });

  it("handles empty data safely", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.stockBalance.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    (
      prisma.stockMovement.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);

    const { GET } = await import("@/app/api/inventory/audit/issues/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/issues?companyId=c1",
    );
    const res = await GET(req as never);
    const json = await res.json();
    expect(json.data.summary.totalIssues).toBe(0);
    expect(json.data.issues).toHaveLength(0);
  });

  it("rejects 403 without permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } = await import("@/app/api/inventory/audit/issues/route");
    const req = new Request(
      "http://localhost/api/inventory/audit/issues?companyId=c1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });
});
