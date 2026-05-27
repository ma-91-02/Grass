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

function mockReverseTransaction(options?: {
  create?: ReturnType<typeof vi.fn>;
  auditCreate?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}) {
  const reversed = {
    ...postedJournal,
    id: "je-2",
    entryNumber: "JE-00002",
    status: "POSTED",
    postedAt: new Date("2026-05-28T00:00:00.000Z"),
  };
  const tx = {
    journalEntry: {
      create: options?.create || vi.fn().mockResolvedValue(reversed),
      update:
        options?.update ||
        vi.fn().mockResolvedValue({ ...postedJournal, status: "REVERSED" }),
    },
    auditLog: {
      create: options?.auditCreate || vi.fn().mockResolvedValue({}),
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

  it("creates a posted balanced reversal journal, then marks the original reversed in one transaction", async () => {
    const tx = mockReverseTransaction();

    const { POST } =
      await import("@/app/api/journal-entries/[id]/reverse/route");
    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "je-1" }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.status).toBe("POSTED");

    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "REVERSE",
          sourceId: "je-1",
          status: "POSTED",
          postedAt: expect.any(Date),
          lines: {
            create: [
              expect.objectContaining({
                accountId: "cash",
                debit: 0,
                credit: 100,
              }),
              expect.objectContaining({
                accountId: "capital",
                debit: 100,
                credit: 0,
              }),
            ],
          },
        }),
      }),
    );

    const createArgs = tx.journalEntry.create.mock.calls[0][0];
    const lines = createArgs.data.lines.create;
    const totalDebit = lines.reduce(
      (sum: number, line: { debit: number }) => sum + line.debit,
      0,
    );
    const totalCredit = lines.reduce(
      (sum: number, line: { credit: number }) => sum + line.credit,
      0,
    );
    expect(totalDebit).toBe(totalCredit);

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
        details: expect.objectContaining({
          originalJournalEntryId: "je-1",
          reversalJournalEntryId: "je-2",
          reversalStatus: "POSTED",
          totalDebit: 100,
          totalCredit: 100,
        }),
      }),
    });

    expect(tx.auditLog.create.mock.invocationCallOrder[0]).toBeLessThan(
      tx.journalEntry.update.mock.invocationCallOrder[0],
    );
  });

  it("does not report success when reversal audit fails", async () => {
    const tx = mockReverseTransaction({
      auditCreate: vi.fn().mockRejectedValue(new Error("audit failed")),
    });

    const { POST } =
      await import("@/app/api/journal-entries/[id]/reverse/route");
    await expect(
      POST(new Request("http://localhost") as never, {
        params: Promise.resolve({ id: "je-1" }),
      }),
    ).rejects.toThrow("audit failed");

    expect(tx.journalEntry.update).not.toHaveBeenCalled();
  });

  it("does not mark the original reversed when reversal creation fails", async () => {
    const tx = mockReverseTransaction({
      create: vi.fn().mockRejectedValue(new Error("create failed")),
    });

    const { POST } =
      await import("@/app/api/journal-entries/[id]/reverse/route");
    await expect(
      POST(new Request("http://localhost") as never, {
        params: Promise.resolve({ id: "je-1" }),
      }),
    ).rejects.toThrow("create failed");

    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.journalEntry.update).not.toHaveBeenCalled();
  });
});
