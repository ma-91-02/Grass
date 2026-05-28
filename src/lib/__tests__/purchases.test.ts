import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canAccessCompany,
  requireDbPermission,
  logAudit,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    purchaseInvoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    purchaseInvoiceItem: { deleteMany: vi.fn(), createMany: vi.fn() },
    purchaseExpense: { deleteMany: vi.fn(), createMany: vi.fn() },
    supplier: { findUnique: vi.fn(), findFirst: vi.fn() },
    warehouse: { findUnique: vi.fn(), findFirst: vi.fn() },
    product: { findMany: vi.fn() },
    paymentAccount: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    stockMovement: { create: vi.fn() },
    stockBalance: { findUnique: vi.fn() },
    journalEntry: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    account: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    role: { findMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  canAccessCompany: vi.fn(),
  requireDbPermission: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/api-response", () => ({
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status }),
  errorResponse: (message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: message }), { status }),
  unauthorizedError: (message = "Unauthorized") =>
    new Response(JSON.stringify({ success: false, error: message }), { status: 401 }),
  forbiddenError: (message = "Forbidden") =>
    new Response(JSON.stringify({ success: false, error: message }), { status: 403 }),
  notFoundError: (message = "Not found") =>
    new Response(JSON.stringify({ success: false, error: message }), { status: 404 }),
}));

vi.mock("@/lib/services/period-guard", () => ({
  PeriodGuard: { checkPeriodOpen: vi.fn().mockResolvedValue({ allowed: true }) },
}));

