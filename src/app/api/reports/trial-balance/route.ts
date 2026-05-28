import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.REPORTS_VIEW))
  )
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  const effectiveCompanyId =
    companyId ||
    (!isGlobalAdmin && dbUser?.companyId ? dbUser.companyId : null);

  if (effectiveCompanyId && !(await canAccessCompany(user, effectiveCompanyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const whereClause: string[] = ["jl.deleted_at IS NULL"];
    const params: unknown[] = [];

    if (effectiveCompanyId) {
      whereClause.push(`je."companyId" = $${params.length + 1}`);
      params.push(effectiveCompanyId);
    }

    whereClause.push(`je.status = 'POSTED'`);

    if (fromDate) {
      whereClause.push(`je."entryDate" >= $${params.length + 1}`);
      params.push(new Date(fromDate));
    }
    if (toDate) {
      whereClause.push(`je."entryDate" <= $${params.length + 1}`);
      params.push(new Date(toDate));
    }

    const query = `
      SELECT
        a.id AS "accountId",
        a.code AS "accountCode",
        a.name AS "accountName",
        a."parentId",
        a.type AS "accountType",
        COALESCE(SUM(jl.debit), 0) AS "totalDebit",
        COALESCE(SUM(jl.credit), 0) AS "totalCredit",
        COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) AS "netBalance"
      FROM "JournalLine" jl
      INNER JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
      INNER JOIN "Account" a ON a.id = jl."accountId"
      WHERE ${whereClause.join(" AND ")}
      GROUP BY a.id, a.code, a.name, a."parentId", a.type
      ORDER BY a.code
    `;

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        accountId: string;
        accountCode: string;
        accountName: string;
        parentId: string | null;
        accountType: string;
        totalDebit: number;
        totalCredit: number;
        netBalance: number;
      }>
    >(query, ...params);

    const totalDebit = rows.reduce((s, r) => s + Number(r.totalDebit), 0);
    const totalCredit = rows.reduce((s, r) => s + Number(r.totalCredit), 0);

    return successResponse({
      accounts: rows.map((r) => ({
        ...r,
        totalDebit: Number(r.totalDebit),
        totalCredit: Number(r.totalCredit),
        netBalance: Number(r.netBalance),
      })),
      totals: { totalDebit, totalCredit },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Trial balance error:", error);
    return errorResponse("فشل إنشاء ميزان المراجعة", 500);
  }
}
