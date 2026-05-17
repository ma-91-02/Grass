import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    invoiceItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    warehouse: {
      findFirst: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    paymentAccount: {
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

describe("sales-invoices route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GET list tests
  it("GET list requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("GET list requires sales.view permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices");
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("GET list filters by companyId", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.invoice.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "inv1",
        companyId: "c1",
        invoiceNumber: "INV-0001-0001",
        invoiceDate: new Date(),
        customer: null,
        warehouse: null,
        currency: "IQD",
        exchangeRateValue: 0,
        paymentType: "CASH",
        totalBeforeTax: 100,
        taxAmount: 0,
        discountAmount: 0,
        discountPercent: 0,
        totalAfterTax: 100,
        totalInUsd: 0,
        paid: 100,
        remaining: 0,
        status: "DRAFT",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      },
    ]);

    const { GET } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices?companyId=c1");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].companyId).toBe("c1");
  });

  it("GET list rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } = await import("@/app/api/sales-invoices/route");
    const req = new Request(
      "http://localhost/api/sales-invoices?companyId=c-other",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  // POST tests
  it("POST requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("POST requires sales.create permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it("POST rejects missing companyId", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("POST rejects customer from different company", async () => {
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

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus-other",
        lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("العميل غير موجود");
  });

  it("POST rejects warehouse from different company", async () => {
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
      id: "cus1",
    });
    (prisma.warehouse.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus1",
        warehouseId: "wh-other",
        lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("المخزن غير موجود");
  });

  it("POST rejects products from different company", async () => {
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
      id: "cus1",
    });
    (prisma.warehouse.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wh1",
    });
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus1",
        warehouseId: "wh1",
        lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("بعض المواد غير موجودة");
  });

  it("POST creates draft invoice with server-side totals", async () => {
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
      id: "cus1",
    });
    (prisma.warehouse.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wh1",
    });
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", name: "Product A", code: "PA001", prices: [] },
    ]);
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.invoice.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c1",
      invoiceNumber: "INV-c1-0001",
      invoiceDate: new Date(),
      customerId: "cus1",
      customer: { id: "cus1", name: "Customer A", code: "C001" },
      warehouseId: "wh1",
      warehouse: { id: "wh1", name: "Main Warehouse", code: "WH001" },
      currency: "IQD",
      exchangeRateValue: 0,
      paymentType: "CASH",
      totalBeforeTax: 100,
      taxAmount: 0,
      discountAmount: 0,
      discountPercent: 0,
      totalAfterTax: 100,
      totalInUsd: 0,
      paid: 100,
      remaining: 0,
      status: "DRAFT",
      notes: null,
      createdAt: new Date(),
      items: [
        {
          id: "item1",
          productId: "p1",
          product: { id: "p1", name: "Product A", code: "PA001" },
          quantity: 1,
          unitPrice: 100,
          discountPercent: 0,
          discountAmount: 0,
          totalPrice: 100,
          lineTotal: 100,
          productNameSnapshot: "Product A",
          productCodeSnapshot: "PA001",
        },
      ],
    });

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentType: "CASH",
        lines: [{ productId: "p1", quantity: 1, unitPrice: 100 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.status).toBe("DRAFT");
    expect(json.data.totalAfterTax).toBe(100);
    expect(json.data.paid).toBe(100);
    expect(json.data.remaining).toBe(0);
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].lineTotal).toBe(100);
  });

  it("POST calculates CASH payment correctly", async () => {
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
      id: "cus1",
    });
    (prisma.warehouse.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wh1",
    });
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", name: "Product A", code: "PA001", prices: [] },
    ]);
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.invoice.create as ReturnType<typeof vi.fn>).mockImplementation(
      (args: { data: Record<string, unknown> }) => ({
        id: "inv1",
        companyId: "c1",
        invoiceNumber: "INV-c1-0001",
        invoiceDate: new Date(),
        customer: null,
        warehouse: null,
        currency: "IQD",
        exchangeRateValue: 0,
        paymentType: args.data.paymentType,
        totalBeforeTax: args.data.totalBeforeTax,
        taxAmount: args.data.taxAmount,
        discountAmount: args.data.discountAmount,
        discountPercent: args.data.discountPercent,
        totalAfterTax: args.data.totalAfterTax,
        totalInUsd: args.data.totalInUsd,
        paid: args.data.paid,
        remaining: args.data.remaining,
        status: "DRAFT",
        notes: null,
        createdAt: new Date(),
        items: [],
      }),
    );

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentType: "CASH",
        lines: [{ productId: "p1", quantity: 2, unitPrice: 50 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.paid).toBe(100);
    expect(json.data.remaining).toBe(0);
  });

  it("POST calculates CREDIT payment correctly", async () => {
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
      id: "cus1",
    });
    (prisma.warehouse.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wh1",
    });
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", name: "Product A", code: "PA001", prices: [] },
    ]);
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.invoice.create as ReturnType<typeof vi.fn>).mockImplementation(
      (args: { data: Record<string, unknown> }) => ({
        id: "inv1",
        companyId: "c1",
        invoiceNumber: "INV-c1-0001",
        invoiceDate: new Date(),
        customer: null,
        warehouse: null,
        currency: "IQD",
        exchangeRateValue: 0,
        paymentType: args.data.paymentType,
        totalBeforeTax: args.data.totalBeforeTax,
        taxAmount: args.data.taxAmount,
        discountAmount: args.data.discountAmount,
        discountPercent: args.data.discountPercent,
        totalAfterTax: args.data.totalAfterTax,
        totalInUsd: args.data.totalInUsd,
        paid: args.data.paid,
        remaining: args.data.remaining,
        status: "DRAFT",
        notes: null,
        createdAt: new Date(),
        items: [],
      }),
    );

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentType: "CREDIT",
        lines: [{ productId: "p1", quantity: 2, unitPrice: 50 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.paid).toBe(0);
    expect(json.data.remaining).toBe(100);
  });

  it("POST calculates MIXED payment correctly", async () => {
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
      id: "cus1",
    });
    (prisma.warehouse.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wh1",
    });
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", name: "Product A", code: "PA001", prices: [] },
    ]);
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.invoice.create as ReturnType<typeof vi.fn>).mockImplementation(
      (args: { data: Record<string, unknown> }) => ({
        id: "inv1",
        companyId: "c1",
        invoiceNumber: "INV-c1-0001",
        invoiceDate: new Date(),
        customer: null,
        warehouse: null,
        currency: "IQD",
        exchangeRateValue: 0,
        paymentType: args.data.paymentType,
        totalBeforeTax: args.data.totalBeforeTax,
        taxAmount: args.data.taxAmount,
        discountAmount: args.data.discountAmount,
        discountPercent: args.data.discountPercent,
        totalAfterTax: args.data.totalAfterTax,
        totalInUsd: args.data.totalInUsd,
        paid: args.data.paid,
        remaining: args.data.remaining,
        status: "DRAFT",
        notes: null,
        createdAt: new Date(),
        items: [],
      }),
    );

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentType: "MIXED",
        paid: 30,
        lines: [{ productId: "p1", quantity: 2, unitPrice: 50 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.paid).toBe(30);
    expect(json.data.remaining).toBe(70);
  });

  // GET detail tests
  it("GET detail requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET detail rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c-other",
      invoiceNumber: "INV-001",
    });

    const { GET } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(403);
  });

  it("GET detail returns invoice with items", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c1",
      invoiceNumber: "INV-001",
      invoiceDate: new Date(),
      customerId: "cus1",
      customer: { id: "cus1", name: "Customer A", code: "C001" },
      warehouseId: "wh1",
      warehouse: { id: "wh1", name: "Main", code: "WH001" },
      currency: "IQD",
      exchangeRateValue: 0,
      paymentType: "CASH",
      totalBeforeTax: 100,
      taxAmount: 0,
      discountAmount: 0,
      discountPercent: 0,
      totalAfterTax: 100,
      totalInUsd: 0,
      paid: 100,
      remaining: 0,
      status: "DRAFT",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: "item1",
          productId: "p1",
          product: { id: "p1", name: "Product A", code: "PA001" },
          quantity: 1,
          unitPrice: 100,
          discountPercent: 0,
          discountAmount: 0,
          totalPrice: 100,
          lineTotal: 100,
          productNameSnapshot: "Product A",
          productCodeSnapshot: "PA001",
          notes: null,
        },
      ],
    });

    const { GET } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.invoiceNumber).toBe("INV-001");
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].productName).toBe("Product A");
  });

  // PATCH tests
  it("PATCH requires sales.edit permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { PATCH } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH rejects non-DRAFT invoice", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c1",
      status: "POSTED",
      totalAfterTax: 100,
      paid: 100,
      remaining: 0,
      exchangeRateValue: 1,
      discountPercent: 0,
      discountAmount: 0,
      paymentType: "CASH",
      currency: "IQD",
    });

    const { PATCH } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "PATCH",
      body: JSON.stringify({ notes: "Updated" }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("ليست في حالة مسودة");
  });

  it("PATCH updates DRAFT invoice and recalculates totals", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: "inv1",
        companyId: "c1",
        status: "DRAFT",
        totalAfterTax: 100,
        paid: 100,
        remaining: 0,
        exchangeRateValue: 1,
        discountPercent: 0,
        discountAmount: 0,
        paymentType: "CASH",
        currency: "IQD",
        items: [],
      })
      .mockResolvedValueOnce({
        id: "inv1",
        companyId: "c1",
        invoiceNumber: "INV-001",
        invoiceDate: new Date(),
        customer: null,
        warehouse: null,
        currency: "IQD",
        exchangeRateValue: 0,
        paymentType: "CASH",
        totalBeforeTax: 300,
        taxAmount: 0,
        discountAmount: 0,
        discountPercent: 0,
        totalAfterTax: 300,
        totalInUsd: 0,
        paid: 300,
        remaining: 0,
        status: "DRAFT",
        notes: "Updated",
        createdAt: new Date(),
        items: [],
      });
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", name: "Product A", code: "PA001" },
      { id: "p2", name: "Product B", code: "PB002" },
    ]);
    (
      prisma.invoiceItem.deleteMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (prisma.invoice.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c1",
      invoiceNumber: "INV-001",
      invoiceDate: new Date(),
      customer: null,
      warehouse: null,
      currency: "IQD",
      exchangeRateValue: 0,
      paymentType: "CASH",
      totalBeforeTax: 300,
      taxAmount: 0,
      discountAmount: 0,
      discountPercent: 0,
      totalAfterTax: 300,
      totalInUsd: 0,
      paid: 300,
      remaining: 0,
      status: "DRAFT",
      notes: "Updated",
      createdAt: new Date(),
      items: [],
    });

    const { PATCH } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "PATCH",
      body: JSON.stringify({
        notes: "Updated",
        lines: [
          { productId: "p1", quantity: 2, unitPrice: 100 },
          { productId: "p2", quantity: 1, unitPrice: 100 },
        ],
      }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.totalAfterTax).toBe(300);
    expect(json.data.notes).toBe("Updated");
  });

  // DELETE tests
  it("DELETE requires sales.delete permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { DELETE } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "DELETE",
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE rejects non-DRAFT invoice", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c1",
      status: "POSTED",
      invoiceNumber: "INV-001",
    });

    const { DELETE } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "DELETE",
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("ليست في حالة مسودة");
  });

  it("DELETE removes DRAFT invoice", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c1",
      status: "DRAFT",
      invoiceNumber: "INV-001",
    });
    (
      prisma.invoiceItem.deleteMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (prisma.invoice.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
    });

    const { DELETE } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "DELETE",
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.action).toBe("deleted");
  });

  // Company isolation for PATCH and DELETE
  it("PATCH rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c-other",
      status: "DRAFT",
    });

    const { PATCH } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "PATCH",
      body: JSON.stringify({ notes: "Updated" }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(403);
  });

  it("DELETE rejects access to different company", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c-other",
      status: "DRAFT",
      invoiceNumber: "INV-001",
    });

    const { DELETE } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "DELETE",
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(403);
  });
});
