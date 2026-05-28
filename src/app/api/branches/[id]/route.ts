import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
  logAudit,
} from "@/lib/auth";
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

const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.BRANCHES_VIEW)))
    return forbiddenError();

  const { id } = await params;

  const branch = await prisma.branch.findUnique({
    where: { id },
    include: { company: { select: { name: true } } },
  });

  if (!branch) return notFoundError();
  if (!canAccessCompany(user, branch.companyId))
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");

  return successResponse({
    ...branch,
    companyName: branch.company.name,
    company: undefined,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.BRANCHES_EDIT)))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) return notFoundError();
  if (!canAccessCompany(user, existing.companyId))
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");

  try {
    const body = await request.json();
    const parsed = updateBranchSchema.parse(body);

    if (parsed.code) {
      const duplicate = await prisma.branch.findUnique({
        where: {
          companyId_code: { companyId: existing.companyId, code: parsed.code },
        },
      });
      if (duplicate && duplicate.id !== id)
        return errorResponse("كود الفرع موجود مسبقاً للشركة", 409);
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: parsed,
    });

    await logAudit(user.userId, "UPDATE", "Branch", id, {
      code: branch.code,
      name: branch.name,
    });

    return successResponse(branch);
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
  if (!(await requireDbPermission(user.userId, PERMISSIONS.BRANCHES_EDIT)))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) return notFoundError();
  if (!canAccessCompany(user, existing.companyId))
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");

  const [fiscalPeriodCount, journalEntryCount] = await Promise.all([
    prisma.fiscalPeriod.count({ where: { branchId: id } }),
    prisma.journalEntry.count({ where: { branchId: id } }),
  ]);

  const totalRelated = fiscalPeriodCount + journalEntryCount;

  if (totalRelated > 0) {
    await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit(user.userId, "DEACTIVATE", "Branch", id, {
      reason: "entity_has_related_records",
      relatedRecords: {
        fiscalPeriods: fiscalPeriodCount,
        journalEntries: journalEntryCount,
      },
    });

    return successResponse({
      action: "deactivated",
      branchId: id,
      isActive: false,
    });
  }

  await prisma.branch.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "Branch", id, {
    code: existing.code,
    name: existing.name,
    wasPermanent: true,
  });

  return successResponse({
    action: "deleted",
    branchId: id,
  });
}
