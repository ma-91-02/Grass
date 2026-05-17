import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";
import { TransferService } from "@/lib/services/transfer-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stockTransfer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    stockTransferLine: {
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

describe("stock-transfers route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET transfer rejects access to different company", async () => {
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
      prisma.stockTransfer.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "t1",
      companyId: "c-other",
      status: "DRAFT",
    });

    const { GET } = await import("@/app/api/stock-transfers/[id]/route");
    const req = new Request("http://localhost/api/stock-transfers/t1");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST rejects same from/to warehouse", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const { POST } = await import("@/app/api/stock-transfers/route");
    const req = new Request("http://localhost/api/stock-transfers", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        fromWarehouseId: "w1",
        toWarehouseId: "w1",
        lines: [{ productId: "p1", quantity: 5 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("مختلفين");
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

    const { POST } = await import("@/app/api/stock-transfers/route");
    const req = new Request("http://localhost/api/stock-transfers", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
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

    const { POST } = await import("@/app/api/stock-transfers/route");
    const req = new Request("http://localhost/api/stock-transfers", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
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
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: "w1",
        companyId: "c1",
        isActive: false,
        name: "WH1",
      })
      .mockResolvedValueOnce({
        id: "w2",
        companyId: "c1",
        isActive: true,
        name: "WH2",
      });

    const { POST } = await import("@/app/api/stock-transfers/route");
    const req = new Request("http://localhost/api/stock-transfers", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
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
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: "w1",
        companyId: "c-other",
        isActive: true,
        name: "WH1",
      })
      .mockResolvedValueOnce({
        id: "w2",
        companyId: "c1",
        isActive: true,
        name: "WH2",
      });

    const { POST } = await import("@/app/api/stock-transfers/route");
    const req = new Request("http://localhost/api/stock-transfers", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
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
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: "w1",
        companyId: "c1",
        isActive: true,
        name: "WH1",
      })
      .mockResolvedValueOnce({
        id: "w2",
        companyId: "c1",
        isActive: true,
        name: "WH2",
      });
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      companyId: "c1",
      isActive: true,
      productType: "SERVICE",
    });

    const { POST } = await import("@/app/api/stock-transfers/route");
    const req = new Request("http://localhost/api/stock-transfers", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
        lines: [{ productId: "p1", quantity: 5 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("خدمة");
  });

  it("PATCH rejects editing POSTED transfer", async () => {
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
      prisma.stockTransfer.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "t1",
      companyId: "c1",
      status: "POSTED",
    });

    const { PATCH } = await import("@/app/api/stock-transfers/[id]/route");
    const req = new Request("http://localhost/api/stock-transfers/t1", {
      method: "PATCH",
      body: JSON.stringify({ notes: "updated" }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("غير مسود");
  });

  it("DELETE rejects deleting POSTED transfer", async () => {
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
      prisma.stockTransfer.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "t1",
      companyId: "c1",
      status: "POSTED",
    });

    const { DELETE } = await import("@/app/api/stock-transfers/[id]/route");
    const req = new Request("http://localhost/api/stock-transfers/t1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("غير مسود");
  });

  it("DELETE allows deleting DRAFT transfer", async () => {
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
      prisma.stockTransfer.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "t1",
      companyId: "c1",
      status: "DRAFT",
    });

    const { DELETE } = await import("@/app/api/stock-transfers/[id]/route");
    const req = new Request("http://localhost/api/stock-transfers/t1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "t1" }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deleted");
  });
});

