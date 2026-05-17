import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  serverError,
} from "@/lib/api-response";
import { journalEntryFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.JOURNALS_CREATE))
    return unauthorizedError();

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
    return unauthorizedError();

  try {
    const body = await request.json();
    const parsed = journalEntryFormSchema.parse(body);

    const entryCount = await prisma.journalEntry.count({
      where: { companyId: parsed.companyId },
    });
    const entryNumber = `JE-${String(entryCount + 1).padStart(5, "0")}`;

    const entryDate = parsed.entryDate
      ? new Date(parsed.entryDate)
      : new Date();

    let fiscalPeriodId = parsed.fiscalPeriodId || null;
    if (!fiscalPeriodId) {
      const period = await prisma.fiscalPeriod.findFirst({
        where: {
          companyId: parsed.companyId,
          startDate: { lte: entryDate },
          endDate: { gte: entryDate },
          status: { not: "FUTURE" },
        },
        orderBy: { startDate: "desc" },
      });
      if (period) fiscalPeriodId = period.id;
    }

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
