import { NextRequest } from "next/server";
import { getCurrentUser, checkPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  serverError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { LedgerValidator } from "@/lib/services/ledger-validator";
import { PeriodGuard } from "@/lib/services/period-guard";
import { PostingService } from "@/lib/services/posting-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.JOURNALS_POST))
    return unauthorizedError();

  const { id } = await params;

  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!entry) return notFoundError();

  // Pre-validation before posting
  if (entry.status !== "DRAFT") {
    return errorResponse(
      entry.status === "POSTED"
        ? "القيد تم ترحيله مسبقاً"
        : "القيد ملغي أو معكوس",
    );
  }

  const lineInputs = entry.lines.map((l) => ({
    accountId: l.accountId,
    debit: Number(l.debit),
    credit: Number(l.credit),
  }));
  const validation = LedgerValidator.validateLines(lineInputs);
  if (!validation.valid) {
    return errorResponse(validation.errors.join(" | "));
  }

  if (entry.fiscalPeriodId) {
    const periodCheck = await PeriodGuard.checkPeriodOpen(
      entry.companyId,
      entry.entryDate,
      entry.branchId || undefined,
    );
    if (!periodCheck.allowed) {
      return errorResponse(periodCheck.error!);
    }
  }

  const idempotencyKey = `JE_POST_${id}_${user.userId}_${Date.now()}`;

  const result = await PostingService.postJournal({
    journalEntryId: id,
    userId: user.userId,
    idempotencyKey,
  });

  if (!result.success) {
    return serverError(new Error(result.error || "فشل الترحيل"));
  }

  return successResponse({
    success: true,
    journalEntryId: result.journalEntryId,
  });
}
