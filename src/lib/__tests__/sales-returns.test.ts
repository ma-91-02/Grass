import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";
import { StockBalanceService } from "@/lib/services/stock-balance-service";
import { PeriodGuard } from "@/lib/services/period-guard";
import { LedgerValidator } from "@/lib/services/ledger-validator";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    salesReturn: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salesReturnLine: {
      createMany: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    invoiceItem: {
      findMany: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      update: vi.fn(),
    },
    stockBalance: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
    journalEntry: {
      create: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
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
    applyPostedMovement: vi.fn(),
  },
}));

vi.mock("@/lib/services/period-guard", () => ({
  PeriodGuard: {
    checkPeriodOpen: vi.fn(),
  },
}));

vi.mock("@/lib/services/ledger-validator", () => ({
  LedgerValidator: {
    validateLines: vi.fn(),
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

const mockInvoice = {
  id: "inv1",
  companyId: "c1",
  invoiceNumber: "INV-0001",
  customerId: "cus1",
  warehouseId: "wh1",
  status: "POSTED",
  totalAfterTax: 100,
  paid: 0,
  remaining: 100,
  currency: "IQD",
  paymentType: "CREDIT",
  invoiceDate: new Date(),
  items: [
    {
      id: "ii1",
      productId: "prod1",
      quantity: 10,
      unitPrice: 10,
      averageCostSnapshot: 6,
      lineTotal: 100,
    },
  ],
};

const mockCustomer = {
  id: "cus1",
  companyId: "c1",
  name: "عميل تجريبي",
  code: "C001",
  isActive: true,
  currentBalance: 100,
  currency: "IQD",
};

const mockWarehouse = {
  id: "wh1",
  name: "مخزن رئيسي",
  isActive: true,
};

const mockAccounts = {
  ar: {
    id: "acc-ar",
    code: "1.1.6",
    name: "AR IQD",
    isActive: true,
    isPosting: true,
    currency: "IQD",
  },
  inventory: {
    id: "acc-inv",
    code: "1.1.5",
    name: "Inventory",
    isActive: true,
    isPosting: true,
    currency: "IQD",
  },
  revenue: {
    id: "acc-rev",
    code: "4.1",
    name: "Revenue",
    isActive: true,
    isPosting: true,
    currency: "IQD",
  },
  cogs: {
    id: "acc-cogs",
    code: "5.1",
    name: "COGS",
    isActive: true,
    isPosting: true,
    currency: "IQD",
  },
};

describe("sales-returns route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GET list
  it("GET list requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { GET } = await import("@/app/api/sales-returns/route");
    const res = await GET(
      new Request("http://localhost/api/sales-returns") as never,
    );
    expect(res.status).toBe(401);
  });

  it("GET list requires salesReturns.view permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const { GET } = await import("@/app/api/sales-returns/route");
    const res = await GET(
      new Request("http://localhost/api/sales-returns") as never,
    );
    expect(res.status).toBe(403);
  });

  it("GET list returns returns", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.salesReturn.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      [
        {
          id: "ret1",
          returnNumber: "RET-00001",
          companyId: "c1",
          originalInvoiceId: "inv1",
          originalInvoice: {
            id: "inv1",
            invoiceNumber: "INV-1",
            status: "POSTED",
          },
          customer: { id: "cus1", name: "عميل", code: "C001" },
          warehouse: { id: "wh1", name: "مخزن" },
          returnDate: new Date(),
          currency: "IQD",
          totalAmount: 50,
          totalCogs: 30,
          status: "DRAFT",
          notes: null,
          createdAt: new Date(),
          lines: [],
        },
      ],
    );
    (prisma.salesReturn.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const { GET } = await import("@/app/api/sales-returns/route");
    const res = await GET(
      new Request("http://localhost/api/sales-returns?companyId=c1") as never,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.data).toHaveLength(1);
    expect(json.data.data[0].returnNumber).toBe("RET-00001");
  });

  // POST create DRAFT
  it("POST create requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { POST } = await import("@/app/api/sales-returns/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never,
    );
    expect(res.status).toBe(401);
  });

  it("POST create requires salesReturns.create permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const { POST } = await import("@/app/api/sales-returns/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns", {
        method: "POST",
        body: JSON.stringify({}),
      }) as never,
    );
    expect(res.status).toBe(403);
  });

  it("POST create rejects non-POSTED original invoice", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockInvoice,
      status: "DRAFT",
    });

    const { POST } = await import("@/app/api/sales-returns/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns", {
        method: "POST",
        body: JSON.stringify({
          companyId: "c1",
          originalInvoiceId: "inv1",
          currency: "IQD",
          lines: [
            { originalInvoiceItemId: "ii1", productId: "prod1", quantity: 5 },
          ],
        }),
      }) as never,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("مرحلة");
  });

  it("POST create rejects return quantity exceeding sold", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
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
      prisma.salesReturnLine.groupBy as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);

    const { POST } = await import("@/app/api/sales-returns/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns", {
        method: "POST",
        body: JSON.stringify({
          companyId: "c1",
          originalInvoiceId: "inv1",
          currency: "IQD",
          lines: [
            { originalInvoiceItemId: "ii1", productId: "prod1", quantity: 15 },
          ],
        }),
      }) as never,
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("تتجاوز");
  });

  it("POST create DRAFT with valid data", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
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
      prisma.salesReturnLine.groupBy as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);
    (prisma.salesReturn.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.salesReturn.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ret1",
      returnNumber: "RET-00001",
      companyId: "c1",
      originalInvoiceId: "inv1",
      customerId: "cus1",
      warehouseId: "wh1",
      returnDate: new Date(),
      currency: "IQD",
      totalAmount: 50,
      totalCogs: 30,
      status: "DRAFT",
      notes: null,
      createdById: "u1",
      createdAt: new Date(),
      lines: [
        {
          id: "rl1",
          productId: "prod1",
          quantity: 5,
          unitPriceSnapshot: 10,
          averageCostSnapshot: 6,
          lineTotal: 50,
          product: { id: "prod1", name: "منتج" },
        },
      ],
    });
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "al1",
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) => {
        return callback(prisma as unknown as typeof prisma);
      },
    );

    const { POST } = await import("@/app/api/sales-returns/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns", {
        method: "POST",
        body: JSON.stringify({
          companyId: "c1",
          originalInvoiceId: "inv1",
          currency: "IQD",
          lines: [
            { originalInvoiceItemId: "ii1", productId: "prod1", quantity: 5 },
          ],
        }),
      }) as never,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("DRAFT");
    expect(json.data.totalAmount).toBe(50);
    expect(json.data.lines).toHaveLength(1);
  });
});

