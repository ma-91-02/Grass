import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";
import { StockBalanceService } from "@/lib/services/stock-balance-service";
import { PeriodGuard } from "@/lib/services/period-guard";

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
    account: {
      findFirst: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      update: vi.fn(),
    },
    stockBalance: {
      findUnique: vi.fn(),
    },
    journalEntry: {
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  logAudit: vi.fn(),
  requireDbPermission: vi.fn(),
  canAccessCompany: vi.fn(),
}));

vi.mock("@/lib/services/stock-balance-service", () => ({
  StockBalanceService: {
    ensureSufficientStock: vi.fn(),
    applyPostedMovement: vi.fn(),
  },
}));

vi.mock("@/lib/services/period-guard", () => ({
  PeriodGuard: {
    checkPeriodOpen: vi.fn(),
  },
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
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const { GET } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices?companyId=c1");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.data).toHaveLength(1);
    expect(json.data.data[0].companyId).toBe("c1");
    expect(json.data.pagination.total).toBe(1);
    expect(json.data.summary.totalInvoices).toBe(1);
    expect(json.data.summary.totalAmount).toBe(100);
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

  it("GET list supports pagination and returns summary", async () => {
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
        invoiceNumber: "INV-001",
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
      {
        id: "inv2",
        companyId: "c1",
        invoiceNumber: "INV-002",
        invoiceDate: new Date(),
        customer: { id: "cus1", name: "Customer A", code: "C001" },
        warehouse: null,
        currency: "IQD",
        exchangeRateValue: 0,
        paymentType: "CREDIT",
        totalBeforeTax: 200,
        taxAmount: 0,
        discountAmount: 0,
        discountPercent: 0,
        totalAfterTax: 200,
        totalInUsd: 0,
        paid: 0,
        remaining: 200,
        status: "DRAFT",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      },
    ]);
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

    const { GET } = await import("@/app/api/sales-invoices/route");
    const req = new Request(
      "http://localhost/api/sales-invoices?companyId=c1&page=1&limit=2",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.data).toHaveLength(2);
    expect(json.data.pagination.page).toBe(1);
    expect(json.data.pagination.limit).toBe(2);
    expect(json.data.pagination.total).toBe(5);
    expect(json.data.pagination.totalPages).toBe(3);
    expect(json.data.summary.totalInvoices).toBe(5);
    expect(json.data.summary.totalAmount).toBe(300);
    expect(json.data.summary.totalPaid).toBe(100);
    expect(json.data.summary.totalRemaining).toBe(200);
  });

  it("GET list normalizes invalid pagination params", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.invoice.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const { GET } = await import("@/app/api/sales-invoices/route");
    const req = new Request(
      "http://localhost/api/sales-invoices?companyId=c1&page=-1&limit=999",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.pagination.page).toBe(1);
    expect(json.data.pagination.limit).toBe(100);
  });

  it("GET list filters by customerId and status", async () => {
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
        invoiceNumber: "INV-001",
        invoiceDate: new Date(),
        customer: { id: "cus1", name: "Customer A", code: "C001" },
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
        status: "POSTED",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      },
    ]);
    (prisma.invoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const { GET } = await import("@/app/api/sales-invoices/route");
    const req = new Request(
      "http://localhost/api/sales-invoices?companyId=c1&customerId=cus1&status=POSTED",
    );
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.data).toHaveLength(1);
    expect(json.data.data[0].status).toBe("POSTED");
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

  // POSTING TESTS
  describe("posting", () => {
    const mockInvoice = {
      id: "inv1",
      companyId: "c1",
      invoiceNumber: "INV-001",
      invoiceDate: new Date(),
      currency: "IQD" as const,
      exchangeRateValue: 0,
      exchangeRateSnapshot: 1,
      paymentType: "CASH",
      paymentAccountId: "pa1",
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
      createdById: "u1",
      items: [
        {
          id: "item1",
          productId: "p1",
          product: {
            id: "p1",
            name: "Product A",
            code: "PA001",
            isActive: true,
          },
          quantity: 2,
          unitPrice: 50,
          discountPercent: 0,
          discountAmount: 0,
          totalPrice: 100,
          lineTotal: 100,
          productNameSnapshot: "Product A",
          productCodeSnapshot: "PA001",
          averageCostSnapshot: null,
          stockMovementId: null,
        },
      ],
      customerId: "cus1",
      customer: { id: "cus1", name: "Customer A", isActive: true },
      warehouseId: "wh1",
      warehouse: { id: "wh1", name: "Main", isActive: true, branchId: null },
      company: { id: "c1", name: "Company A" },
      paymentAccount: { id: "pa1", name: "Cash IQD" },
    };

    const mockAccounts = {
      cash: {
        id: "acc-cash",
        code: "1.1.1",
        name: "Cash",
        currency: "IQD",
        isActive: true,
        isPosting: true,
      },
      ar: {
        id: "acc-ar",
        code: "1.1.6",
        name: "AR",
        currency: "IQD",
        isActive: true,
        isPosting: true,
      },
      inventory: {
        id: "acc-inv",
        code: "1.1.5",
        name: "Inventory",
        currency: "IQD",
        isActive: true,
        isPosting: true,
      },
      revenue: {
        id: "acc-rev",
        code: "4.1",
        name: "Revenue",
        currency: "IQD",
        isActive: true,
        isPosting: true,
      },
      cogs: {
        id: "acc-cogs",
        code: "5.1",
        name: "COGS",
        currency: "IQD",
        isActive: true,
        isPosting: true,
      },
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("POST requires sales.post permission", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(403);
    });

    it("rejects posting non-DRAFT invoice", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          ...mockInvoice,
          status: "POSTED",
          postedAt: new Date(),
        },
      );

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("تم ترحيلها مسبقاً");
    });

    it("CASH invoice posts successfully", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });

      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(mockInvoice),
          update: vi.fn().mockResolvedValue({
            ...mockInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: {
          update: vi.fn().mockResolvedValue({ id: "item1" }),
        },
        journalEntry: {
          create: vi.fn().mockResolvedValue({
            id: "je1",
            entryNumber: "JE-00001",
            lines: [],
          }),
          count: vi.fn().mockResolvedValue(0),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      if (res.status !== 200) {
        const debugJson = await res.json();
        console.log("DEBUG CASH POST:", res.status, debugJson);
      }
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("POSTED");
      expect(json.data.revenueJournalId).toBeTruthy();
    });

    it("insufficient stock rejected before transaction", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: false,
        available: 1,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("رصيد المخزون لا يكفي");
    });

    it("CREDIT invoice updates customer balance", async () => {
      const creditInvoice = {
        ...mockInvoice,
        paymentType: "CREDIT",
        paid: 0,
        remaining: 100,
      };

      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        creditInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(creditInvoice),
          update: vi.fn().mockResolvedValue({
            ...creditInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: {
          update: vi.fn().mockResolvedValue({ id: "item1" }),
        },
        journalEntry: {
          create: vi
            .fn()
            .mockImplementation(
              (args: { data: { lines?: { create: unknown[] } } }) => ({
                id: "je1",
                entryNumber: "JE-00001",
                lines: args.data.lines?.create || [],
              }),
            ),
          count: vi.fn().mockResolvedValue(0),
        },
        customer: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cus1",
            creditLimit: 0,
            currentBalance: 0,
          }),
          update: vi
            .fn()
            .mockResolvedValue({ id: "cus1", currentBalance: 100 }),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("POSTED");

      // Verify customer update was called with increment
      expect(mockTx.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cus1" },
          data: expect.objectContaining({
            currentBalance: { increment: 100 },
          }),
        }),
      );
    });

    it("MIXED invoice creates both cash and AR debits", async () => {
      const mixedInvoice = {
        ...mockInvoice,
        paymentType: "MIXED",
        paid: 30,
        remaining: 70,
      };

      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mixedInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      let capturedRevenueLines: unknown[] = [];

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: "al1" }),
        },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(mixedInvoice),
          update: vi.fn().mockResolvedValue({
            ...mixedInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: {
          update: vi.fn().mockResolvedValue({ id: "item1" }),
        },
        journalEntry: {
          create: vi
            .fn()
            .mockImplementation((args: { data: Record<string, unknown> }) => {
              const desc = (args.data.description as string) || "";
              const lines =
                (args.data.lines as { create: unknown[] } | undefined)
                  ?.create || [];
              if (desc.includes("إيراد")) {
                capturedRevenueLines = lines;
              }
              return {
                id: "je1",
                entryNumber: "JE-00001",
                lines,
              };
            }),
          count: vi.fn().mockResolvedValue(0),
        },
        customer: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cus1",
            creditLimit: 0,
            currentBalance: 0,
          }),
          update: vi.fn().mockResolvedValue({ id: "cus1", currentBalance: 70 }),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("POSTED");

      // Verify revenue journal has cash + AR + revenue lines
      const revenueLines = capturedRevenueLines as Array<
        Record<string, unknown>
      >;
      expect(revenueLines.length).toBe(3);
      const cashLine = revenueLines.find(
        (l: Record<string, unknown>) =>
          (l as { accountId: string }).accountId === "acc-cash",
      );
      const arLine = revenueLines.find(
        (l: Record<string, unknown>) =>
          (l as { accountId: string }).accountId === "acc-ar",
      );
      expect(cashLine).toBeTruthy();
      expect((cashLine as { debit: number }).debit).toBe(30);
      expect(arLine).toBeTruthy();
      expect((arLine as { debit: number }).debit).toBe(70);
    });

    it("revenue journal is balanced (debit = credit)", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      let capturedRevenueLines: Array<Record<string, unknown>> = [];

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(mockInvoice),
          update: vi.fn().mockResolvedValue({
            ...mockInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: { update: vi.fn().mockResolvedValue({ id: "item1" }) },
        journalEntry: {
          create: vi
            .fn()
            .mockImplementation((args: { data: Record<string, unknown> }) => {
              const desc = (args.data.description as string) || "";
              if (desc.includes("إيراد")) {
                capturedRevenueLines = ((
                  args.data.lines as { create: unknown[] } | undefined
                )?.create || []) as Array<Record<string, unknown>>;
              }
              return {
                id: "je1",
                entryNumber: "JE-00001",
                lines:
                  (args.data.lines as { create: unknown[] } | undefined)
                    ?.create || [],
              };
            }),
          count: vi.fn().mockResolvedValue(0),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(200);

      const totalDebit = capturedRevenueLines.reduce(
        (sum: number, l: Record<string, unknown>) =>
          sum + Number((l as { debit: number }).debit || 0),
        0,
      );
      const totalCredit = capturedRevenueLines.reduce(
        (sum: number, l: Record<string, unknown>) =>
          sum + Number((l as { credit: number }).credit || 0),
        0,
      );
      expect(totalDebit).toBe(100);
      expect(totalCredit).toBe(100);
      expect(totalDebit).toBe(totalCredit);
    });

    it("COGS journal is balanced (debit = credit)", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      let capturedCogsLines: Array<Record<string, unknown>> = [];

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(mockInvoice),
          update: vi.fn().mockResolvedValue({
            ...mockInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: { update: vi.fn().mockResolvedValue({ id: "item1" }) },
        journalEntry: {
          create: vi
            .fn()
            .mockImplementation((args: { data: Record<string, unknown> }) => {
              const desc = (args.data.description as string) || "";
              if (desc.includes("تكلفة")) {
                capturedCogsLines = ((
                  args.data.lines as { create: unknown[] } | undefined
                )?.create || []) as Array<Record<string, unknown>>;
              }
              return {
                id: "je2",
                entryNumber: "JE-00002",
                lines:
                  (args.data.lines as { create: unknown[] } | undefined)
                    ?.create || [],
              };
            }),
          count: vi.fn().mockResolvedValue(0),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(200);

      const totalDebit = capturedCogsLines.reduce(
        (sum: number, l: Record<string, unknown>) =>
          sum + Number((l as { debit: number }).debit || 0),
        0,
      );
      const totalCredit = capturedCogsLines.reduce(
        (sum: number, l: Record<string, unknown>) =>
          sum + Number((l as { credit: number }).credit || 0),
        0,
      );
      expect(totalDebit).toBe(60); // 2 qty * 30 avgCost
      expect(totalCredit).toBe(60);
      expect(totalDebit).toBe(totalCredit);
    });

    it("double posting is rejected", async () => {
      const alreadyPostedInvoice = {
        ...mockInvoice,
        status: "POSTED",
        postedAt: new Date(),
      };

      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        alreadyPostedInvoice,
      );

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("تم ترحيلها مسبقاً");
    });

    it("cost snapshot is captured correctly", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      let capturedCostSnapshot: number | null = null;

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(mockInvoice),
          update: vi.fn().mockResolvedValue({
            ...mockInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: {
          update: vi
            .fn()
            .mockImplementation(
              (args: { data: { averageCostSnapshot?: number } }) => {
                capturedCostSnapshot = args.data.averageCostSnapshot ?? null;
                return { id: "item1" };
              },
            ),
        },
        journalEntry: {
          create: vi.fn().mockResolvedValue({
            id: "je1",
            entryNumber: "JE-00001",
            lines: [],
          }),
          count: vi.fn().mockResolvedValue(0),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(200);
      expect(capturedCostSnapshot).toBe(30); // matches averageCost from stockBalance
    });

    it("rollback on journal creation failure", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(mockInvoice),
          update: vi.fn().mockResolvedValue({
            ...mockInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: { update: vi.fn().mockResolvedValue({ id: "item1" }) },
        journalEntry: {
          create: vi.fn().mockImplementation(() => {
            throw new Error("database connection lost");
          }),
          count: vi.fn().mockResolvedValue(0),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("database connection lost");
    });

    it("rejects posting without permission", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(401);
    });

    it("rejects posting without company access", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoice,
      );

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(403);
    });

    it("rejects posting when credit limit exceeded inside transaction", async () => {
      const creditInvoice = {
        ...mockInvoice,
        paymentType: "CREDIT",
        paid: 0,
        remaining: 100,
      };

      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        creditInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(creditInvoice),
          update: vi.fn().mockResolvedValue({
            ...creditInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: {
          update: vi.fn().mockResolvedValue({ id: "item1" }),
        },
        journalEntry: {
          create: vi.fn().mockResolvedValue({
            id: "je1",
            entryNumber: "JE-00001",
            lines: [],
          }),
          count: vi.fn().mockResolvedValue(0),
        },
        customer: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cus1",
            creditLimit: 50,
            currentBalance: 10,
          }),
          update: vi
            .fn()
            .mockResolvedValue({ id: "cus1", currentBalance: 110 }),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("تجاوز حد الائتمان");
    });

    it("rejects posting when invoice totals are inconsistent", async () => {
      const inconsistentInvoice = {
        ...mockInvoice,
        totalAfterTax: 100,
        paid: 60,
        remaining: 50, // 60 + 50 != 100
      };

      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        inconsistentInvoice,
      );
      (
        StockBalanceService.ensureSufficientStock as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        sufficient: true,
        available: 10,
      });
      (
        PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ allowed: true });
      (prisma.account.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockAccounts.cash)
        .mockResolvedValueOnce(mockAccounts.ar)
        .mockResolvedValueOnce(mockAccounts.inventory)
        .mockResolvedValueOnce(mockAccounts.revenue)
        .mockResolvedValueOnce(mockAccounts.cogs);

      const mockTx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
        invoice: {
          findUnique: vi.fn().mockResolvedValue(inconsistentInvoice),
          update: vi.fn().mockResolvedValue({
            ...inconsistentInvoice,
            status: "POSTED",
            postedAt: new Date(),
          }),
        },
        stockMovement: {
          create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
          update: vi.fn().mockResolvedValue({ id: "sm1" }),
        },
        stockBalance: {
          findUnique: vi.fn().mockResolvedValue({
            id: "sb1",
            quantityOnHand: 8,
            averageCost: 30,
            totalValue: 240,
          }),
        },
        invoiceItem: {
          update: vi.fn().mockResolvedValue({ id: "item1" }),
        },
        journalEntry: {
          create: vi.fn().mockResolvedValue({
            id: "je1",
            entryNumber: "JE-00001",
            lines: [],
          }),
          count: vi.fn().mockResolvedValue(0),
        },
      };

      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
          return callback(mockTx as unknown as typeof mockTx);
        },
      );

      (
        StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        success: true,
        balance: {
          id: "sb1",
          quantityOnHand: 8,
          averageCost: 30,
          totalValue: 240,
          reservedQuantity: 0,
        },
        movement: { id: "sm1", status: "POSTED" },
      });

      const { POST } = await import("@/app/api/sales-invoices/[id]/post/route");
      const req = new Request("http://localhost/api/sales-invoices/inv1/post", {
        method: "POST",
      });
      const res = await POST(req as never, {
        params: Promise.resolve({ id: "inv1" }),
      });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("عدم تناسق في حسابات الفاتورة");
    });
  });

  // Credit limit & discount tests for CREATE
  it("POST rejects CREDIT invoice when credit limit exceeded", async () => {
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
      creditLimit: 100,
      currentBalance: 80,
    });
    (prisma.warehouse.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wh1",
    });
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", name: "Product A", code: "PA001", prices: [] },
    ]);

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentType: "CREDIT",
        lines: [{ productId: "p1", quantity: 3, unitPrice: 50 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("تجاوز حد الائتمان");
  });

  it("POST allows CREDIT invoice when within credit limit", async () => {
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
      creditLimit: 500,
      currentBalance: 80,
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
        lines: [{ productId: "p1", quantity: 1, unitPrice: 50 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.remaining).toBe(50);
  });

  it("POST allows CREDIT invoice with unlimited credit limit (0)", async () => {
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
      creditLimit: 0,
      currentBalance: 999,
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
        lines: [{ productId: "p1", quantity: 5, unitPrice: 100 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
  });

  it("POST rejects when total discount exceeds subtotal", async () => {
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

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentType: "CASH",
        discountPercent: 100,
        discountAmount: 10,
        lines: [{ productId: "p1", quantity: 1, unitPrice: 10 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain(
      "إجمالي الخصم لا يمكن أن يتجاوز المجموع الفرعي",
    );
  });

  it("POST rejects when line discount exceeds line subtotal", async () => {
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

    const { POST } = await import("@/app/api/sales-invoices/route");
    const req = new Request("http://localhost/api/sales-invoices", {
      method: "POST",
      body: JSON.stringify({
        companyId: "c1",
        customerId: "cus1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentType: "CASH",
        lines: [
          { productId: "p1", quantity: 1, unitPrice: 10, discountAmount: 15 },
        ],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain(
      "خصم البند لا يمكن أن يتجاوز المجموع الفرعي للبند",
    );
  });

  // Credit limit tests for UPDATE
  it("PATCH rejects CREDIT invoice when credit limit exceeded", async () => {
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
      totalAfterTax: 100,
      paid: 0,
      remaining: 100,
      exchangeRateValue: 1,
      discountPercent: 0,
      discountAmount: 0,
      paymentType: "CREDIT",
      currency: "IQD",
      customerId: "cus1",
      items: [],
    });
    (prisma.customer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cus1",
      creditLimit: 100,
      currentBalance: 80,
    });
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cus1",
      creditLimit: 100,
      currentBalance: 80,
    });

    const { PATCH } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "PATCH",
      body: JSON.stringify({
        paymentType: "CREDIT",
        lines: [{ productId: "p1", quantity: 3, unitPrice: 50 }],
      }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("تجاوز حد الائتمان");
  });

  it("PATCH allows CREDIT invoice when within credit limit", async () => {
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
        paid: 0,
        remaining: 100,
        exchangeRateValue: 1,
        discountPercent: 0,
        discountAmount: 0,
        paymentType: "CREDIT",
        currency: "IQD",
        customerId: "cus1",
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
        paymentType: "CREDIT",
        totalBeforeTax: 50,
        taxAmount: 0,
        discountAmount: 0,
        discountPercent: 0,
        totalAfterTax: 50,
        totalInUsd: 0,
        paid: 0,
        remaining: 50,
        status: "DRAFT",
        notes: null,
        createdAt: new Date(),
        items: [],
      });
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "p1", name: "Product A", code: "PA001" },
    ]);
    (prisma.customer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cus1",
      creditLimit: 500,
      currentBalance: 80,
    });
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cus1",
      creditLimit: 500,
      currentBalance: 80,
    });
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
      paymentType: "CREDIT",
      totalBeforeTax: 50,
      taxAmount: 0,
      discountAmount: 0,
      discountPercent: 0,
      totalAfterTax: 50,
      totalInUsd: 0,
      paid: 0,
      remaining: 50,
      status: "DRAFT",
      notes: null,
      createdAt: new Date(),
      items: [],
    });

    const { PATCH } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "PATCH",
      body: JSON.stringify({
        lines: [{ productId: "p1", quantity: 1, unitPrice: 50 }],
      }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.remaining).toBe(50);
  });

  it("POST allows duplicate product IDs on separate lines", async () => {
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
        lines: [
          { productId: "p1", quantity: 1, unitPrice: 50 },
          { productId: "p1", quantity: 2, unitPrice: 50 },
        ],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.totalAfterTax).toBe(150);
  });

  it("POST MIXED payment defaults paid to 0 when not provided", async () => {
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
        paymentType: "MIXED",
        lines: [{ productId: "p1", quantity: 2, unitPrice: 50 }],
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.paid).toBe(0);
    expect(json.data.remaining).toBe(100);
    expect(Number.isNaN(json.data.paid)).toBe(false);
    expect(Number.isNaN(json.data.remaining)).toBe(false);
  });

  it("PATCH without lines recalculates totals when discountPercent changes", async () => {
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
        totalBeforeTax: 100,
        totalAfterTax: 90,
        paid: 90,
        remaining: 0,
        exchangeRateValue: 1,
        discountPercent: 10,
        discountAmount: 0,
        paymentType: "CASH",
        currency: "IQD",
        customerId: null,
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
        totalBeforeTax: 100,
        taxAmount: 0,
        discountAmount: 0,
        discountPercent: 20,
        totalAfterTax: 80,
        totalInUsd: 0,
        paid: 80,
        remaining: 0,
        status: "DRAFT",
        notes: null,
        createdAt: new Date(),
        items: [],
      });

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
      totalBeforeTax: 100,
      taxAmount: 0,
      discountAmount: 0,
      discountPercent: 20,
      totalAfterTax: 80,
      totalInUsd: 0,
      paid: 80,
      remaining: 0,
      status: "DRAFT",
      notes: null,
      createdAt: new Date(),
      items: [],
    });

    const { PATCH } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "PATCH",
      body: JSON.stringify({
        discountPercent: 20,
      }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.totalAfterTax).toBe(80);
    expect(json.data.paid).toBe(80);
    expect(json.data.remaining).toBe(0);
  });

  it("PATCH without lines recalculates totals when discountAmount changes", async () => {
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
        totalBeforeTax: 100,
        totalAfterTax: 100,
        paid: 0,
        remaining: 100,
        exchangeRateValue: 1,
        discountPercent: 0,
        discountAmount: 0,
        paymentType: "CREDIT",
        currency: "IQD",
        customerId: "cus1",
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
        paymentType: "CREDIT",
        totalBeforeTax: 100,
        taxAmount: 0,
        discountAmount: 15,
        discountPercent: 0,
        totalAfterTax: 85,
        totalInUsd: 0,
        paid: 0,
        remaining: 85,
        status: "DRAFT",
        notes: null,
        createdAt: new Date(),
        items: [],
      });
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cus1",
      creditLimit: 500,
      currentBalance: 0,
    });

    (prisma.invoice.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "inv1",
      companyId: "c1",
      invoiceNumber: "INV-001",
      invoiceDate: new Date(),
      customer: null,
      warehouse: null,
      currency: "IQD",
      exchangeRateValue: 0,
      paymentType: "CREDIT",
      totalBeforeTax: 100,
      taxAmount: 0,
      discountAmount: 15,
      discountPercent: 0,
      totalAfterTax: 85,
      totalInUsd: 0,
      paid: 0,
      remaining: 85,
      status: "DRAFT",
      notes: null,
      createdAt: new Date(),
      items: [],
    });

    const { PATCH } = await import("@/app/api/sales-invoices/[id]/route");
    const req = new Request("http://localhost/api/sales-invoices/inv1", {
      method: "PATCH",
      body: JSON.stringify({
        discountAmount: 15,
      }),
    });
    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: "inv1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.totalAfterTax).toBe(85);
    expect(json.data.remaining).toBe(85);
  });

  // Print tests
  describe("print", () => {
    const mockInvoiceForPrint = {
      id: "inv1",
      companyId: "c1",
      invoiceNumber: "INV-001",
      invoiceDate: new Date("2025-01-15"),
      customerId: "cus1",
      customer: { name: "عميل أ", code: "C001" },
      warehouseId: "wh1",
      warehouse: { name: "مخزن رئيسي", code: "WH01" },
      currency: "IQD",
      exchangeRateValue: 1,
      paymentType: "CREDIT",
      totalBeforeTax: 200,
      taxAmount: 0,
      discountAmount: 10,
      discountPercent: 0,
      totalAfterTax: 190,
      totalInUsd: 0,
      paid: 50,
      remaining: 140,
      status: "POSTED",
      notes: "ملاحظة تجريبية",
      company: { name: "شركة اختبار", code: "COMP01", taxId: "123456789" },
      items: [
        {
          id: "item1",
          productId: "p1",
          product: { name: "منتج 1", code: "P001" },
          productNameSnapshot: "منتج 1",
          productCodeSnapshot: "P001",
          quantity: 2,
          unitPrice: 100,
          discountPercent: 0,
          discountAmount: 0,
          totalPrice: 200,
          lineTotal: 200,
          notes: null,
        },
      ],
    };

    it("GET print requires auth", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { GET } = await import("@/app/api/sales-invoices/[id]/print/route");
      const res = await GET(
        new Request("http://localhost/api/sales-invoices/inv1/print") as never,
        { params: Promise.resolve({ id: "inv1" }) },
      );
      expect(res.status).toBe(401);
    });

    it("GET print requires sales.view permission", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );
      const { GET } = await import("@/app/api/sales-invoices/[id]/print/route");
      const res = await GET(
        new Request("http://localhost/api/sales-invoices/inv1/print") as never,
        { params: Promise.resolve({ id: "inv1" }) },
      );
      expect(res.status).toBe(403);
    });

    it("GET print enforces company isolation", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoiceForPrint,
      );
      const { GET } = await import("@/app/api/sales-invoices/[id]/print/route");
      const res = await GET(
        new Request("http://localhost/api/sales-invoices/inv1/print") as never,
        { params: Promise.resolve({ id: "inv1" }) },
      );
      expect(res.status).toBe(403);
    });

    it("GET print returns HTML with invoiceNumber and totals", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoiceForPrint,
      );
      const { GET } = await import("@/app/api/sales-invoices/[id]/print/route");
      const res = await GET(
        new Request("http://localhost/api/sales-invoices/inv1/print") as never,
        { params: Promise.resolve({ id: "inv1" }) },
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      const text = await res.text();
      expect(text).toContain("INV-001");
      expect(text).toContain("١٩٠٫٠٠");
      expect(text).toContain("عميل أ");
      expect(text).toContain("شركة اختبار");
    });

    it("GET print with format=json returns JSON payload", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockInvoiceForPrint,
      );
      const { GET } = await import("@/app/api/sales-invoices/[id]/print/route");
      const res = await GET(
        new Request(
          "http://localhost/api/sales-invoices/inv1/print?format=json",
        ) as never,
        { params: Promise.resolve({ id: "inv1" }) },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.invoiceNumber).toBe("INV-001");
      expect(json.data.totalAfterTax).toBe(190);
    });

    it("GET print escapes unsafe text", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          ...mockInvoiceForPrint,
          notes: "<script>alert('xss')</script>",
          customer: { name: "<b>عميل</b>", code: "C001" },
        },
      );
      const { GET } = await import("@/app/api/sales-invoices/[id]/print/route");
      const res = await GET(
        new Request("http://localhost/api/sales-invoices/inv1/print") as never,
        { params: Promise.resolve({ id: "inv1" }) },
      );
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("&lt;script&gt;");
      expect(text).not.toContain("<script>");
      expect(text).toContain("&lt;b&gt;عميل&lt;/b&gt;");
    });

    it("GET print returns 404 for missing invoice", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
        email: "test@test.com",
        name: "Test",
        roles: ["user"],
        permissions: [],
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      const { GET } = await import("@/app/api/sales-invoices/[id]/print/route");
      const res = await GET(
        new Request(
          "http://localhost/api/sales-invoices/inv-missing/print",
        ) as never,
        { params: Promise.resolve({ id: "inv-missing" }) },
      );
      expect(res.status).toBe(404);
    });
  });
});
