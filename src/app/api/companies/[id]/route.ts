import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  serverError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  taxId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.COMPANIES_VIEW))
    return forbiddenError();

  const { id } = await params;

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return notFoundError();

  return successResponse(company);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.COMPANIES_EDIT))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  try {
    const body = await request.json();
    const parsed = updateCompanySchema.parse(body);

    if (parsed.code) {
      const duplicate = await prisma.company.findUnique({
        where: { code: parsed.code },
      });
      if (duplicate && duplicate.id !== id)
        return errorResponse("كود الشركة موجود مسبقاً", 409);
    }

    const company = await prisma.company.update({
      where: { id },
      data: parsed,
    });

    await logAudit(user.userId, "UPDATE", "Company", id, {
      code: company.code,
      name: company.name,
    });

    return successResponse(company);
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
  if (!checkPermission(user, PERMISSIONS.COMPANIES_EDIT))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  const [branchCount, accountCount, fiscalPeriodCount, journalEntryCount] =
    await Promise.all([
      prisma.branch.count({ where: { companyId: id } }),
      prisma.account.count({ where: { companyId: id } }),
      prisma.fiscalPeriod.count({ where: { companyId: id } }),
      prisma.journalEntry.count({ where: { companyId: id } }),
    ]);

  const totalRelated =
    branchCount + accountCount + fiscalPeriodCount + journalEntryCount;

  if (totalRelated > 0) {
    await prisma.company.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit(user.userId, "DEACTIVATE", "Company", id, {
      reason: "entity_has_related_records",
      relatedRecords: {
        branches: branchCount,
        accounts: accountCount,
        fiscalPeriods: fiscalPeriodCount,
        journalEntries: journalEntryCount,
      },
    });

    return successResponse({
      action: "deactivated",
      companyId: id,
      isActive: false,
    });
  }

  await prisma.company.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "Company", id, {
    code: existing.code,
    name: existing.name,
    wasPermanent: true,
  });

  return successResponse({
    action: "deleted",
    companyId: id,
  });
}