vi.mock("@/lib/services/stock-balance-service", () => ({
  StockBalanceService: {
    applyPostedMovement: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/lib/services/ledger-validator", () => ({
  LedgerValidator: {
    resolvePostingAccounts: vi.fn(),
    validateAndCreateJournal: vi.fn(),
    validateLines: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  },
}));

const mockUser = {
  id: "u1",
  userId: "u1",
  email: "admin@test.com",
  name: "Admin",
  roles: ["مدير النظام"],
  permissions: [],
  companyId: "c1",
  isSystemOwner: true,
};

const mockItem = {
  id: "item1",
  purchaseInvoiceId: "pi1",
  productId: "p1",
  productName: "Product A",
  productCode: "PA001",
  quantity: 10,
  purchasePrice: 100,
  totalPrice: 1000,
  productionDate: null,
  expiryDate: null,
  expenseShare: 0,
  finalCost: 1000,
  unitFinalCost: 100,
  warehouseId: "wh1",
  stockMovementId: null,
};

const mockExpense = {
  id: "exp1",
  purchaseInvoiceId: "pi1",
  name: "Shipping",
  amount: 50,
  currency: "IQD",
  amountInInvoiceCurrency: 50,
};

const mockPurchaseInvoice = {
  id: "pi1",
  invoiceNumber: "PI-000001",
  companyId: "c1",
  supplierInvoiceNumber: "SUP-001",
  purchaseDate: new Date("2026-05-01"),
  currency: "IQD",
  exchangeRateValue: 0,
  supplierId: "sup1",
  supplier: { id: "sup1", name: "Supplier A", isActive: true },
  warehouseId: "wh1",
  warehouse: { id: "wh1", name: "Main", isActive: true, branchId: null },
  notes: null,
  subtotal: 1000,
  totalExpenses: 0,
  totalCost: 1000,
  paymentMethod: "CREDIT",
  paid: 0,
  remaining: 1000,
  paymentAccountId: null,
  paymentAccount: null,
  status: "DRAFT",
  postedAt: null,
  postedById: null,
  journalEntryId: null,
  createdById: "u1",
  createdBy: { id: "u1", name: "Admin" },
  createdAt: new Date("2026-05-01"),
  items: [mockItem],
  expenses: [],
};

const mockAccounts = {
  inventory: { id: "acc-inv", code: "1.1.5", name: "Inventory", currency: "IQD", isActive: true, isPosting: true },
  ap: { id: "acc-ap", code: "2.1.1", name: "AP IQD", currency: "IQD", isActive: true, isPosting: true },
  cash: { id: "acc-cash", code: "1.1.1", name: "Cash IQD", currency: "IQD", isActive: true, isPosting: true },
};

describe("purchases route", () => {
  function setupTx() {
    const txObj = {
      purchaseInvoice: {
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      purchaseInvoiceItem: { deleteMany: vi.fn(), createMany: vi.fn() },
      purchaseExpense: { deleteMany: vi.fn(), createMany: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (cb: (txi: unknown) => unknown) => cb(txObj),
    );
    return txObj;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ companyId: "c1" });
  });

  describe("GET list", () => {
    it("requires auth", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { GET } = await import("@/app/api/purchases/route");
      const req = new Request("http://localhost/api/purchases");
      const res = await GET(req as never);
      expect(res.status).toBe(401);
    });

    it("requires purchases.view permission", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const { GET } = await import("@/app/api/purchases/route");
      const req = new Request("http://localhost/api/purchases");
      const res = await GET(req as never);
      expect(res.status).toBe(403);
    });

    it("returns list of purchases", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockPurchaseInvoice]);

      const { GET } = await import("@/app/api/purchases/route");
      const req = new Request("http://localhost/api/purchases");
      const res = await GET(req as never);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  describe("POST create", () => {
    it("requires auth", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { POST } = await import("@/app/api/purchases/route");
      const req = new Request("http://localhost/api/purchases", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req as never);
      expect(res.status).toBe(401);
    });

    it("requires purchases.create permission", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const { POST } = await import("@/app/api/purchases/route");
      const req = new Request("http://localhost/api/purchases", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req as never);
      expect(res.status).toBe(403);
    });

    it("creates DRAFT purchase invoice", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.supplier.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPurchaseInvoice.supplier);
      (prisma.warehouse.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPurchaseInvoice.warehouse);
      (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "p1", name: "Product A", code: "PA001", isActive: true }]);
      (prisma.purchaseInvoice.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: Record<string, unknown>) => unknown) => cb({
          purchaseInvoice: {
            create: vi.fn().mockResolvedValue(mockPurchaseInvoice),
          },
          purchaseExpense: {
            createMany: vi.fn(),
          },
          purchaseInvoiceItem: {
            createMany: vi.fn(),
          },
          auditLog: { create: vi.fn() },
        }),
      );

      const { POST } = await import("@/app/api/purchases/route");
      const body = {
        supplierId: "sup1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentMethod: "CREDIT",
        purchaseDate: "2026-05-01",
        items: [{
          productId: "p1",
          productName: "Product A",
          productCode: "PA001",
          quantity: 10,
          purchasePrice: 100,
          totalPrice: 1000,
        }],
      };
      const req = new Request("http://localhost/api/purchases", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const res = await POST(req as never);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.status).toBe("DRAFT");
    });
  });

  describe("GET detail", () => {
    it("requires auth", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { GET } = await import("@/app/api/purchases/[id]/route");
      const req = new Request("http://localhost/api/purchases/pi1");
      const res = await GET(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(401);
    });

    it("returns purchase invoice with items", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPurchaseInvoice);

      const { GET } = await import("@/app/api/purchases/[id]/route");
      const req = new Request("http://localhost/api/purchases/pi1");
      const res = await GET(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe("pi1");
    });

    it("returns 404 for missing invoice", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { GET } = await import("@/app/api/purchases/[id]/route");
      const req = new Request("http://localhost/api/purchases/nonexistent");
      const res = await GET(req as never, { params: Promise.resolve({ id: "nonexistent" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH update", () => {
    it("requires purchases.edit permission", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const { PATCH } = await import("@/app/api/purchases/[id]/route");
      const req = new Request("http://localhost/api/purchases/pi1", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(403);
    });

    it("rejects updating non-DRAFT invoice (returns 403)", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockPurchaseInvoice,
        status: "POSTED",
      });

      const { PATCH } = await import("@/app/api/purchases/[id]/route");
      const req = new Request("http://localhost/api/purchases/pi1", {
        method: "PATCH",
        body: JSON.stringify({ notes: "updated" }),
      });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(403);
    });

    it("updates DRAFT invoice", async () => {
      const tx = setupTx();
      tx.purchaseInvoice.update.mockResolvedValue({ ...mockPurchaseInvoice, notes: "updated notes" });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPurchaseInvoice);
      (prisma.purchaseInvoice.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockPurchaseInvoice,
        notes: "updated notes",
      });

      const { PATCH } = await import("@/app/api/purchases/[id]/route");
      const body = {
        supplierId: "sup1",
        warehouseId: "wh1",
        currency: "IQD",
        paymentMethod: "CASH",
        paid: 1000,
        paymentAccountId: "pa1",
        notes: "updated notes",
        items: [{
          productId: "p1",
          productName: "Product A",
          productCode: "PA001",
          quantity: 10,
          purchasePrice: 100,
          totalPrice: 1000,
        }],
      };
      const req = new Request("http://localhost/api/purchases/pi1", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const res = await PATCH(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE", () => {
    it("requires purchases.delete permission", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const { DELETE } = await import("@/app/api/purchases/[id]/route");
      const req = new Request("http://localhost/api/purchases/pi1", { method: "DELETE" });
      const res = await DELETE(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(403);
    });

    it("rejects deleting non-DRAFT invoice (returns 403)", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockPurchaseInvoice,
        status: "POSTED",
      });

      const { DELETE } = await import("@/app/api/purchases/[id]/route");
      const req = new Request("http://localhost/api/purchases/pi1", { method: "DELETE" });
      const res = await DELETE(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(403);
    });

    it("deletes DRAFT invoice", async () => {
      const tx = setupTx();
      tx.purchaseInvoice.delete.mockResolvedValue(mockPurchaseInvoice);
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPurchaseInvoice);
      (prisma.purchaseInvoice.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockPurchaseInvoice);

      const { DELETE } = await import("@/app/api/purchases/[id]/route");
      const req = new Request("http://localhost/api/purchases/pi1", { method: "DELETE" });
      const res = await DELETE(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(200);
    });
  });

  describe("posting", () => {
    const mockTx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      auditLog: { create: vi.fn().mockResolvedValue({ id: "al1" }) },
      purchaseInvoice: {
        findUnique: vi.fn().mockResolvedValue(mockPurchaseInvoice),
        update: vi.fn().mockResolvedValue({
          ...mockPurchaseInvoice,
          status: "POSTED",
          postedAt: new Date(),
          postedById: "u1",
          journalEntryId: "je1",
        }),
      },
      purchaseInvoiceItem: { update: vi.fn().mockResolvedValue({}) },
      stockMovement: {
        create: vi.fn().mockResolvedValue({ id: "sm1" }),
      },
      stockBalance: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "sb1" }),
      },
      journalEntry: {
        create: vi.fn().mockResolvedValue({ id: "je1", entryNumber: "JE-001" }),
        count: vi.fn().mockResolvedValue(0),
      },
      paymentAccount: { findUnique: vi.fn(), update: vi.fn() },
      account: { findFirst: vi.fn() },
      product: { update: vi.fn() },
    };

    beforeEach(async () => {
      vi.clearAllMocks();
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx as never),
      );
      // Re-import mocked modules to re-apply implementations that clearAllMocks resets
      const pGuard = await import("@/lib/services/period-guard");
      (pGuard.PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true });
      const sbs = await import("@/lib/services/stock-balance-service");
      (sbs.StockBalanceService.applyPostedMovement as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      const lv = await import("@/lib/services/ledger-validator");
      (lv.LedgerValidator.validateLines as ReturnType<typeof vi.fn>).mockReturnValue({ valid: true, errors: [] });
    });

    it("POST requires purchases.post permission", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const { POST } = await import("@/app/api/purchases/[id]/post/route");
      const req = new Request("http://localhost/api/purchases/pi1/post", { method: "POST" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(403);
    });

    it("rejects posting non-DRAFT invoice", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockPurchaseInvoice,
        status: "POSTED",
      });
      const { POST } = await import("@/app/api/purchases/[id]/post/route");
      const req = new Request("http://localhost/api/purchases/pi1/post", { method: "POST" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(403);
    });

    it("posts CREDIT purchase successfully", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPurchaseInvoice);
      mockTx.purchaseInvoice.findUnique.mockResolvedValue(mockPurchaseInvoice);
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ where: { code } }: { where: { code: string } }) => {
          if (code === "1.1.5") return mockAccounts.inventory;
          if (code === "2.1.1") return mockAccounts.ap;
          return null;
        },
      );

      const { POST } = await import("@/app/api/purchases/[id]/post/route");
      const req = new Request("http://localhost/api/purchases/pi1/post", { method: "POST" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(200);
    });

    it("posts CASH purchase successfully", async () => {
      const cashInvoice = { ...mockPurchaseInvoice, paymentMethod: "CASH", paymentAccountId: "pa1", paid: 1000, remaining: 0 };
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(cashInvoice);
      mockTx.purchaseInvoice.findUnique.mockResolvedValue(cashInvoice);
      (prisma.account.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
        async ({ where: { code } }: { where: { code: string } }) => {
          if (code === "1.1.5") return mockAccounts.inventory;
          if (code === "1.1.1") return mockAccounts.cash;
          if (code === "2.1.1") return mockAccounts.ap;
          return null;
        },
      );
      (prisma.paymentAccount.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        { id: "pa1", name: "Cash IQD", companyId: "c1", currency: "IQD", isActive: true },
      );

      const { POST } = await import("@/app/api/purchases/[id]/post/route");
      const req = new Request("http://localhost/api/purchases/pi1/post", { method: "POST" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(200);
    });

    it("rejects double posting", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockPurchaseInvoice,
        status: "POSTED",
        postedAt: new Date(),
      });
      const { POST } = await import("@/app/api/purchases/[id]/post/route");
      const req = new Request("http://localhost/api/purchases/pi1/post", { method: "POST" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(403);
    });

    it("rejects posting without company access", async () => {
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (prisma.purchaseInvoice.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPurchaseInvoice);
      const { POST } = await import("@/app/api/purchases/[id]/post/route");
      const req = new Request("http://localhost/api/purchases/pi1/post", { method: "POST" });
      const res = await POST(req as never, { params: Promise.resolve({ id: "pi1" }) });
      expect(res.status).toBe(403);
    });
  });
});
