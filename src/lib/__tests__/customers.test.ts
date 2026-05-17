import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    customerAccount: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
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

describe("customers route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET customer rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      name: "Customer",
      companyId: "c-other",
    });

    const { GET } = await import("@/app/api/customers/[id]/route");
    const req = new Request("http://localhost/api/customers/c1");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST customer requires companyId", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const { POST } = await import("@/app/api/customers/route");
    const req = new Request("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({
        code: "CUS-001",
        name: "Test Customer",
        customerType: "INDIVIDUAL",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("POST customer rejects duplicate code per company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing",
      code: "CUS-001",
    });

    const { POST } = await import("@/app/api/customers/route");
    const req = new Request("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        code: "CUS-001",
        name: "Test Customer",
        customerType: "INDIVIDUAL",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("مستخدم مسبقاً");
  });

  it("POST creates customer with company isolation", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (prisma.customer.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      companyId: "comp1",
      code: "CUS-001",
      name: "Test Customer",
      phone: null,
      whatsapp: null,
      email: null,
      address: null,
      governorate: null,
      customerType: "INDIVIDUAL",
      customerCategoryId: null,
      notes: null,
      creditLimit: 0,
      currentBalance: 0,
      currency: "IQD",
      isActive: true,
      createdAt: new Date(),
      accounts: [],
      customerCategory: null,
    });

    const { POST } = await import("@/app/api/customers/route");
    const req = new Request("http://localhost/api/customers", {
      method: "POST",
      body: JSON.stringify({
        companyId: "comp1",
        code: "CUS-001",
        name: "Test Customer",
        customerType: "INDIVIDUAL",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.code).toBe("CUS-001");
    expect(json.data.companyId).toBe("comp1");
  });

  it("GET filters by companyId", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "c1",
        companyId: "comp1",
        code: "CUS-001",
        name: "Customer A",
        phone: null,
        whatsapp: null,
        email: null,
        address: null,
        governorate: null,
        customerType: "INDIVIDUAL",
        customerCategoryId: null,
        notes: null,
        creditLimit: 0,
        currentBalance: 0,
        currency: "IQD",
        isActive: true,
        createdAt: new Date(),
        accounts: [],
        customerCategory: null,
      },
    ]);

    const { GET } = await import("@/app/api/customers/route");
    const req = new Request("http://localhost/api/customers?companyId=comp1");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].companyId).toBe("comp1");
  });

  it("PATCH updates customer within company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      companyId: "comp1",
      code: "CUS-001",
      name: "Old Name",
    });
    (prisma.customer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (prisma.customer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      companyId: "comp1",
      code: "CUS-001",
      name: "New Name",
      phone: null,
      whatsapp: null,
      email: null,
      address: null,
      governorate: null,
      customerType: "INDIVIDUAL",
      customerCategoryId: null,
      notes: null,
      creditLimit: 0,
      currentBalance: 0,
      currency: "IQD",
      isActive: true,
      createdAt: new Date(),
      accounts: [],
      customerCategory: null,
    });

    const { PATCH } = await import("@/app/api/customers/[id]/route");
    const req = new Request("http://localhost/api/customers/c1", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("New Name");
  });

  it("DELETE deactivates customer with invoices", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      companyId: "comp1",
      name: "Customer",
      invoices: [{ id: "inv1" }],
    });
    (prisma.customer.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      isActive: false,
    });

    const { DELETE } = await import("@/app/api/customers/[id]/route");
    const req = new Request("http://localhost/api/customers/c1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "c1" }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deactivated");
  });

  it("DELETE hard-deletes customer without invoices", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "c1",
      companyId: "comp1",
      name: "Customer",
      invoices: [],
    });

    const { DELETE } = await import("@/app/api/customers/[id]/route");
    const req = new Request("http://localhost/api/customers/c1");
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "c1" }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.action).toBe("deleted");
  });

  it("rejects 401 without session", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import("@/app/api/customers/route");
    const req = new Request("http://localhost/api/customers?companyId=comp1");
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

    const { GET } = await import("@/app/api/customers/route");
    const req = new Request("http://localhost/api/customers?companyId=comp1");
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });
});

describe("customer schema validation", () => {
  it("rejects missing companyId", async () => {
    const { customerFormSchema } = await import("@/lib/schemas");
    const result = customerFormSchema.safeParse({
      code: "CUS-001",
      name: "Test",
      customerType: "INDIVIDUAL",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("companyId")),
      ).toBe(true);
    }
  });

  it("rejects missing code", async () => {
    const { customerFormSchema } = await import("@/lib/schemas");
    const result = customerFormSchema.safeParse({
      companyId: "c1",
      name: "Test",
      customerType: "INDIVIDUAL",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("code"))).toBe(
        true,
      );
    }
  });

  it("rejects missing name", async () => {
    const { customerFormSchema } = await import("@/lib/schemas");
    const result = customerFormSchema.safeParse({
      companyId: "c1",
      code: "CUS-001",
      customerType: "INDIVIDUAL",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("name"))).toBe(
        true,
      );
    }
  });

  it("rejects invalid email", async () => {
    const { customerFormSchema } = await import("@/lib/schemas");
    const result = customerFormSchema.safeParse({
      companyId: "c1",
      code: "CUS-001",
      name: "Test",
      customerType: "INDIVIDUAL",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(
        true,
      );
    }
  });

  it("rejects negative creditLimit", async () => {
    const { customerFormSchema } = await import("@/lib/schemas");
    const result = customerFormSchema.safeParse({
      companyId: "c1",
      code: "CUS-001",
      name: "Test",
      customerType: "INDIVIDUAL",
      creditLimit: -10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("creditLimit")),
      ).toBe(true);
    }
  });

  it("accepts valid optional fields", async () => {
    const { customerFormSchema } = await import("@/lib/schemas");
    const result = customerFormSchema.safeParse({
      companyId: "c1",
      code: "CUS-001",
      name: "Test",
      customerType: "INDIVIDUAL",
      phone: "123456",
      email: "test@example.com",
      creditLimit: 1000,
    });
    expect(result.success).toBe(true);
  });
});
