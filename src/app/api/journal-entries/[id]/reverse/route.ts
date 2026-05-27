import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { PeriodGuard } from "@/lib/services/period-guard";
import { LedgerValidator } from "@/lib/services/ledger-validator";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.JOURNALS_REVERSE)))
    return forbiddenError();

  const { id } = await params;

  const original = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!original) return notFoundError();

  if (!(await canAccessCompany(user, original.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }
  if (original.status !== "POSTED")
    return errorResponse("يمكن عكس القيود المرحلة فقط");

  // Verify current period is open before creating reversal
  const periodCheck = await PeriodGuard.checkPeriodOpen(
    original.companyId,
    new Date(),
    original.branchId || undefined,
  );
  if (!periodCheck.allowed) {
    return errorResponse(periodCheck.error || "الفترة المالية مغلقة");
  }

  const entryCount = await prisma.journalEntry.count({
    where: { companyId: original.companyId },
  });
  const entryNumber = `JE-${String(entryCount + 1).padStart(5, "0")}`;
  const reversalDate = new Date();

  const reversedLines = original.lines.map((line) => ({
    accountId: line.accountId,
    debit: Number(line.credit),
    credit: Number(line.debit),
    description: `عكس: ${original.entryNumber} - ${line.description || ""}`,
  }));

  const validation = LedgerValidator.validateLines(reversedLines);
  if (!validation.valid) {
    return errorResponse(validation.errors.join(" | "));
  }

  const reversed = await prisma.$transaction(async (tx) => {
    const created = await tx.journalEntry.create({
      data: {
        companyId: original.companyId,
        branchId: original.branchId,
        fiscalPeriodId: original.fiscalPeriodId,
        entryNumber,
        entryDate: reversalDate,
        currency: original.currency,
        exchangeRateSnapshot: original.exchangeRateSnapshot,
        description: `عكس القيد ${original.entryNumber}`,
        sourceType: "REVERSE",
        sourceId: original.id,
        status: "POSTED",
        postedAt: reversalDate,
        createdById: user.userId,
        lines: {
          create: reversedLines,
        },
      },
      include: { lines: true },
    });

    await tx.auditLog.create({
      data: {
        userId: user.userId,
        action: "REVERSE",
        entity: "JournalEntry",
        entityId: created.id,
        details: {
          originalEntryNumber: original.entryNumber,
          reversedEntryNumber: entryNumber,
          originalJournalEntryId: original.id,
          reversalJournalEntryId: created.id,
          reversalStatus: "POSTED",
          totalDebit: validation.totalDebit,
          totalCredit: validation.totalCredit,
        } as never,
      },
    });

    await tx.journalEntry.update({
      where: { id: original.id },
      data: { status: "REVERSED" as never },
    });

    return created;
  });

  return successResponse(reversed, 201);
}
