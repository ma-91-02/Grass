import { prisma } from "@/lib/prisma";
import { LedgerValidator } from "./ledger-validator";
import { PeriodGuard } from "./period-guard";
import { CurrencyGuard } from "./currency-guard";
import { logAudit } from "@/lib/auth";

export interface PostJournalInput {
  journalEntryId: string;
  userId: string;
  idempotencyKey: string;
}

export interface PostJournalResult {
  success: boolean;
  error?: string;
  journalEntryId?: string;
  operationId?: string;
}

const TERMINAL_STATUSES = [
  "COMMITTED",
  "FAILED_VALIDATION",
  "FAILED_ROLLED_BACK",
] as const;

export class PostingService {
  static async postJournal(
    input: PostJournalInput,
  ): Promise<PostJournalResult> {
    // 1. Check idempotency — only COMMITTED is final
    const existingOp = await prisma.postingOperation.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existingOp) {
      if (existingOp.status === "COMMITTED") {
        return {
          success: true,
          journalEntryId: existingOp.journalEntryId || undefined,
          operationId: existingOp.id,
        };
      }
      // Allow retry for failed operations
      if (
        existingOp.status === "FAILED_VALIDATION" ||
        existingOp.status === "FAILED_ROLLED_BACK"
      ) {
        // Proceed to retry — re-run all validations
      } else {
        // REQUESTED, LOCK_ACQUIRED, VALIDATING, BUILDING_JOURNAL, PERSISTING
        return {
          success: false,
          error: "العملية قيد التنفيذ",
        };
      }
    }

    // 2. Load journal entry with lines
    const journalEntry = await prisma.journalEntry.findUnique({
      where: { id: input.journalEntryId },
      include: { lines: true },
    });

    if (!journalEntry) {
      return { success: false, error: "القيد غير موجود" };
    }

    if (journalEntry.status !== "DRAFT") {
      return {
        success: false,
        error:
          journalEntry.status === "POSTED"
            ? "القيد تم ترحيله مسبقاً"
            : "القيد ملغي أو معكوس",
      };
    }

    // 3. Validate lines
    const lineInputs = journalEntry.lines.map((l) => ({
      accountId: l.accountId,
      debit: Number(l.debit),
      credit: Number(l.credit),
      description: l.description || undefined,
    }));

    const validation = LedgerValidator.validateLines(lineInputs);
    if (!validation.valid) {
      await PostingService.recordOperation(
        input,
        journalEntry.id,
        "FAILED_VALIDATION",
        validation.errors.join("; "),
      );
      return { success: false, error: validation.errors.join(" | ") };
    }

    // 4. Check fiscal period is open
    const periodCheck = await PeriodGuard.checkPeriodOpen(
      journalEntry.companyId,
      journalEntry.entryDate,
      journalEntry.branchId || undefined,
    );
    if (!periodCheck.allowed) {
      await PostingService.recordOperation(
        input,
        journalEntry.id,
        "FAILED_VALIDATION",
        periodCheck.error!,
      );
      return { success: false, error: periodCheck.error };
    }

    // 5. Load and validate all accounts
    const accountIds = [...new Set(journalEntry.lines.map((l) => l.accountId))];
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    for (const line of journalEntry.lines) {
      const account = accountMap.get(line.accountId);
      if (!account) {
        await PostingService.recordOperation(
          input,
          journalEntry.id,
          "FAILED_VALIDATION",
          "أحد الحسابات غير موجود",
        );
        return { success: false, error: "أحد الحسابات غير موجود" };
      }
      if (!account.isActive) {
        await PostingService.recordOperation(
          input,
          journalEntry.id,
          "FAILED_VALIDATION",
          `الحساب "${account.name}" غير نشط`,
        );
        return {
          success: false,
          error: `الحساب "${account.name}" غير نشط`,
        };
      }
      if (!account.isPosting) {
        await PostingService.recordOperation(
          input,
          journalEntry.id,
          "FAILED_VALIDATION",
          `الحساب "${account.name}" غير قابل للترحيل`,
        );
        return {
          success: false,
          error: `الحساب "${account.name}" غير قابل للترحيل`,
        };
      }
      if (account.companyId !== journalEntry.companyId) {
        await PostingService.recordOperation(
          input,
          journalEntry.id,
          "FAILED_VALIDATION",
          `الحساب "${account.name}" لا ينتمي لنفس الشركة`,
        );
        return {
          success: false,
          error: `الحساب "${account.name}" لا ينتمي لنفس الشركة`,
        };
      }
      // Posting account must not be a parent account
      const childCount = await prisma.account.count({
        where: { parentId: account.id },
      });
      if (childCount > 0) {
        await PostingService.recordOperation(
          input,
          journalEntry.id,
          "FAILED_VALIDATION",
          `الحساب "${account.name}" هو حساب أب وليس قابل للترحيل`,
        );
        return {
          success: false,
          error: `الحساب "${account.name}" هو حساب أب وليس قابل للترحيل`,
        };
      }
    }

