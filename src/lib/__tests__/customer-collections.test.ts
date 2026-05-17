import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";
import { LedgerValidator } from "@/lib/services/ledger-validator";
import { PeriodGuard } from "@/lib/services/period-guard";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customerCollection: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    paymentAccount: {
      findUnique: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
    journalEntry: {
      create: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
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

vi.mock("@/lib/services/ledger-validator", () => ({
  LedgerValidator: {
    validateLines: vi.fn(),
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
  notFoundError: (message = "Not found") =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status: 404,
    }),
  conflictError: (message: string) =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status: 409,
    }),
}));

const mockCustomer = {
  id: "cus1",
  companyId: "c1",
  name: "عميل تجريبي",
  code: "C001",
  isActive: true,
  currentBalance: 100,
  creditLimit: 500,
  currency: "IQD",
};

const mockInvoice = {
  id: "inv1",
  companyId: "c1",
  invoiceNumber: "INV-0001",
  customerId: "cus1",
  status: "POSTED",
  totalAfterTax: 100,
  paid: 0,
  remaining: 100,
  currency: "IQD",
  paymentType: "CREDIT",
  invoiceDate: new Date(),
};

const mockAccounts = {
  cash: { id: "acc-cash", code: "1.1.1", name: "Cash IQD" },
  ar: { id: "acc-ar", code: "1.1.6", name: "AR IQD" },
};

const mockPaymentAccount = {
  id: "pa1",
  name: "صندوق",
  type: "CASH",
  currency: "IQD",
  isActive: true,
};

describe("customer-collections route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GET list tests
  it("GET list requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("GET list requires collections.view permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections");
    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("GET list returns collections", async () => {
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
      prisma.customerCollection.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        id: "col1",
        customerId: "cus1",
        customer: { id: "cus1", name: "عميل", code: "C001" },
        invoiceId: "inv1",
        invoice: { id: "inv1", invoiceNumber: "INV-1", remaining: 50 },
        paymentAccountId: "pa1",
        paymentAccount: { id: "pa1", name: "صندوق" },
        amount: 50,
        currency: "IQD",
        collectionDate: new Date(),
        notes: null,
        createdAt: new Date(),
      },
    ]);
    (
      prisma.customerCollection.count as ReturnType<typeof vi.fn>
    ).mockResolvedValue(1);

    const { GET } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections");
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.data).toHaveLength(1);
    expect(json.data.data[0].amount).toBe(50);
  });

  // POST tests
  it("POST requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("POST requires collections.create permission", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it("POST rejects missing customer", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({ customerId: "bad", amount: 50 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(404);
  });

  it("POST rejects inactive customer", async () => {
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
      ...mockCustomer,
      isActive: false,
    });

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({ customerId: "cus1", amount: 50 }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("غير نشط");
  });

  it("POST rejects currency mismatch with invoice", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCustomer,
    );
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockInvoice,
      currency: "USD",
    });

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({
        customerId: "cus1",
        invoiceId: "inv1",
        amount: 50,
        currency: "IQD",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("عملة");
  });

  it("POST rejects overpayment on invoice", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCustomer,
    );
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockInvoice,
    );

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({
        customerId: "cus1",
        invoiceId: "inv1",
        amount: 150,
        currency: "IQD",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("يتجاوز");
  });

  it("POST creates collection with invoice and updates balances", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCustomer,
    );
    (prisma.invoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockInvoice,
    );
    (
      prisma.paymentAccount.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockPaymentAccount);
    (PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue(
      { allowed: true },
    );
    (prisma.account.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockAccounts.cash)
      .mockResolvedValueOnce(mockAccounts.ar);
    (LedgerValidator.validateLines as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        valid: true,
        errors: [],
      },
    );

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
      customer: {
        findUnique: vi.fn().mockResolvedValue(mockCustomer),
        update: vi
          .fn()
          .mockResolvedValue({ ...mockCustomer, currentBalance: 50 }),
      },
      invoice: {
        findUnique: vi.fn().mockResolvedValue(mockInvoice),
        update: vi
          .fn()
          .mockResolvedValue({ ...mockInvoice, paid: 50, remaining: 50 }),
      },
      journalEntry: {
        create: vi.fn().mockResolvedValue({
          id: "je1",
          entryNumber: "JE-00001",
          lines: [],
        }),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn().mockResolvedValue({ id: "je1" }),
      },
      customerCollection: {
        create: vi.fn().mockResolvedValue({
          id: "col1",
          customerId: "cus1",
          invoiceId: "inv1",
          amount: 50,
          currency: "IQD",
          collectionDate: new Date(),
          journalEntryId: "je1",
          notes: "test",
          createdAt: new Date(),
        }),
      },
    };

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
        return callback(mockTx as unknown as typeof mockTx);
      },
    );

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({
        customerId: "cus1",
        invoiceId: "inv1",
        paymentAccountId: "pa1",
        amount: 50,
        currency: "IQD",
        notes: "test",
      }),
    });
    const res = await POST(req as never);
    if (res.status !== 200) {
      const debugJson = await res.json();
      console.log("DEBUG POST COLLECTION:", res.status, debugJson);
    }
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.amount).toBe(50);
    expect(json.data.invoiceRemaining).toBe(50);
  });

  it("POST creates collection without invoice (on-account)", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCustomer,
    );
    (PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue(
      { allowed: true },
    );
    (prisma.account.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockAccounts.cash)
      .mockResolvedValueOnce(mockAccounts.ar);
    (LedgerValidator.validateLines as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        valid: true,
        errors: [],
      },
    );

    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
      customer: {
        findUnique: vi.fn().mockResolvedValue(mockCustomer),
        update: vi
          .fn()
          .mockResolvedValue({ ...mockCustomer, currentBalance: 50 }),
      },
      invoice: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      journalEntry: {
        create: vi.fn().mockResolvedValue({
          id: "je1",
          entryNumber: "JE-00001",
          lines: [],
        }),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn().mockResolvedValue({ id: "je1" }),
      },
      customerCollection: {
        create: vi.fn().mockResolvedValue({
          id: "col1",
          customerId: "cus1",
          invoiceId: null,
          amount: 50,
          currency: "IQD",
          collectionDate: new Date(),
          journalEntryId: "je1",
          notes: "on-account",
          createdAt: new Date(),
        }),
      },
    };

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
        return callback(mockTx as unknown as typeof mockTx);
      },
    );

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({
        customerId: "cus1",
        amount: 50,
        currency: "IQD",
        notes: "on-account",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.amount).toBe(50);
    expect(json.data.invoiceRemaining).toBeNull();
  });

  it("POST rejects payment account with mismatched currency", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@test.com",
      name: "Test",
      roles: ["user"],
      permissions: [],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.customer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockCustomer,
    );
    (
      prisma.paymentAccount.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      ...mockPaymentAccount,
      currency: "USD",
    });

    const { POST } = await import("@/app/api/customer-collections/route");
    const req = new Request("http://localhost/api/customer-collections", {
      method: "POST",
      body: JSON.stringify({
        customerId: "cus1",
        paymentAccountId: "pa1",
        amount: 50,
        currency: "IQD",
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("عملة");
  });
});

