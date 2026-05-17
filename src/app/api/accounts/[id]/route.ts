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
import { z } from "zod";

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().optional().nullable(),
  subtype: z.string().optional().nullable(),
  isPosting: z.boolean().optional(),
  isActive: z.boolean().optional(),
  allowManualJournal: z.boolean().optional(),
  description: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.ACCOUNTS_VIEW))
    return unauthorizedError();

  const { id } = await params;

  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      _count: { select: { children: true } },
    },
  });

  if (!account) return notFoundError();

  const data = {
    ...account,
    childrenCount: account._count.children,
    _count: undefined,
  };
  return successResponse(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.ACCOUNTS_EDIT))
    return unauthorizedError();

  const { id } = await params;

  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  try {
    const body = await request.json();
    const parsed = updateAccountSchema.parse(body);

    if (
      body.type !== undefined ||
      body.currency !== undefined ||
      body.normalBalance !== undefined
    ) {
      if (existing.isProtected)
        return errorResponse("لا يمكن تغيير هذا الحقل لحساب محمي");

      const journalLinesCount = await prisma.journalLine.count({
        where: { accountId: id },
      });
      if (journalLinesCount > 0)
        return errorResponse("لا يمكن تغيير هذا الحقل لحساب له حركات يومية");
    }

    if (
      parsed.parentId !== undefined &&
      parsed.parentId !== existing.parentId
    ) {
      const newParent = parsed.parentId
        ? await prisma.account.findUnique({ where: { id: parsed.parentId } })
        : null;

      if (parsed.parentId && !newParent)
        return errorResponse("الحساب الأب غير موجود");
      if (newParent && newParent.companyId !== existing.companyId)
        return errorResponse("الحساب الأب لا ينتمي لنفس الشركة");
    }

    const data: Record<string, unknown> = { ...parsed };
    if (parsed.parentId !== undefined) {
      if (parsed.parentId) {
        const parent = await prisma.account.findUnique({
          where: { id: parsed.parentId },
        });
        data.level = (parent?.level ?? 0) + 1;
      } else {
        data.level = 0;
        data.parentId = null;
      }
    }

    const account = await prisma.account.update({
      where: { id },
      data,
    });

    await logAudit(user.userId, "UPDATE", "Account", id, {
      code: account.code,
      name: account.name,
    });

    return successResponse(account);
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
  if (!checkPermission(user, PERMISSIONS.ACCOUNTS_DELETE))
    return unauthorizedError();

  const { id } = await params;

  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  const childrenCount = await prisma.account.count({
    where: { parentId: id },
  });
  if (childrenCount > 0)
    return errorResponse("لا يمكن حذف حساب له حسابات فرعية");

  const journalLinesCount = await prisma.journalLine.count({
    where: { accountId: id },
  });
  if (journalLinesCount > 0)
    return errorResponse("لا يمكن حذف حساب له حركات يومية");

  await prisma.account.update({
    where: { id },
    data: { isActive: false },
  });

  await logAudit(user.userId, "DELETE", "Account", id, {
    code: existing.code,
    name: existing.name,
  });

  return successResponse({ id, isActive: false });
}