    // 6. Validate currency isolation
    const accountCurrencyMap = new Map(accounts.map((a) => [a.id, a.currency]));
    const currencyCheck = CurrencyGuard.validateJournalCurrency(
      journalEntry.currency,
      lineInputs,
      accountCurrencyMap,
    );
    if (!currencyCheck.allowed) {
      await PostingService.recordOperation(
        input,
        journalEntry.id,
        "FAILED_VALIDATION",
        currencyCheck.errors.join("; "),
      );
      return { success: false, error: currencyCheck.errors.join(" | ") };
    }

    // 7. Record operation as REQUESTED
    await PostingService.recordOperation(input, journalEntry.id, "REQUESTED");

    // 8. Execute posting inside transaction with row locking
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Acquire row-level lock on the journal entry
        await tx.$queryRaw`SELECT id FROM "JournalEntry" WHERE id = ${journalEntry.id} FOR UPDATE`;

        // Re-read with lock held
        const lockedEntry = await tx.journalEntry.findUnique({
          where: { id: journalEntry.id },
          include: { lines: true },
        });

        if (!lockedEntry || lockedEntry.status !== "DRAFT") {
          throw new Error("القيد تم تعديله قبل الترحيل");
        }

        // Re-validate accounts inside transaction (guard against concurrent changes)
        const txAccountIds = [
          ...new Set(lockedEntry.lines.map((l) => l.accountId)),
        ];
        const txAccounts = await tx.account.findMany({
          where: { id: { in: txAccountIds } },
        });
        for (const txAccount of txAccounts) {
          if (!txAccount.isActive) {
            throw new Error(
              `الحساب "${txAccount.name}" أصبح غير نشط قبل الترحيل`,
            );
          }
          if (!txAccount.isPosting) {
            throw new Error(`الحساب "${txAccount.name}" أصبح غير قابل للترحيل`);
          }
        }

        // Update journal entry status
        const updated = await tx.journalEntry.update({
          where: { id: journalEntry.id },
          data: {
            status: "POSTED",
            postedAt: new Date(),
          },
        });

        // Update posting operation using unique key
        await tx.postingOperation.update({
          where: { idempotencyKey: input.idempotencyKey },
          data: {
            status: "COMMITTED",
            journalEntryId: journalEntry.id,
            completedAt: new Date(),
          },
        });

        // Write audit inside transaction (per AI_GLOBAL_RULES.md: audit failure must fail the transaction)
        await logAudit(input.userId, "POST", "JournalEntry", journalEntry.id, {
          entryNumber: journalEntry.entryNumber,
          lines: lockedEntry.lines.length,
          totalDebit: validation.totalDebit,
          totalCredit: validation.totalCredit,
        });

        return updated;
      });

      return {
        success: true,
        journalEntryId: result.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "خطأ غير متوقع";
      // Best-effort operation recording — transaction already rolled back
      try {
        await PostingService.recordOperation(
          input,
          journalEntry.id,
          "FAILED_ROLLED_BACK",
          errorMessage,
        );
      } catch {
        // Ignore — original error is the primary failure
      }
      return { success: false, error: errorMessage };
    }
  }

  private static async recordOperation(
    input: PostJournalInput,
    journalEntryId: string,
    status: string,
    error?: string,
  ) {
    const isTerminal = TERMINAL_STATUSES.includes(
      status as (typeof TERMINAL_STATUSES)[number],
    );
    await prisma.postingOperation.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      update: {
        status: status as never,
        error: error || null,
        completedAt: isTerminal ? new Date() : undefined,
      },
      create: {
        idempotencyKey: input.idempotencyKey,
        sourceType: "JOURNAL",
        sourceId: journalEntryId,
        journalEntryId,
        status: status as never,
        error: error || null,
        startedAt: new Date(),
        completedAt: isTerminal ? new Date() : undefined,
      },
    });
  }
}