describe("customers/[id]/receivables route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET receivables requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import("@/app/api/customers/[id]/receivables/route");
    const req = new Request("http://localhost/api/customers/cus1/receivables");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "cus1" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET receivables returns posted invoices with remaining > 0", async () => {
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
      ...mockCustomer,
      company: { id: "c1", name: "شركة" },
      invoices: [
        {
          id: "inv1",
          invoiceNumber: "INV-1",
          invoiceDate: new Date(),
          totalAfterTax: 100,
          paid: 20,
          remaining: 80,
          currency: "IQD",
          paymentType: "CREDIT",
        },
      ],
    });

    const { GET } = await import("@/app/api/customers/[id]/receivables/route");
    const req = new Request("http://localhost/api/customers/cus1/receivables");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "cus1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.invoices).toHaveLength(1);
    expect(json.data.summary.totalReceivable).toBe(80);
  });
});

describe("customers/[id]/statement route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET statement requires auth", async () => {
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import("@/app/api/customers/[id]/statement/route");
    const req = new Request("http://localhost/api/customers/cus1/statement");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "cus1" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET statement returns invoices and collections merged", async () => {
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
      ...mockCustomer,
      company: { id: "c1", name: "شركة" },
    });
    (prisma.invoice.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "inv1",
        invoiceNumber: "INV-1",
        invoiceDate: new Date("2025-01-01"),
        totalAfterTax: 100,
        paid: 0,
        remaining: 100,
        currency: "IQD",
        paymentType: "CREDIT",
      },
    ]);
    (
      prisma.customerCollection.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        id: "col1",
        amount: 30,
        currency: "IQD",
        collectionDate: new Date("2025-01-15"),
        invoiceId: "inv1",
        notes: "partial",
      },
    ]);

    const { GET } = await import("@/app/api/customers/[id]/statement/route");
    const req = new Request("http://localhost/api/customers/cus1/statement");
    const res = await GET(req as never, {
      params: Promise.resolve({ id: "cus1" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.transactions).toHaveLength(2);
    expect(json.data.summary.endingBalance).toBe(70);
  });
});
