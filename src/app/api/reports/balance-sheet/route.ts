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
  if (!(await requireDbPermission(user.userId, PERMISSIONS.REPORTS_VIEW)))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");
  const asOfDate = searchParams.get("asOf");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");
  const effectiveCompanyId =
    companyId ||
    (!isGlobalAdmin && dbUser?.companyId ? dbUser.companyId : null);

  if (
    effectiveCompanyId &&
    !(await canAccessCompany(user, effectiveCompanyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const conditions: string[] = [
      'je.status = \'POSTED\'',
      'jl.deleted_at IS NULL',
      '(a.type = \'ASSET\' OR a.type = \'LIABILITY\' OR a.type = \'EQUITY\')',
    ];
    const params: unknown[] = [];

    if (effectiveCompanyId) {
      conditions.push(`je."companyId" = $${params.length + 1}`);
      params.push(effectiveCompanyId);
    }
    if (asOfDate) {
      conditions.push(`je."entryDate" <= $${params.length + 1}`);
      params.push(new Date(asOfDate));
    }

    const query = `
      SELECT
        a.id AS "accountId",
        a.code AS "accountCode",
        a.name AS "accountName",
        a.type AS "accountType",
        COALESCE(SUM(jl.debit), 0) AS "totalDebit",
        COALESCE(SUM(jl.credit), 0) AS "totalCredit",
        CASE
          WHEN a."normalBalance" = 'DEBIT' THEN COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0)
          ELSE COALESCE(SUM(jl.credit), 0) - COALESCE(SUM(jl.debit), 0)
        END AS "netBalance"
      FROM "JournalLine" jl
      INNER JOIN "JournalEntry" je ON je.id = jl."journalEntryId"
      INNER JOIN "Account" a ON a.id = jl."accountId"
      WHERE ${conditions.join(" AND ")}
      GROUP BY a.id, a.code, a.name, a.type, a."normalBalance"
      ORDER BY a.type, a.code
    `;

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        accountId: string;
        accountCode: string;
        accountName: string;
        accountType: string;
        totalDebit: number;
        totalCredit: number;
        netBalance: number;
      }>
    >(query, ...params);

    const assetAccounts = rows.filter((r) => r.accountType === "ASSET");
    const liabilityAccounts = rows.filter((r) => r.accountType === "LIABILITY");
    const equityAccounts = rows.filter((r) => r.accountType === "EQUITY");

    const totalAssets = assetAccounts.reduce(
      (s, r) => s + Number(r.netBalance),
      0,
    );
    const totalLiabilities = liabilityAccounts.reduce(
      (s, r) => s + Number(r.netBalance),
      0,
    );
    const totalEquity = equityAccounts.reduce(
      (s, r) => s + Number(r.netBalance),
      0,
    );

    return successResponse({
      assetAccounts: assetAccounts.map((r) => ({
        ...r,
        totalDebit: Number(r.totalDebit),
        totalCredit: Number(r.totalCredit),
        netBalance: Number(r.netBalance),
      })),
      liabilityAccounts: liabilityAccounts.map((r) => ({
        ...r,
        totalDebit: Number(r.totalDebit),
        totalCredit: Number(r.totalCredit),
        netBalance: Number(r.netBalance),
      })),
      equityAccounts: equityAccounts.map((r) => ({
        ...r,
        totalDebit: Number(r.totalDebit),
        totalCredit: Number(r.totalCredit),
        netBalance: Number(r.netBalance),
      })),
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Balance sheet error:", error);
    return errorResponse("فشل إنشاء الميزانية العمومية", 500);
  }
}
