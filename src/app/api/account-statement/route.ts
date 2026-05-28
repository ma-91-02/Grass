import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireDbPermission, canAccessCompany } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (!(await requireDbPermission(user.userId, PERMISSIONS.ACCOUNTS_STATEMENT))) {
    return forbiddenError("لا تملك صلاحية عرض كشف الحساب");
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");
  const companyId = searchParams.get("companyId");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  let page = parseInt(pageParam || "1", 10);
  let limit = parseInt(limitParam || "50", 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 50;
  if (limit > 200) limit = 200;

  if (!accountId) {
    return errorResponse("accountId مطلوب", 400);
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { company: { select: { id: true, name: true } } },
  });
  if (!account) return notFoundError("الحساب غير موجود");

  const targetCompanyId = companyId || account.companyId;
  if (!(await canAccessCompany(user, targetCompanyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;

  // Fetch all journal lines for this account within the period
  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      journalEntry: {
        companyId: targetCompanyId,
        status: "POSTED",
        ...(fromDate && { entryDate: { gte: fromDate } }),
        ...(toDate && { entryDate: { lte: toDate } }),
      },
    },
    orderBy: { journalEntry: { entryDate: "asc" } },
    include: {
      journalEntry: {
        select: {
          id: true,
          entryNumber: true,
          entryDate: true,
          description: true,
          currency: true,
        },
      },
    },
  });

  // Calculate opening balance (total before fromDate)
  let openingBalance = 0;
  if (fromDate) {
    const priorLines = await prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: {
          companyId: targetCompanyId,
          status: "POSTED",
          entryDate: { lt: fromDate },
        },
      },
    });
    for (const pl of priorLines) {
      openingBalance += Number(pl.debit) - Number(pl.credit);
    }
  }

  // Enrich with running balance
  type Transaction = {
    id: string;
    date: Date;
    entryNumber: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    currency: string;
  };

  const transactions: Transaction[] = [];
  let runningBalance = openingBalance;

  for (const line of lines) {
    const debit = Number(line.debit);
    const credit = Number(line.credit);
    runningBalance += debit - credit;
    transactions.push({
      id: line.id,
      date: line.journalEntry.entryDate,
      entryNumber: line.journalEntry.entryNumber,
      description: line.description || line.journalEntry.description || "",
      debit,
      credit,
      balance: runningBalance,
      currency: line.journalEntry.currency,
    });
  }

  const skip = (page - 1) * limit;
  const paginated = transactions.slice(skip, skip + limit);

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);

  return successResponse({
    account: {
      id: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: account.normalBalance,
      currency: account.currency,
      company: account.company,
    },
    period: {
      from: fromDate?.toISOString() || null,
      to: toDate?.toISOString() || null,
    },
    openingBalance,
    transactions: paginated,
    summary: {
      totalDebit,
      totalCredit,
      endingBalance: runningBalance,
    },
    pagination: {
      page,
      limit,
      total: transactions.length,
      totalPages: Math.ceil(transactions.length / limit),
    },
  });
}
