import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  serverError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.JOURNALS_REVERSE))
    return unauthorizedError();

  const { id } = await params;

  const original = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!original) return notFoundError();
  if (original.status !== "POSTED")
    return errorResponse("يمكن عكس القيود المرحلة فقط");

  const entryCount = await prisma.journalEntry.count({
    where: { companyId: original.companyId },
  });
  const entryNumber = `JE-${String(entryCount + 1).padStart(5, "0")}`;

  const reversedLines = original.lines.map((line) => ({
    accountId: line.accountId,
    debit: Number(line.credit),
    credit: Number(line.debit),
    description: `عكس: ${original.entryNumber} - ${line.description || ""}`,
  }));

  const reversed = await prisma.journalEntry.create({
    data: {
      companyId: original.companyId,
      branchId: original.branchId,
      fiscalPeriodId: original.fiscalPeriodId,
      entryNumber,
      entryDate: new Date(),
      currency: original.currency,
      exchangeRateSnapshot: original.exchangeRateSnapshot,
      description: `عكس القيد ${original.entryNumber}`,
      sourceType: "REVERSE",
      sourceId: original.id,
      status: "DRAFT",
      createdById: user.userId,
      lines: {
        create: reversedLines,
      },
    },
    include: { lines: true },
  });

  await prisma.journalEntry.update({
    where: { id: original.id },
    data: { status: "REVERSED" as never },
  });

  await logAudit(user.userId, "REVERSE", "JournalEntry", reversed.id, {
    originalEntryNumber: original.entryNumber,
    reversedEntryNumber: entryNumber,
  });

  return successResponse(reversed, 201);
}
