import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    productCategory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    unit: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productPrice: {
      deleteMany: vi.fn(),
    },
    invoiceItem: {
      count: vi.fn(),
    },
    purchaseInvoiceItem: {
      count: vi.fn(),
    },
    stockMovement: {
      count: vi.fn(),
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
    new Response(JSON.stringify({ success: false, error: message }), { status }),
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

describe("products route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET product rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "p1",
      name: "Product",
      companyId: "c-other",
    });

    const { GET } = await import("@/app/api/products/[id]/route");
    const req = new Request("http://localhost/api/products/p1");
    const res = await GET(req as never, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(403);
  });

  it("DELETE product with activity deactivates instead of deleting", async () => {
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
      name: "Product",
      companyId: "c1",
    });
    (prisma.invoiceItem.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.purchaseInvoiceItem.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.stockMovement.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const { DELETE } = await import("@/app/api/products/[id]/route");
    const req = new Request("http://localhost/api/products/p1");
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "p1" }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deactivated");
  });
});

describe("categories route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET category rejects access to different company", async () => {
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
      prisma.productCategory.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "cat1",
      name: "Food",
      companyId: "c-other",
    });

    const { GET } = await import("@/app/api/categories/[id]/route");
    const req = new Request("http://localhost/api/categories/cat1");
    const res = await GET(req as never, { params: Promise.resolve({ id: "cat1" }) });
    expect(res.status).toBe(403);
  });

  it("POST category blocks duplicate code per company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.productCategory.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing",
      code: "FOOD",
    });

    const { POST } = await import("@/app/api/categories/route");
    const req = new Request("http://localhost/api/categories", {
      method: "POST",
      body: JSON.stringify({ companyId: "c1", name: "Food", code: "FOOD" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });
});

describe("units route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET unit rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (prisma.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      name: "Box",
      companyId: "c-other",
    });

    const { GET } = await import("@/app/api/units/[id]/route");
    const req = new Request("http://localhost/api/units/u1");
    const res = await GET(req as never, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(403);
  });

  it("POST unit blocks duplicate code per company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.unit.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing",
      code: "BOX",
    });

    const { POST } = await import("@/app/api/units/route");
    const req = new Request("http://localhost/api/units", {
      method: "POST",
      body: JSON.stringify({ companyId: "c1", name: "Box", code: "BOX", type: "BOX" }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
  });

  it("DELETE unit with products deactivates instead of deleting", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.unit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      name: "Box",
      companyId: "c1",
    });
    (prisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const { DELETE } = await import("@/app/api/units/[id]/route");
    const req = new Request("http://localhost/api/units/u1");
    const res = await DELETE(req as never, { params: Promise.resolve({ id: "u1" }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deactivated");
  });
});
