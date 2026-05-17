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

describe("inventory valuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valuation summary from stock balances", async () => {
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
        companyId: "c1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: 10,
        reservedQuantity: 2,
        averageCost: 5,
        totalValue: 50,
        currency: "IQD",
        product: {
          name: "Product A",
          code: "PA",
          categoryId: "cat1",
          category: { name: "Cat1" },
        },
        warehouse: { name: "WH1", code: "W1" },
      },
      {
        id: "b2",
        companyId: "c1",
        productId: "p2",
        warehouseId: "w1",
        quantityOnHand: 20,
        reservedQuantity: 5,
        averageCost: 10,
        totalValue: 200,
        currency: "IQD",
        product: {
          name: "Product B",
          code: "PB",
          categoryId: "cat1",
          category: { name: "Cat1" },
        },
        warehouse: { name: "WH1", code: "W1" },
      },
    ]);

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalQuantity).toBe(30);
    expect(json.data.totalValue).toBe(250);
    expect(json.data.totalAvailableQuantity).toBe(23);
    expect(json.data.itemCount).toBe(2);
    expect(json.data.overallAverageCost).toBeCloseTo(250 / 30);
    expect(json.data.byWarehouse).toHaveLength(1);
    expect(json.data.byProduct).toHaveLength(2);
  });

  it("filters by warehouse", async () => {
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
        companyId: "c1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: 10,
        reservedQuantity: 0,
        averageCost: 5,
        totalValue: 50,
        currency: "IQD",
        product: {
          name: "Product A",
          code: "PA",
          categoryId: null,
          category: null,
        },
        warehouse: { name: "WH1", code: "W1" },
      },
    ]);

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c1&warehouseId=w1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.byWarehouse[0].warehouseId).toBe("w1");
    expect(json.data.byWarehouse[0].quantity).toBe(10);
  });

  it("filters by product", async () => {
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
        companyId: "c1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: 15,
        reservedQuantity: 0,
        averageCost: 8,
        totalValue: 120,
        currency: "IQD",
        product: {
          name: "Product A",
          code: "PA",
          categoryId: null,
          category: null,
        },
        warehouse: { name: "WH1", code: "W1" },
      },
    ]);

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c1&productId=p1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.byProduct).toHaveLength(1);
    expect(json.data.byProduct[0].productId).toBe("p1");
    expect(json.data.totalQuantity).toBe(15);
  });

  it("filters by category", async () => {
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
        companyId: "c1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: 5,
        reservedQuantity: 0,
        averageCost: 10,
        totalValue: 50,
        currency: "IQD",
        product: {
          name: "Product A",
          code: "PA",
          categoryId: "cat1",
          category: { name: "Cat1" },
        },
        warehouse: { name: "WH1", code: "W1" },
      },
    ]);

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c1&categoryId=cat1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.byProduct[0].categoryId).toBe("cat1");
    expect(json.data.totalQuantity).toBe(5);
  });

  it("rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c-other",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("handles empty balances", async () => {
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

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.totalQuantity).toBe(0);
    expect(json.data.totalValue).toBe(0);
    expect(json.data.itemCount).toBe(0);
    expect(json.data.byWarehouse).toHaveLength(0);
    expect(json.data.byProduct).toHaveLength(0);
  });

  it("rejects 401 without session", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c1",
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

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c1",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("calculates average cost per warehouse", async () => {
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
        companyId: "c1",
        productId: "p1",
        warehouseId: "w1",
        quantityOnHand: 10,
        reservedQuantity: 0,
        averageCost: 5,
        totalValue: 50,
        currency: "IQD",
        product: { name: "PA", code: "PA", categoryId: null, category: null },
        warehouse: { name: "WH1", code: "W1" },
      },
      {
        id: "b2",
        companyId: "c1",
        productId: "p2",
        warehouseId: "w1",
        quantityOnHand: 10,
        reservedQuantity: 0,
        averageCost: 15,
        totalValue: 150,
        currency: "IQD",
        product: { name: "PB", code: "PB", categoryId: null, category: null },
        warehouse: { name: "WH1", code: "W1" },
      },
    ]);

    const { GET } = await import("@/app/api/inventory/valuation/route");
    const req = new Request(
      "http://localhost/api/inventory/valuation?companyId=c1",
    );
    const res = await GET(req as never);
    const json = await res.json();
    // warehouse avg = (50 + 150) / (10 + 10) = 10
    expect(json.data.byWarehouse[0].averageCost).toBe(10);
    expect(json.data.byWarehouse[0].totalValue).toBe(200);
  });
});
