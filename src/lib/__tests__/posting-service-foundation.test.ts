import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PostingService } from "@/lib/services/posting-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    postingOperation: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    journalEntry: {
      findUnique: vi.fn(),
    },
    fiscalPeriod: {
      findFirst: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const draftJournal = {
  id: "je-1",
  companyId: "company-1",
  branchId: "branch-1",
  entryNumber: "JE-00001",
  entryDate: new Date("2026-05-28"),
  currency: "IQD",
  status: "DRAFT",
  lines: [
    { accountId: "cash", debit: 100, credit: 0, description: null },
    { accountId: "capital", debit: 0, credit: 100, description: null },
  ],
};

const accounts = [
  {
    id: "cash",
    name: "الصندوق",
    companyId: "company-1",
    currency: "IQD",
    isActive: true,
    isPosting: true,
    allowManualJournal: true,
  },
  {
    id: "capital",
    name: "رأس المال",
    companyId: "company-1",
    currency: "IQD",
    isActive: true,
    isPosting: true,
    allowManualJournal: true,
  },
];

function mockPostingTransaction(auditCreate = vi.fn().mockResolvedValue({})) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    journalEntry: {
      findUnique: vi.fn().mockResolvedValue(draftJournal),
      update: vi.fn().mockResolvedValue({ ...draftJournal, status: "POSTED" }),
    },
    account: {
      findMany: vi.fn().mockResolvedValue(accounts),
    },
    postingOperation: {
      update: vi.fn().mockResolvedValue({}),
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

describe("PostingService foundation audit transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      prisma.postingOperation.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);
    (
      prisma.journalEntry.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue(draftJournal);
    (
      prisma.fiscalPeriod.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "fp-1",
      name: "2026",
      status: "OPEN",
    });
    (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      accounts,
    );
    (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (
      prisma.postingOperation.upsert as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
  });

  it("writes journal posting audit through the transaction client", async () => {
    const tx = mockPostingTransaction();

    const result = await PostingService.postJournal({
      journalEntryId: "je-1",
      userId: "user-1",
      idempotencyKey: "JE_POST_je-1",
    });

    expect(result.success).toBe(true);
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "POST",
        entity: "JournalEntry",
        entityId: "je-1",
      }),
    });
  });

  it("rolls back posting result when audit write fails", async () => {
    mockPostingTransaction(
      vi.fn().mockRejectedValue(new Error("audit failed")),
    );

    const result = await PostingService.postJournal({
      journalEntryId: "je-1",
      userId: "user-1",
      idempotencyKey: "JE_POST_je-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("audit failed");
    expect(prisma.postingOperation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: "FAILED_ROLLED_BACK",
          error: "audit failed",
        }),
      }),
    );
  });
});
