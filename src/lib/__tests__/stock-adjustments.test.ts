import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";
import { AdjustmentService } from "@/lib/services/adjustment-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stockAdjustment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    stockAdjustmentLine: {
      create: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    stockBalance: {
      findUnique: vi.fn(),
    },
    warehouse: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  logAudit: vi.fn(),
  requireDbPermission: vi.fn(),
  canAccessCompany: vi.fn(),
}));

vi.mock("@/lib/api-response", () => ({
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status }),
  errorResponse: (message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status,
    }),
  unauthorizedError: () =>
    new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
    }),
  forbiddenError: (message = "Forbidden") =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status: 403,
    }),
  notFoundError: () =>
    new Response(JSON.stringify({ success: false, error: "Not found" }), {
      status: 404,
    }),
  conflictError: (message: string) =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status: 409,
    }),
}));

describe("stock-adjustments route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET adjustment rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (
      prisma.stockAdjustment.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "a1",
      companyId: "c-other",
      status: "DRAFT",
    });

    const { GET } = await import("@/app/api/stock-adjustments/[id]/route");
    const req = new Request("http://localhost/api/stock-adjustments/a1");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST rejects empty lines", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const { POST } = await import("@/app/api/stock-adjustments/route");
    const req = new Request("http://localhost/api/stock-adjustments", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        warehouseId: "w1",
        adjustmentType: "IN",
        lines: [],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("مادة واحدة");
  });

  it("POST rejects quantity <= 0", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const { POST } = await import("@/app/api/stock-adjustments/route");
    const req = new Request("http://localhost/api/stock-adjustments", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        warehouseId: "w1",
        adjustmentType: "IN",
        lines: [{ productId: "p1", quantity: 0 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("أكبر من 0");
  });

  it("POST rejects inactive warehouse", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        id: "w1",
        companyId: "c1",
        isActive: false,
        name: "WH1",
      },
    );

    const { POST } = await import("@/app/api/stock-adjustments/route");
    const req = new Request("http://localhost/api/stock-adjustments", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        warehouseId: "w1",
        adjustmentType: "IN",
        lines: [{ productId: "p1", quantity: 5 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("غير نشط");
  });

  it("POST rejects cross-company warehouse", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        id: "w1",
        companyId: "c-other",
        isActive: true,
        name: "WH1",
      },
    );

    const { POST } = await import("@/app/api/stock-adjustments/route");
    const req = new Request("http://localhost/api/stock-adjustments", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        warehouseId: "w1",
        adjustmentType: "IN",
        lines: [{ productId: "p1", quantity: 5 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("لا ينتمي");
  });

  it("POST rejects SERVICE product", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        id: "w1",
        companyId: "c1",
        isActive: true,
        name: "WH1",
      },
    );
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      companyId: "c1",
      isActive: true,
      productType: "SERVICE",
    });

    const { POST } = await import("@/app/api/stock-adjustments/route");
    const req = new Request("http://localhost/api/stock-adjustments", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        warehouseId: "w1",
        adjustmentType: "IN",
        lines: [{ productId: "p1", quantity: 5 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("خدمة");
  });

  it("PATCH rejects editing POSTED adjustment", async () => {
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
      prisma.stockAdjustment.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "a1",
      companyId: "c1",
      status: "POSTED",
    });

    const { PATCH } = await import("@/app/api/stock-adjustments/[id]/route");
    const req = new Request("http://localhost/api/stock-adjustments/a1", {
      method: "PATCH",
      body: JSON.stringify({ notes: "updated" }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("غير مسودة");
  });

  it("DELETE rejects deleting POSTED adjustment", async () => {
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
      prisma.stockAdjustment.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "a1",
      companyId: "c1",
      status: "POSTED",
    });

    const { DELETE } = await import("@/app/api/stock-adjustments/[id]/route");
    const req = new Request("http://localhost/api/stock-adjustments/a1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "a1" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("غير مسودة");
  });

  it("DELETE allows deleting DRAFT adjustment", async () => {
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
      prisma.stockAdjustment.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "a1",
      companyId: "c1",
      status: "DRAFT",
    });

    const { DELETE } = await import("@/app/api/stock-adjustments/[id]/route");
    const req = new Request("http://localhost/api/stock-adjustments/a1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "a1" }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deleted");
  });
});