describe("sales-returns [id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET detail requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { GET } = await import("@/app/api/sales-returns/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/sales-returns/ret1") as never,
      {
        params: Promise.resolve({ id: "ret1" }),
      },
    );
    expect(res.status).toBe(401);
  });

  it("GET detail returns return", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.salesReturn.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "ret1",
      returnNumber: "RET-00001",
      companyId: "c1",
      originalInvoiceId: "inv1",
      originalInvoice: {
        id: "inv1",
        invoiceNumber: "INV-1",
        status: "POSTED",
        totalAfterTax: 100,
      },
      customerId: "cus1",
      customer: { id: "cus1", name: "عميل", code: "C001" },
      warehouseId: "wh1",
      warehouse: { id: "wh1", name: "مخزن" },
      returnDate: new Date(),
      currency: "IQD",
      totalAmount: 50,
      totalCogs: 30,
      status: "DRAFT",
      postedAt: null,
      postedById: null,
      journalEntryId: null,
      cogsJournalEntryId: null,
      notes: null,
      createdAt: new Date(),
      lines: [],
    });

    const { GET } = await import("@/app/api/sales-returns/[id]/route");
    const res = await GET(
      new Request("http://localhost/api/sales-returns/ret1") as never,
      {
        params: Promise.resolve({ id: "ret1" }),
      },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.returnNumber).toBe("RET-00001");
  });
});