describe("TransferService posting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects posting non-DRAFT transfer", async () => {
    const tx = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          companyId: "c1",
          status: "POSTED",
          lines: [],
        }),
      },
      stockMovement: { create: vi.fn() },
      stockBalance: { findUnique: vi.fn() },
      product: { findUnique: vi.fn() },
      stockTransferLine: { findMany: vi.fn() },
    };

    const result = await TransferService.postTransferInTx(
      tx as never,
      "t1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("غير مسود");
  });

  it("rejects posting when from warehouse inactive", async () => {
    const tx = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          companyId: "c1",
          status: "DRAFT",
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          transferDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 5,
              unitCost: 10,
              currency: "IQD",
            },
          ],
          fromWarehouse: { id: "w1", companyId: "c1", isActive: false },
          toWarehouse: { id: "w2", companyId: "c1", isActive: true },
          company: { id: "c1" },
        }),
      },
    };

    const result = await TransferService.postTransferInTx(
      tx as never,
      "t1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("المخزن المصدر غير نشط");
  });

  it("rejects posting when to warehouse inactive", async () => {
    const tx = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          companyId: "c1",
          status: "DRAFT",
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          transferDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 5,
              unitCost: 10,
              currency: "IQD",
            },
          ],
          fromWarehouse: { id: "w1", companyId: "c1", isActive: true },
          toWarehouse: { id: "w2", companyId: "c1", isActive: false },
          company: { id: "c1" },
        }),
      },
    };

    const result = await TransferService.postTransferInTx(
      tx as never,
      "t1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("المخزن الوجهة غير نشط");
  });

  it("rejects posting when product is SERVICE", async () => {
    const tx = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          companyId: "c1",
          status: "DRAFT",
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          transferDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 5,
              unitCost: 10,
              currency: "IQD",
            },
          ],
          fromWarehouse: { id: "w1", companyId: "c1", isActive: true },
          toWarehouse: { id: "w2", companyId: "c1", isActive: true },
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

    const result = await TransferService.postTransferInTx(
      tx as never,
      "t1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("خدمة");
  });

  it("rejects posting when insufficient stock", async () => {
    const tx = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          companyId: "c1",
          status: "DRAFT",
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          transferDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 50,
              unitCost: 10,
              currency: "IQD",
            },
          ],
          fromWarehouse: { id: "w1", companyId: "c1", isActive: true },
          toWarehouse: { id: "w2", companyId: "c1", isActive: true },
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

    const result = await TransferService.postTransferInTx(
      tx as never,
      "t1",
      "u1",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("الرصيد غير كافٍ");
  });

  it("successfully posts transfer creating OUT and IN movements", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: "t1",
      status: "POSTED",
    });
    const tx = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "t1",
          companyId: "c1",
          status: "DRAFT",
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          transferDate: new Date(),
          lines: [
            {
              id: "l1",
              productId: "p1",
              quantity: 5,
              unitCost: 0,
              currency: "IQD",
            },
          ],
          fromWarehouse: { id: "w1", companyId: "c1", isActive: true },
          toWarehouse: { id: "w2", companyId: "c1", isActive: true },
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
        create: vi
          .fn()
          .mockResolvedValueOnce({
            id: "m-out",
            movementType: "TRANSFER_OUT",
          })
          .mockResolvedValueOnce({
            id: "m-in",
            movementType: "TRANSFER_IN",
          }),
        update: vi.fn().mockResolvedValue({ status: "POSTED" }),
        findUnique: vi.fn().mockResolvedValue({
          id: "m-out",
          companyId: "c1",
          productId: "p1",
          warehouseId: "w1",
          movementType: "TRANSFER_OUT",
          quantity: 5,
          unitCost: 10,
          currency: "IQD",
          status: "DRAFT",
        }),
      },
    };

    const result = await TransferService.postTransferInTx(
      tx as never,
      "t1",
      "u1",
    );
    expect(result.success).toBe(true);
    expect(result.transfer?.status).toBe("POSTED");
    expect(result.movements).toHaveLength(2);
    expect(result.movements?.[0].movementType).toBe("TRANSFER_OUT");
    expect(result.movements?.[1].movementType).toBe("TRANSFER_IN");
  });
});

describe("stock-transfers schema validation", () => {
  it("rejects missing companyId", async () => {
    const { stockTransferFormSchema } = await import("@/lib/schemas");
    const result = stockTransferFormSchema.safeParse({
      fromWarehouseId: "w1",
      toWarehouseId: "w2",
      lines: [{ productId: "p1", quantity: 5 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("companyId")),
      ).toBe(true);
    }
  });

  it("rejects missing fromWarehouseId", async () => {
    const { stockTransferFormSchema } = await import("@/lib/schemas");
    const result = stockTransferFormSchema.safeParse({
      companyId: "c1",
      toWarehouseId: "w2",
      lines: [{ productId: "p1", quantity: 5 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("fromWarehouseId")),
      ).toBe(true);
    }
  });

  it("rejects same from and to warehouse", async () => {
    const { stockTransferFormSchema } = await import("@/lib/schemas");
    const result = stockTransferFormSchema.safeParse({
      companyId: "c1",
      fromWarehouseId: "w1",
      toWarehouseId: "w1",
      lines: [{ productId: "p1", quantity: 5 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("مختلفين")),
      ).toBe(true);
    }
  });
});
