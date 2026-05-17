import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stockMovement: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
    role: {
      findMany: vi.fn(),
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

describe("stock-movements route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET movement rejects access to different company", async () => {
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
      prisma.stockMovement.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "m1",
      companyId: "c-other",
      status: "DRAFT",
    });

    const { GET } = await import("@/app/api/stock-movements/[id]/route");
    const req = new Request("http://localhost/api/stock-movements/m1");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "m1" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST rejects inactive product", async () => {
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
      companyId: "c1",
      isActive: false,
      productType: "STOCK",
    });

    const { POST } = await import("@/app/api/stock-movements/route");
    const req = new Request("http://localhost/api/stock-movements", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        productId: "p1",
        warehouseId: "w1",
        movementType: "IN",
        quantity: 10,
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("غير نشطة");
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
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      companyId: "c1",
      isActive: true,
      productType: "SERVICE",
    });

    const { POST } = await import("@/app/api/stock-movements/route");
    const req = new Request("http://localhost/api/stock-movements", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        productId: "p1",
        warehouseId: "w1",
        movementType: "IN",
        quantity: 10,
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("خدمة");
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
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      companyId: "c1",
      isActive: true,
      productType: "STOCK",
    });
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        id: "w1",
        companyId: "c-other",
        isActive: true,
      },
    );

    const { POST } = await import("@/app/api/stock-movements/route");
    const req = new Request("http://localhost/api/stock-movements", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        productId: "p1",
        warehouseId: "w1",
        movementType: "IN",
        quantity: 10,
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("المخزن لا ينتمي");
  });

  it("PATCH rejects editing POSTED movement", async () => {
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
      prisma.stockMovement.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "m1",
      companyId: "c1",
      status: "POSTED",
    });

    const { PATCH } = await import("@/app/api/stock-movements/[id]/route");
    const req = new Request("http://localhost/api/stock-movements/m1", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 20 }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "m1" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("غير مسودة");
  });

  it("DELETE rejects deleting POSTED movement", async () => {
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
      prisma.stockMovement.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "m1",
      companyId: "c1",
      status: "POSTED",
    });

    const { DELETE } = await import("@/app/api/stock-movements/[id]/route");
    const req = new Request("http://localhost/api/stock-movements/m1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "m1" }),
    });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("غير مسودة");
  });

  it("DELETE allows deleting DRAFT movement", async () => {
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
      prisma.stockMovement.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "m1",
      companyId: "c1",
      status: "DRAFT",
    });

    const { DELETE } = await import("@/app/api/stock-movements/[id]/route");
    const req = new Request("http://localhost/api/stock-movements/m1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "m1" }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deleted");
  });
});
