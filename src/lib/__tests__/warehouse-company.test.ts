import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    warehouse: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    invoice: {
      count: vi.fn(),
    },
    purchaseInvoice: {
      count: vi.fn(),
    },
    stockMovement: {
      count: vi.fn(),
    },
    branch: {
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

describe("warehouses route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET warehouse rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        id: "w1",
        name: "Warehouse",
        companyId: "c-other",
      },
    );

    const { GET } = await import("@/app/api/warehouses/[id]/route");
    const req = new Request("http://localhost/api/warehouses/w1");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "w1" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST warehouse rejects cross-company branch", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.branch.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "b-other",
      companyId: "c-other",
      isActive: true,
    });

    const { POST } = await import("@/app/api/warehouses/route");
    const req = new Request("http://localhost/api/warehouses", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        code: "WH-01",
        name: "Main",
        branchId: "b-other",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("الفرع لا ينتمي");
  });

  it("POST warehouse rejects inactive branch", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.branch.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "b1",
      companyId: "c1",
      isActive: false,
    });

    const { POST } = await import("@/app/api/warehouses/route");
    const req = new Request("http://localhost/api/warehouses", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        code: "WH-01",
        name: "Main",
        branchId: "b1",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("الفرع غير نشط");
  });

  it("POST warehouse blocks duplicate code per company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.warehouse.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing",
      code: "WH-01",
    });

    const { POST } = await import("@/app/api/warehouses/route");
    const req = new Request("http://localhost/api/warehouses", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        code: "WH-01",
        name: "Main",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });

  it("DELETE warehouse with activity deactivates instead of deleting", async () => {
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
        name: "Warehouse",
        companyId: "c1",
      },
    );
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (
      prisma.purchaseInvoice.count as ReturnType<typeof vi.fn>
    ).mockResolvedValue(0);
    (prisma.stockMovement.count as ReturnType<typeof vi.fn>).mockResolvedValue(
      0,
    );

    const { DELETE } = await import("@/app/api/warehouses/[id]/route");
    const req = new Request("http://localhost/api/warehouses/w1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "w1" }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deactivated");
  });

  it("DELETE warehouse without activity performs hard delete", async () => {
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
        name: "Warehouse",
        companyId: "c1",
      },
    );
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (
      prisma.purchaseInvoice.count as ReturnType<typeof vi.fn>
    ).mockResolvedValue(0);
    (prisma.stockMovement.count as ReturnType<typeof vi.fn>).mockResolvedValue(
      0,
    );

    const { DELETE } = await import("@/app/api/warehouses/[id]/route");
    const req = new Request("http://localhost/api/warehouses/w1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "w1" }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deleted");
  });
});
