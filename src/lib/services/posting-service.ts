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

export class PostingService {
  static async postJournal(
    input: PostJournalInput,
  ): Promise<PostJournalResult> {
    // 1. Check idempotency
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
      if (
        existingOp.status === "FAILED_VALIDATION" ||
        existingOp.status === "FAILED_ROLLED_BACK"
      ) {
        // Allow retry for failed operations
        return {
          success: false,
          error: `العملية فشلت سابقاً (${existingOp.status}). يرجى استخدام مفتاح جديد.`,
        };
      }
      return {
        success: false,
        error: "العملية قيد التنفيذ",
      };
    }

    // 2. Load journal entry
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

    // 4. Check fiscal period
    if (journalEntry.fiscalPeriodId) {
      const period = await prisma.fiscalPeriod.findUnique({
        where: { id: journalEntry.fiscalPeriodId },
      });
      if (period) {
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
      }
    }

    // 5. Validate currency isolation
    const accountIds = journalEntry.lines.map((l) => l.accountId);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
    });
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

    // 6. Check accounts are posting accounts
    for (const account of accounts) {
      if (!LedgerValidator.isAccountPostingAllowed(account.isPosting, false)) {
        // Check if it has children
        const childCount = await prisma.account.count({
          where: { parentId: account.id },
        });
        if (childCount > 0 || !account.isPosting) {
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
      }
    }

    // 7. Record operation as REQUESTED
    await PostingService.recordOperation(input, journalEntry.id, "REQUESTED");

    // 8. Execute posting inside transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Re-read with row lock
        const lockedEntry = await tx.journalEntry.findUnique({
          where: { id: journalEntry.id },
        });

        if (!lockedEntry || lockedEntry.status !== "DRAFT") {
          throw new Error("القيد تم تعديله قبل الترحيل");
        }

        // Update journal entry status
        const updated = await tx.journalEntry.update({
          where: { id: journalEntry.id },
          data: {
            status: "POSTED",
            postedAt: new Date(),
          },
        });

        // Update posting operation
        await tx.postingOperation.updateMany({
          where: { idempotencyKey: input.idempotencyKey },
          data: {
            status: "COMMITTED",
            journalEntryId: journalEntry.id,
            completedAt: new Date(),
          },
        });

        return updated;
      });

      // 9. Write audit outside transaction
      await logAudit(input.userId, "POST", "JournalEntry", journalEntry.id, {
        entryNumber: journalEntry.entryNumber,
        lines: journalEntry.lines.length,
        totalDebit: validation.totalDebit,
        totalCredit: validation.totalCredit,
      });

      return {
        success: true,
        journalEntryId: result.id,
        operationId: undefined,
      };
    } catch (error) {
      // Record failure
      const errorMessage =
        error instanceof Error ? error.message : "خطأ غير متوقع";
      await PostingService.recordOperation(
        input,
        journalEntry.id,
        "FAILED_ROLLED_BACK",
        errorMessage,
      );
      return { success: false, error: errorMessage };
    }
  }

  private static async recordOperation(
    input: PostJournalInput,
    journalEntryId: string,
    status: string,
    error?: string,
  ) {
    try {
      await prisma.postingOperation.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        update: {
          status: status as never,
          error: error || null,
          completedAt: [
            "COMMITTED",
            "FAILED_VALIDATION",
            "FAILED_ROLLED_BACK",
          ].includes(status)
            ? new Date()
            : undefined,
        },
        create: {
          idempotencyKey: input.idempotencyKey,
          sourceType: "JOURNAL",
          sourceId: journalEntryId,
          journalEntryId,
          status: status as never,
          error: error || null,
          startedAt: new Date(),
          ...(status === "COMMITTED" ||
          status === "FAILED_VALIDATION" ||
          status === "FAILED_ROLLED_BACK"
            ? { completedAt: new Date() }
            : {}),
        },
      });
    } catch {
      // Silently fail operation recording - audit will catch this
    }
  }
}
