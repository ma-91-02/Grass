import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessCompany,
  requireDbPermission,
  getCurrentUser,
} from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
    invoice: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  requireDbPermission: vi.fn(),
  canAccessCompany: vi.fn(),
}));

vi.mock("@/lib/api-response", () => ({
  successResponse: (data: unknown) =>
    new Response(JSON.stringify({ success: true, data }), { status: 200 }),
  errorResponse: (message: string, status: number) =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status,
    }),
  unauthorizedError: () =>
    new Response(JSON.stringify({ success: false, error: "غير مصرح" }), {
      status: 401,
    }),
  forbiddenError: () =>
    new Response(JSON.stringify({ success: false, error: "محظور" }), {
      status: 403,
    }),
}));

describe("reports route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("P&L report", () => {
    it("returns 401 if not authenticated", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { GET } = await import("@/app/api/reports/profit-loss/route");
      const req = new Request("http://localhost/api/reports/profit-loss") as never;
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 if no REPORTS_VIEW permission", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );
      const { GET } = await import("@/app/api/reports/profit-loss/route");
      const req = new Request("http://localhost/api/reports/profit-loss") as never;
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("returns success with empty data when no journal lines exist", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        companyId: null,
      });
      (
        prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      const { GET } = await import("@/app/api/reports/profit-loss/route");
      const req = new Request("http://localhost/api/reports/profit-loss") as never;
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.totals.totalRevenue).toBe(0);
      expect(json.data.totals.totalExpenses).toBe(0);
      expect(json.data.totals.netProfit).toBe(0);
    });

    it("aggregates revenue and expense correctly", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        companyId: null,
      });
      (
        prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        {
          accountId: "rev1",
          accountCode: "4.1",
          accountName: "إيراد المبيعات",
          accountType: "INCOME",
          totalDebit: 0,
          totalCredit: 1000,
          netBalance: 1000,
        },
        {
          accountId: "exp1",
          accountCode: "5.1",
          accountName: "تكلفة البضاعة",
          accountType: "EXPENSE",
          totalDebit: 600,
          totalCredit: 0,
          netBalance: -600,
        },
      ]);

      const { GET } = await import("@/app/api/reports/profit-loss/route");
      const req = new Request("http://localhost/api/reports/profit-loss") as never;
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.totals.totalRevenue).toBe(1000);
      expect(json.data.totals.totalExpenses).toBe(-600);
      expect(json.data.totals.netProfit).toBe(1600);
    });
  });

  describe("Trial Balance report", () => {
    it("returns 401 if not authenticated", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { GET } = await import("@/app/api/reports/trial-balance/route");
      const req = new Request("http://localhost/api/reports/trial-balance") as never;
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 if no REPORTS_VIEW permission", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );
      const { GET } = await import("@/app/api/reports/trial-balance/route");
      const req = new Request("http://localhost/api/reports/trial-balance") as never;
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  describe("AR Aging report", () => {
    it("returns 401 if not authenticated", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const { GET } = await import("@/app/api/reports/ar-aging/route");
      const req = new Request("http://localhost/api/reports/ar-aging") as never;
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 if no REPORTS_VIEW permission", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );
      const { GET } = await import("@/app/api/reports/ar-aging/route");
      const req = new Request("http://localhost/api/reports/ar-aging") as never;
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("returns empty aging when no invoices exist", async () => {
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        companyId: null,
      });
      (
        prisma.invoice.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      const { GET } = await import("@/app/api/reports/ar-aging/route");
      const req = new Request("http://localhost/api/reports/ar-aging") as never;
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.totalInvoices).toBe(0);
      expect(json.data.grandTotal).toBe(0);
    });

    it("categorizes invoices into correct aging buckets", async () => {
      const now = new Date();
      const daysAgo = (d: number) =>
        new Date(now.getTime() - d * 86400000).toISOString();

      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: "u1",
      });
      (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );
      (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        companyId: null,
      });
      (
        prisma.invoice.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        {
          id: "inv1",
          invoiceNumber: "INV-001",
          invoiceDate: daysAgo(5),
          totalAfterTax: 100,
          paid: 0,
          remaining: 100,
          currency: "IQD",
          customer: { id: "c1", name: "عميل 1" },
        },
        {
          id: "inv2",
          invoiceNumber: "INV-002",
          invoiceDate: daysAgo(45),
          totalAfterTax: 200,
          paid: 0,
          remaining: 200,
          currency: "IQD",
          customer: { id: "c2", name: "عميل 2" },
        },
        {
          id: "inv3",
          invoiceNumber: "INV-003",
          invoiceDate: daysAgo(95),
          totalAfterTax: 300,
          paid: 0,
          remaining: 300,
          currency: "IQD",
          customer: { id: "c3", name: "عميل 3" },
        },
      ]);

      const { GET } = await import("@/app/api/reports/ar-aging/route");
      const req = new Request("http://localhost/api/reports/ar-aging") as never;
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.totalInvoices).toBe(3);
      expect(json.data.buckets.current.total).toBe(100);
      expect(json.data.buckets.overdue30.total).toBe(200);
      expect(json.data.buckets.overdue90.total).toBe(300);
    });
  });
});