describe("sales-returns [id]/post route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReturnDraft = {
    id: "ret1",
    companyId: "c1",
    returnNumber: "RET-00001",
    originalInvoiceId: "inv1",
    originalInvoice: mockInvoice,
    customerId: "cus1",
    customer: mockCustomer,
    warehouseId: "wh1",
    warehouse: mockWarehouse,
    returnDate: new Date(),
    currency: "IQD",
    totalAmount: 50,
    totalCogs: 30,
    status: "DRAFT",
    postedAt: null,
    postedById: null,
    journalEntryId: null,
    cogsJournalEntryId: null,
    notes: null,
    lines: [
      {
        id: "rl1",
        originalInvoiceItemId: "ii1",
        productId: "prod1",
        quantity: 5,
        unitPriceSnapshot: 10,
        averageCostSnapshot: 6,
        lineTotal: 50,
        stockMovementId: null,
        notes: null,
      },
    ],
  };

  it("POST requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { POST } = await import("@/app/api/sales-returns/[id]/post/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns/ret1/post", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "ret1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("POST requires salesReturns.post permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const { POST } = await import("@/app/api/sales-returns/[id]/post/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns/ret1/post", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "ret1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("POST rejects already posted return", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.salesReturn.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      ...mockReturnDraft,
      status: "POSTED",
      postedAt: new Date(),
    });

    const { POST } = await import("@/app/api/sales-returns/[id]/post/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns/ret1/post", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "ret1" }) },
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("ترحيل");
  });

  it("POST successfully posts return with inventory and journals", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.salesReturn.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockReturnDraft);
    (PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue(
      { allowed: true },
    );
    (prisma.account.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockAccounts.ar)
      .mockResolvedValueOnce(mockAccounts.inventory)
      .mockResolvedValueOnce(mockAccounts.revenue)
      .mockResolvedValueOnce(mockAccounts.cogs);

    (LedgerValidator.validateLines as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        valid: true,
        errors: [],
      },
    );

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
      salesReturn: {
        findUnique: vi.fn().mockResolvedValue(mockReturnDraft),
        update: vi.fn().mockResolvedValue({
          ...mockReturnDraft,
          status: "POSTED",
          postedAt: new Date(),
        }),
      },
      invoice: {
        findMany: vi.fn().mockResolvedValue(mockInvoice.items),
        update: vi
          .fn()
          .mockResolvedValue({ ...mockInvoice, status: "RETURNED_PARTIAL" }),
      },
      invoiceItem: {
        findMany: vi.fn().mockResolvedValue(mockInvoice.items),
      },
      salesReturnLine: {
        groupBy: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: "rl1" }),
      },
      stockMovement: {
        create: vi.fn().mockResolvedValue({ id: "sm1", status: "DRAFT" }),
        update: vi.fn().mockResolvedValue({ id: "sm1" }),
      },
      stockBalance: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sb1",
          quantityOnHand: 20,
          averageCost: 6,
          totalValue: 120,
        }),
        upsert: vi.fn().mockResolvedValue({
          id: "sb1",
          quantityOnHand: 25,
          averageCost: 6,
          totalValue: 150,
        }),
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
        findUnique: vi.fn().mockResolvedValue(mockCustomer),
        update: vi
          .fn()
          .mockResolvedValue({ ...mockCustomer, currentBalance: 50 }),
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
        quantityOnHand: 25,
        reservedQuantity: 0,
        averageCost: 6,
        totalValue: 150,
      },
      movement: { id: "sm1", status: "POSTED" },
    });

    const { POST } = await import("@/app/api/sales-returns/[id]/post/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns/ret1/post", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "ret1" }) },
    );

    if (res.status !== 200) {
      const debugJson = await res.json();
      console.log("DEBUG POST RETURN:", res.status, debugJson);
    }

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("POSTED");
    expect(json.data.revenueJournalId).toBeTruthy();
    expect(json.data.cogsJournalId).toBeTruthy();
    expect(json.data.stockMovementIds).toHaveLength(1);
  });

  it("POST rejects return exceeding customer balance", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.salesReturn.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      ...mockReturnDraft,
      customer: { ...mockCustomer, currentBalance: 30 },
      totalAmount: 50,
    });
    (PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue(
      { allowed: true },
    );
    (prisma.account.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockAccounts.ar)
      .mockResolvedValueOnce(mockAccounts.inventory)
      .mockResolvedValueOnce(mockAccounts.revenue)
      .mockResolvedValueOnce(mockAccounts.cogs);

    const { POST } = await import("@/app/api/sales-returns/[id]/post/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns/ret1/post", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "ret1" }) },
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("يتجاوز رصيد العميل");
  });

  it("POST rejects inactive AR account", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.salesReturn.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockReturnDraft);
    (PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue(
      { allowed: true },
    );
    (prisma.account.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ...mockAccounts.ar, isActive: false })
      .mockResolvedValueOnce(mockAccounts.inventory)
      .mockResolvedValueOnce(mockAccounts.revenue)
      .mockResolvedValueOnce(mockAccounts.cogs);

    const { POST } = await import("@/app/api/sales-returns/[id]/post/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns/ret1/post", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "ret1" }) },
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("غير نشط");
  });

  it("POST allows return when customer has negative balance (credit)", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.salesReturn.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      ...mockReturnDraft,
      customer: { ...mockCustomer, currentBalance: -50 },
    });
    (PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue(
      { allowed: true },
    );
    (prisma.account.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockAccounts.ar)
      .mockResolvedValueOnce(mockAccounts.inventory)
      .mockResolvedValueOnce(mockAccounts.revenue)
      .mockResolvedValueOnce(mockAccounts.cogs);

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
      salesReturn: {
        findUnique: vi.fn().mockResolvedValue({
          ...mockReturnDraft,
          customer: { ...mockCustomer, currentBalance: -50 },
        }),
        update: vi.fn().mockResolvedValue({
          ...mockReturnDraft,
          status: "POSTED",
          postedAt: new Date(),
        }),
      },
      invoice: {
        findMany: vi.fn().mockResolvedValue(mockInvoice.items),
        update: vi
          .fn()
          .mockResolvedValue({ ...mockInvoice, status: "RETURNED_PARTIAL" }),
      },
      salesReturnLine: {
        groupBy: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ id: "rl1" }),
      },
      invoiceItem: {
        findMany: vi.fn().mockResolvedValue(mockInvoice.items),
      },
      stockMovement: {
        create: vi.fn().mockResolvedValue({ id: "sm1", status: "POSTED" }),
        update: vi.fn().mockResolvedValue({ id: "sm1" }),
      },
      stockBalance: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sb1",
          quantityOnHand: 10,
          averageCost: 30,
          totalValue: 300,
        }),
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
        findUnique: vi
          .fn()
          .mockResolvedValue({ ...mockCustomer, currentBalance: -50 }),
        update: vi.fn().mockResolvedValue({ id: "cus1", currentBalance: -100 }),
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
        quantityOnHand: 10,
        averageCost: 30,
        totalValue: 300,
        reservedQuantity: 0,
      },
      movement: { id: "sm1", status: "POSTED" },
    });

    const { POST } = await import("@/app/api/sales-returns/[id]/post/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns/ret1/post", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "ret1" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("POSTED");
  });

  it("POST updates invoice status to RETURNED_PARTIAL after return posted", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "t@t.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (
      prisma.salesReturn.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockReturnDraft);
    (PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue(
      { allowed: true },
    );
    (prisma.account.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockAccounts.ar)
      .mockResolvedValueOnce(mockAccounts.inventory)
      .mockResolvedValueOnce(mockAccounts.revenue)
      .mockResolvedValueOnce(mockAccounts.cogs);

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
      salesReturn: {
        findUnique: vi.fn().mockResolvedValue(mockReturnDraft),
        update: vi.fn().mockResolvedValue({
          ...mockReturnDraft,
          status: "POSTED",
          postedAt: new Date(),
        }),
      },
      invoice: {
        findMany: vi.fn().mockResolvedValue(mockInvoice.items),
        update: vi
          .fn()
          .mockResolvedValue({ ...mockInvoice, status: "RETURNED_PARTIAL" }),
      },
      salesReturnLine: {
        groupBy: vi
          .fn()
          .mockResolvedValue([
            { originalInvoiceItemId: "ii1", _sum: { quantity: 5 } },
          ]),
        update: vi.fn().mockResolvedValue({ id: "rl1" }),
      },
      invoiceItem: {
        findMany: vi.fn().mockResolvedValue(mockInvoice.items),
      },
      stockMovement: {
        create: vi.fn().mockResolvedValue({ id: "sm1", status: "POSTED" }),
        update: vi.fn().mockResolvedValue({ id: "sm1" }),
      },
      stockBalance: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sb1",
          quantityOnHand: 10,
          averageCost: 30,
          totalValue: 300,
        }),
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
        findUnique: vi.fn().mockResolvedValue(mockCustomer),
        update: vi.fn().mockResolvedValue({ id: "cus1", currentBalance: 30 }),
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
        quantityOnHand: 10,
        averageCost: 30,
        totalValue: 300,
        reservedQuantity: 0,
      },
      movement: { id: "sm1", status: "POSTED" },
    });

    const { POST } = await import("@/app/api/sales-returns/[id]/post/route");
    const res = await POST(
      new Request("http://localhost/api/sales-returns/ret1/post", {
        method: "POST",
      }) as never,
      { params: Promise.resolve({ id: "ret1" }) },
    );
    expect(res.status).toBe(200);

    // Verify invoice update was called with RETURNED_PARTIAL
    expect(mockTx.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockInvoice.id },
        data: { status: "RETURNED_PARTIAL" },
      }),
    );
  });
});
