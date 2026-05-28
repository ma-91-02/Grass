import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
  logAudit,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employee: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
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
  notFoundError: (message = "Not found") =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status: 404,
    }),
  conflictError: (message: string) =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status: 409,
    }),
}));

const user = {
  userId: "user-1",
  email: "owner@grass.local",
  name: "Owner",
  roles: ["مدير النظام"],
  permissions: [],
};

const employee = {
  id: "emp-1",
  companyId: "company-1",
  code: "EMP-001",
  name: "محمد علي",
  phone: "07700000000",
  email: "employee@grass.local",
  address: "بغداد",
  position: "محاسب",
  notes: null,
  isActive: true,
  createdAt: new Date("2026-05-28T00:00:00.000Z"),
};

describe("employees API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(user);
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (logAudit as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      companyId: "company-1",
    });
  });

  it("GET list requires employees.view permission", async () => {
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } = await import("@/app/api/employees/route");
    const res = await GET(
      new Request("http://localhost/api/employees") as never,
    );

    expect(res.status).toBe(403);
  });

  it("GET filters by accessible companyId", async () => {
    (prisma.employee.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      employee,
    ]);

    const { GET } = await import("@/app/api/employees/route");
    const res = await GET(
      new Request(
        "http://localhost/api/employees?companyId=company-1",
      ) as never,
    );

    expect(res.status).toBe(200);
    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("POST requires companyId", async () => {
    const { POST } = await import("@/app/api/employees/route");
    const res = await POST(
      new Request("http://localhost/api/employees", {
        method: "POST",
        body: JSON.stringify({ code: "EMP-001", name: "محمد علي" }),
      }) as never,
    );

    expect(res.status).toBe(400);
  });

  it("POST rejects duplicate employee code per company", async () => {
    (prisma.employee.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "existing",
    });

    const { POST } = await import("@/app/api/employees/route");
    const res = await POST(
      new Request("http://localhost/api/employees", {
        method: "POST",
        body: JSON.stringify({
          companyId: "company-1",
          code: "EMP-001",
          name: "محمد علي",
        }),
      }) as never,
    );

    expect(res.status).toBe(409);
  });

  it("POST creates employee and writes audit", async () => {
    (prisma.employee.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (prisma.employee.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      employee,
    );

    const { POST } = await import("@/app/api/employees/route");
    const res = await POST(
      new Request("http://localhost/api/employees", {
        method: "POST",
        body: JSON.stringify({
          companyId: "company-1",
          code: "EMP-001",
          name: "محمد علي",
          email: "",
        }),
      }) as never,
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.code).toBe("EMP-001");
    expect(logAudit).toHaveBeenCalledWith(
      "user-1",
      "CREATE",
      "Employee",
      "emp-1",
      expect.objectContaining({ code: "EMP-001" }),
    );
  });

  it("GET detail rejects cross-company access", async () => {
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (prisma.employee.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      employee,
    );

    const { GET } = await import("@/app/api/employees/[id]/route");
    const res = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "emp-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("PATCH rejects duplicate code inside target company", async () => {
    (prisma.employee.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      employee,
    );
    (prisma.employee.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "emp-2",
    });

    const { PATCH } = await import("@/app/api/employees/[id]/route");
    const res = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ code: "EMP-002" }),
      }) as never,
      { params: Promise.resolve({ id: "emp-1" }) },
    );

    expect(res.status).toBe(409);
  });

  it("DELETE removes employee and writes audit", async () => {
    (prisma.employee.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      employee,
    );
    (prisma.employee.delete as ReturnType<typeof vi.fn>).mockResolvedValue(
      employee,
    );

    const { DELETE } = await import("@/app/api/employees/[id]/route");
    const res = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "emp-1" }),
    });

    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      "user-1",
      "DELETE",
      "Employee",
      "emp-1",
      expect.objectContaining({ code: "EMP-001" }),
    );
  });
});
