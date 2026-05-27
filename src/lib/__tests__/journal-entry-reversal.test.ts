import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import { PeriodGuard } from "@/lib/services/period-guard";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    journalEntry: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  requireDbPermission: vi.fn(),
  canAccessCompany: vi.fn(),
}));

vi.mock("@/lib/services/period-guard", () => ({
  PeriodGuard: {
    checkPeriodOpen: vi.fn(),
  },
}));

const postedJournal = {
  id: "je-1",
  companyId: "company-1",
  branchId: "branch-1",
  fiscalPeriodId: "fp-1",
  entryNumber: "JE-00001",
  currency: "IQD",
  exchangeRateSnapshot: 1,
  status: "POSTED",
  lines: [
    { accountId: "cash", debit: 100, credit: 0, description: "مدين" },
    { accountId: "capital", debit: 0, credit: 100, description: "دائن" },
  ],
};

function mockReverseTransaction(auditCreate = vi.fn().mockResolvedValue({})) {
  const reversed = {
    ...postedJournal,
    id: "je-2",
    entryNumber: "JE-00002",
    status: "DRAFT",
  };
  const tx = {
    journalEntry: {
      create: vi.fn().mockResolvedValue(reversed),
      update: vi
        .fn()
        .mockResolvedValue({ ...postedJournal, status: "REVERSED" }),
    },
    auditLog: {
      create: auditCreate,
    },
  };

  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (callback: (transactionClient: typeof tx) => Promise<unknown>) =>
      callback(tx),
  );

  return tx;
}

describe("journal entry reversal transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user-1",
      email: "test@grass.local",
      name: "Test",
      roles: ["محاسب"],
      permissions: ["journals.reverse"],
    });
    (requireDbPermission as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (PeriodGuard.checkPeriodOpen as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        allowed: true,
      },
    );
    (
      prisma.journalEntry.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(postedJournal);
    (prisma.journalEntry.count as ReturnType<typeof vi.fn>).mockResolvedValue(
      1,
    );
  });

  it("writes reversal journal, original status, and audit in one transaction", async () => {
    const tx = mockReverseTransaction();

    const { POST } =
      await import("@/app/api/journal-entries/[id]/reverse/route");
    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "je-1" }),
    });

    expect(response.status).toBe(201);
    expect(tx.journalEntry.create).toHaveBeenCalled();
    expect(tx.journalEntry.update).toHaveBeenCalledWith({
      where: { id: "je-1" },
      data: { status: "REVERSED" },
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "REVERSE",
        entity: "JournalEntry",
        entityId: "je-2",
      }),
    });
  });

  it("does not report success when reversal audit fails", async () => {
    mockReverseTransaction(
      vi.fn().mockRejectedValue(new Error("audit failed")),
    );

    const { POST } =
      await import("@/app/api/journal-entries/[id]/reverse/route");
    await expect(
      POST(new Request("http://localhost") as never, {
        params: Promise.resolve({ id: "je-1" }),
      }),
    ).rejects.toThrow("audit failed");
  });
});
