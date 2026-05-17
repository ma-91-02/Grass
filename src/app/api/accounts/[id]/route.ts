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
    return forbiddenError();

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

async function isDescendant(
  ancestorId: string,
  candidateId: string,
): Promise<boolean> {
  let current: string | null = candidateId;
  const visited = new Set<string>();
  while (current) {
    if (current === ancestorId) return true;
    if (visited.has(current)) return false;
    visited.add(current);
    const acct: { parentId: string | null } | null =
      await prisma.account.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
    current = acct?.parentId ?? null;
  }
  return false;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!checkPermission(user, PERMISSIONS.ACCOUNTS_EDIT))
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  try {
    const body = await request.json();
    const parsed = updateAccountSchema.parse(body);

    if (body.code !== undefined) {
      if (existing.isProtected)
        return errorResponse("لا يمكن تغيير رقم الحساب لحساب محمي");
      const journalLinesCount = await prisma.journalLine.count({
        where: { accountId: id },
      });
      if (journalLinesCount > 0)
        return errorResponse("لا يمكن تغيير رقم الحساب لحساب له حركات يومية");
    }

    if (body.currency !== undefined) {
      if (existing.isProtected)
        return errorResponse("لا يمكن تغيير العملة لحساب محمي");
      const journalLinesCount = await prisma.journalLine.count({
        where: { accountId: id },
      });
      if (journalLinesCount > 0)
        return errorResponse("لا يمكن تغيير العملة لحساب له حركات يومية");
    }

    if (body.normalBalance !== undefined) {
      if (existing.isProtected)
        return errorResponse("لا يمكن تغيير طبيعة الرصيد لحساب محمي");
      const journalLinesCount = await prisma.journalLine.count({
        where: { accountId: id },
      });
      if (journalLinesCount > 0)
        return errorResponse("لا يمكن تغيير طبيعة الرصيد لحساب له حركات يومية");
    }

    if (body.type !== undefined) {
      if (existing.isProtected)
        return errorResponse("لا يمكن تغيير نوع الحساب لحساب محمي");
      const journalLinesCount = await prisma.journalLine.count({
        where: { accountId: id },
      });
      if (journalLinesCount > 0)
        return errorResponse("لا يمكن تغيير نوع الحساب لحساب له حركات يومية");
    }

    if (body.isPosting === false && existing.isPosting === true) {
      const childPostingCount = await prisma.account.count({
        where: { parentId: id, isPosting: true },
      });
      if (childPostingCount > 0)
        return errorResponse(
          "لا يمكن إلغاء الترحيل لحساب له حسابات فرعية مرحّلة",
        );
    }

    if (body.isPosting === true && existing.isPosting === false) {
      const childrenCount = await prisma.account.count({
        where: { parentId: id },
      });
      if (childrenCount > 0)
        return errorResponse("لا يمكن ترحيل حساب أب له حسابات فرعية");
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
      if (newParent && newParent.isPosting)
        return errorResponse("لا يمكن نقل حساب تحت حساب أب مرحّل");
      if (newParent && newParent.currency !== existing.currency)
        return errorResponse("عملة الحساب الأب لا تطابق عملة الحساب");
      if (newParent && (await isDescendant(id, newParent.id)))
        return errorResponse("لا يمكن جعل الحساب التابع أباً للحساب الحالي");
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
    return forbiddenError();

  const { id } = await params;

  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (existing.isSystem || existing.isProtected)
    return errorResponse("لا يمكن حذف حساب نظامي أو محمي");

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

  await prisma.account.delete({ where: { id } });

  await logAudit(user.userId, "DELETE", "Account", id, {
    code: existing.code,
    name: existing.name,
    wasPermanent: true,
  });

  return successResponse({ action: "deleted", accountId: id });
}
