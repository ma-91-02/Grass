import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canAccessCompany,
  requireDbPermission,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  serverError,
} from "@/lib/api-response";
import { journalEntryFormSchema } from "@/lib/schemas";
import { LedgerValidator } from "@/lib/services/ledger-validator";
import { PeriodGuard } from "@/lib/services/period-guard";
import { CurrencyGuard } from "@/lib/services/currency-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.JOURNALS_CREATE)))
    return forbiddenError();

  const { id } = await params;

  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          account: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  });

  if (!entry) return notFoundError();

  if (!(await canAccessCompany(user, entry.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const data = {
    ...entry,
    lines: entry.lines.map((l) => ({
      ...l,
      accountName: l.account.name,
      accountCode: l.account.code,
      account: undefined,
    })),
  };

  return successResponse(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.JOURNALS_CREATE)))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!existing) return notFoundError();

  if (!(await canAccessCompany(user, existing.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (existing.status !== "DRAFT")
    return errorResponse("لا يمكن تعديل قيد غير مسودة");

  try {
    const body = await request.json();
    const parsed = journalEntryFormSchema.parse(body);

    // Cannot change company — lock to original
    if (parsed.companyId !== existing.companyId) {
      return forbiddenError("لا يمكن تغيير الشركة بعد إنشاء القيد");
    }

    const entryDate = parsed.entryDate
      ? new Date(parsed.entryDate)
      : existing.entryDate;

    // Normalize lines for validation (strip null from description)
    const linesForValidation = parsed.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      description: l.description ?? undefined,
    }));

    // 1. Validate line-level financial invariants
    const lineValidation = LedgerValidator.validateLines(linesForValidation);
    if (!lineValidation.valid) {
      return errorResponse(lineValidation.errors.join(" | "));
    }

    // 2. Load and validate all accounts
    const accountIds = [...new Set(parsed.lines.map((l) => l.accountId))];
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
    });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    for (const line of parsed.lines) {
      const account = accountMap.get(line.accountId);
      if (!account) return errorResponse("أحد الحسابات غير موجود");
      if (!account.isActive)
        return errorResponse(`الحساب "${account.name}" غير نشط`);
      if (!account.isPosting)
        return errorResponse(`الحساب "${account.name}" غير قابل للترحيل`);
      if (!account.allowManualJournal)
        return errorResponse(`الحساب "${account.name}" لا يسمح بالقيد اليدوي`);
      if (account.companyId !== parsed.companyId)
        return errorResponse(`الحساب "${account.name}" لا ينتمي لنفس الشركة`);
    }

    // 3. Validate currency isolation
    const accountCurrencyMap = new Map(accounts.map((a) => [a.id, a.currency]));
    const currencyCheck = CurrencyGuard.validateJournalCurrency(
      parsed.currency,
      linesForValidation,
      accountCurrencyMap,
    );
    if (!currencyCheck.allowed) {
      return errorResponse(currencyCheck.errors.join(" | "));
    }

    // 4. Validate fiscal period is open
    const periodCheck = await PeriodGuard.checkPeriodOpen(
      parsed.companyId,
      entryDate,
      parsed.branchId || undefined,
    );
    if (!periodCheck.allowed) {
      return errorResponse(periodCheck.error!);
    }

    // 5. Resolve or validate fiscal period
    let fiscalPeriodId = parsed.fiscalPeriodId || null;
    if (!fiscalPeriodId) {
      const period = await PeriodGuard.getOpenPeriod(
        parsed.companyId,
        entryDate,
        parsed.branchId || undefined,
      );
      if (period) fiscalPeriodId = period.id;
    }

    // 6. Update with audit in one transaction — preserve original entry number
    const journalEntry = await prisma.$transaction(async (tx) => {
      const updated = await tx.journalEntry.update({
        where: { id },
        data: {
          companyId: parsed.companyId,
          branchId: parsed.branchId || null,
          fiscalPeriodId,
          entryNumber: existing.entryNumber,
          entryDate,
          currency: parsed.currency,
          exchangeRateSnapshot: parsed.exchangeRateSnapshot,
          description: parsed.description || null,
          sourceType: parsed.sourceType || null,
          sourceId: parsed.sourceId || null,
          lines: {
            deleteMany: {},
            create: parsed.lines.map((line) => ({
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              description: line.description || null,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.userId,
          action: "UPDATE",
          entity: "JournalEntry",
          entityId: id,
          details: { entryNumber: existing.entryNumber } as never,
        },
      });

      return updated;
    });

    return successResponse(journalEntry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return serverError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.JOURNALS_CREATE)))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.journalEntry.findUnique({
    where: { id },
    include: { _count: { select: { postingOperations: true } } },
  });
  if (!existing) return notFoundError();

  if (!(await canAccessCompany(user, existing.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }
  if (existing.status !== "DRAFT")
    return errorResponse("لا يمكن حذف قيد غير مسودة");
  if (existing._count.postingOperations > 0)
    return errorResponse("لا يمكن حذف قيد له عمليات ترحيل مرتبطة");

  await prisma.$transaction(async (tx) => {
    await tx.journalEntry.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: user.userId,
        action: "DELETE",
        entity: "JournalEntry",
        entityId: id,
        details: { entryNumber: existing.entryNumber } as never,
      },
    });
  });

  return successResponse({ deleted: true });
}