describe("AdjustmentService posting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects posting non-DRAFT adjustment", async () => {
    const tx = {
      stockAdjustment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "a1",
          companyId: "c1",
          status: "POSTED",
          lines: [],
        }),
      },
    };

    const result = await AdjustmentService.postAdjustmentInTx(
      tx as never,
      "a1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("غير مسودة");
  });

  it("rejects posting when warehouse inactive", async () => {
    const tx = {
      stockAdjustment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "a1",
          companyId: "c1",
          status: "DRAFT",
          warehouseId: "w1",
          adjustmentDate: new Date(),
          lines: [],
          warehouse: { id: "w1", companyId: "c1", isActive: false },
          company: { id: "c1" },
        }),
      },
    };

    const result = await AdjustmentService.postAdjustmentInTx(
      tx as never,
      "a1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("المخزن غير نشط");
  });

  it("rejects posting when product is SERVICE", async () => {
    const tx = {
      stockAdjustment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "a1",
          companyId: "c1",
          status: "DRAFT",
          warehouseId: "w1",
          adjustmentType: "IN",
          adjustmentDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 5,
              unitCost: 10,
              currency: "IQD",
            },
          ],
          warehouse: { id: "w1", companyId: "c1", isActive: true },
          company: { id: "c1" },
        }),
      },
      product: {
        findUnique: vi.fn().mockResolvedValue({
          isActive: true,
          productType: "SERVICE",
          companyId: "c1",
        }),
      },
    };

    const result = await AdjustmentService.postAdjustmentInTx(
      tx as never,
      "a1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("خدمة");
  });

  it("rejects ADJUSTMENT_OUT when insufficient stock", async () => {
    const tx = {
      stockAdjustment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "a1",
          companyId: "c1",
          status: "DRAFT",
          warehouseId: "w1",
          adjustmentType: "OUT",
          adjustmentDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 50,
              unitCost: 10,
              currency: "IQD",
            },
          ],
          warehouse: { id: "w1", companyId: "c1", isActive: true },
          company: { id: "c1" },
        }),
      },
      product: {
        findUnique: vi.fn().mockResolvedValue({
          isActive: true,
          productType: "STOCK",
          companyId: "c1",
        }),
      },
      stockBalance: {
        findUnique: vi.fn().mockResolvedValue({
          quantityOnHand: 10,
          reservedQuantity: 0,
          averageCost: 8,
          totalValue: 80,
        }),
      },
    };

    const result = await AdjustmentService.postAdjustmentInTx(
      tx as never,
      "a1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("الرصيد غير كافٍ");
  });

  it("successfully posts ADJUSTMENT_IN creating movement", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: "a1",
      status: "POSTED",
    });
    const tx = {
      stockAdjustment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "a1",
          companyId: "c1",
          status: "DRAFT",
          warehouseId: "w1",
          adjustmentType: "IN",
          adjustmentDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 5,
              unitCost: 10,
              currency: "IQD",
            },
          ],
          warehouse: { id: "w1", companyId: "c1", isActive: true },
          company: { id: "c1" },
        }),
        update: mockUpdate,
      },
      product: {
        findUnique: vi.fn().mockResolvedValue({
          isActive: true,
          productType: "STOCK",
          companyId: "c1",
        }),
      },
      stockBalance: {
        findUnique: vi.fn().mockResolvedValue({
          quantityOnHand: 20,
          reservedQuantity: 0,
          averageCost: 10,
          totalValue: 200,
        }),
        upsert: vi.fn().mockResolvedValue({
          id: "b1",
          quantityOnHand: 25,
          reservedQuantity: 0,
          averageCost: 10,
          totalValue: 250,
        }),
      },
      stockMovement: {
        create: vi.fn().mockResolvedValue({
          id: "m1",
          movementType: "ADJUSTMENT_IN",
        }),
        update: vi.fn().mockResolvedValue({ status: "POSTED" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "m1",
          companyId: "c1",
          productId: "p1",
          warehouseId: "w1",
          movementType: "ADJUSTMENT_IN",
          quantity: 5,
          unitCost: 10,
          currency: "IQD",
          status: "DRAFT",
        }),
      },
    };

    const result = await AdjustmentService.postAdjustmentInTx(
      tx as never,
      "a1",
      "u1",
    );
    expect(result.success).toBe(true);
    expect(result.adjustment?.status).toBe("POSTED");
    expect(result.movements).toHaveLength(1);
    expect(result.movements?.[0].movementType).toBe("ADJUSTMENT_IN");
  });

  it("successfully posts ADJUSTMENT_OUT decreasing balance", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: "a1",
      status: "POSTED",
    });
    const tx = {
      stockAdjustment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "a1",
          companyId: "c1",
          status: "DRAFT",
          warehouseId: "w1",
          adjustmentType: "OUT",
          adjustmentDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 5,
              unitCost: 10,
              currency: "IQD",
            },
          ],
          warehouse: { id: "w1", companyId: "c1", isActive: true },
          company: { id: "c1" },
        }),
        update: mockUpdate,
      },
      product: {
        findUnique: vi.fn().mockResolvedValue({
          isActive: true,
          productType: "STOCK",
          companyId: "c1",
        }),
      },
      stockBalance: {
        findUnique: vi.fn().mockResolvedValue({
          quantityOnHand: 20,
          reservedQuantity: 0,
          averageCost: 10,
          totalValue: 200,
        }),
        upsert: vi.fn().mockResolvedValue({
          id: "b1",
          quantityOnHand: 15,
          reservedQuantity: 0,
          averageCost: 10,
          totalValue: 150,
        }),
      },
      stockMovement: {
        create: vi.fn().mockResolvedValue({
          id: "m1",
          movementType: "ADJUSTMENT_OUT",
        }),
        update: vi.fn().mockResolvedValue({ status: "POSTED" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "m1",
          companyId: "c1",
          productId: "p1",
          warehouseId: "w1",
          movementType: "ADJUSTMENT_OUT",
          quantity: 5,
          unitCost: 10,
          currency: "IQD",
          status: "DRAFT",
        }),
      },
    };

    const result = await AdjustmentService.postAdjustmentInTx(
      tx as never,
      "a1",
      "u1",
    );
    expect(result.success).toBe(true);
    expect(result.adjustment?.status).toBe("POSTED");
    expect(result.movements).toHaveLength(1);
    expect(result.movements?.[0].movementType).toBe("ADJUSTMENT_OUT");
  });
});

describe("stock-adjustments schema validation", () => {
  it("rejects missing companyId", async () => {
    const { stockAdjustmentFormSchema } = await import("@/lib/schemas");
    const result = stockAdjustmentFormSchema.safeParse({
      warehouseId: "w1",
      adjustmentType: "IN",
      lines: [{ productId: "p1", quantity: 5 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("companyId")),
      ).toBe(true);
    }
  });

  it("rejects missing warehouseId", async () => {
    const { stockAdjustmentFormSchema } = await import("@/lib/schemas");
    const result = stockAdjustmentFormSchema.safeParse({
      companyId: "c1",
      adjustmentType: "IN",
      lines: [{ productId: "p1", quantity: 5 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("warehouseId")),
      ).toBe(true);
    }
  });

  it("rejects invalid adjustmentType", async () => {
    const { stockAdjustmentFormSchema } = await import("@/lib/schemas");
    const result = stockAdjustmentFormSchema.safeParse({
      companyId: "c1",
      warehouseId: "w1",
      adjustmentType: "INVALID",
      lines: [{ productId: "p1", quantity: 5 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("adjustmentType")),
      ).toBe(true);
    }
  });
});
