import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  serverError,
} from "@/lib/api-response";
import { journalEntryFormSchema } from "@/lib/schemas";
import { LedgerValidator } from "@/lib/services/ledger-validator";
import { PeriodGuard } from "@/lib/services/period-guard";
import { CurrencyGuard } from "@/lib/services/currency-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.JOURNALS_CREATE))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const status = searchParams.get("status");
  const sourceType = searchParams.get("sourceType");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  if (!companyId) return errorResponse("companyId مطلوب");

  const where: Record<string, unknown> = { companyId };

  if (status) where.status = status;
  if (sourceType) where.sourceType = sourceType;
  if (fromDate || toDate) {
    const entryDate: Record<string, Date> = {};
    if (fromDate) entryDate.gte = new Date(fromDate);
    if (toDate) entryDate.lte = new Date(toDate);
    where.entryDate = entryDate;
  }

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { lines: true } },
      },
    }),
    prisma.journalEntry.count({ where }),
  ]);

  const data = entries.map((e) => ({
    ...e,
    lineCount: e._count.lines,
    _count: undefined,
  }));

  return successResponse({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.JOURNALS_CREATE))
    return forbiddenError();

  try {
    const body = await request.json();
    const parsed = journalEntryFormSchema.parse(body);

    const entryDate = parsed.entryDate
      ? new Date(parsed.entryDate)
      : new Date();

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

    // 6. Generate entry number
    const entryCount = await prisma.journalEntry.count({
      where: { companyId: parsed.companyId },
    });
    const entryNumber = `JE-${String(entryCount + 1).padStart(5, "0")}`;

    // 7. Create journal entry with lines
    const journalEntry = await prisma.journalEntry.create({
      data: {
        companyId: parsed.companyId,
        branchId: parsed.branchId || null,
        fiscalPeriodId,
        entryNumber,
        entryDate,
        currency: parsed.currency,
        exchangeRateSnapshot: parsed.exchangeRateSnapshot,
        description: parsed.description || null,
        sourceType: parsed.sourceType || null,
        sourceId: parsed.sourceId || null,
        status: "DRAFT",
        createdById: user.userId,
        lines: {
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

    await logAudit(user.userId, "CREATE", "JournalEntry", journalEntry.id, {
      entryNumber,
      linesCount: parsed.lines.length,
    });

    return successResponse(journalEntry, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return serverError(error);
  }
}
