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
import { journalEntryFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.JOURNALS_CREATE))
    return unauthorizedError();

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
  if (!checkPermission(user, PERMISSIONS.JOURNALS_CREATE))
    return unauthorizedError();

  const { id } = await params;

  const existing = await prisma.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!existing) return notFoundError();
  if (existing.status !== "DRAFT")
    return errorResponse("لا يمكن تعديل قيد غير مسودة");

  try {
    const body = await request.json();
    const parsed = journalEntryFormSchema.parse(body);

    const entryCount = await prisma.journalEntry.count({
      where: { companyId: parsed.companyId },
    });
    const entryNumber =
      existing.entryNumber || `JE-${String(entryCount + 1).padStart(5, "0")}`;

    const journalEntry = await prisma.journalEntry.update({
      where: { id },
      data: {
        companyId: parsed.companyId,
        branchId: parsed.branchId || null,
        fiscalPeriodId: parsed.fiscalPeriodId || null,
        entryNumber,
        entryDate: parsed.entryDate
          ? new Date(parsed.entryDate)
          : existing.entryDate,
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

    await logAudit(user.userId, "UPDATE", "JournalEntry", id, {
      entryNumber,
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
  if (!checkPermission(user, PERMISSIONS.JOURNALS_CREATE))
    return unauthorizedError();

  const { id } = await params;

  const existing = await prisma.journalEntry.findUnique({ where: { id } });
  if (!existing) return notFoundError();
  if (existing.status !== "DRAFT")
    return errorResponse("لا يمكن حذف قيد غير مسودة");

  await prisma.journalEntry.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "JournalEntry", id, {
    entryNumber: existing.entryNumber,
  });

  return successResponse({ deleted: true });
}
