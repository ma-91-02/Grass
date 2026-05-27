import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  hashPassword,
  logAudit,
  requireDbPermission,
  isSystemOwnerById,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();
    if (!(await requireDbPermission(user.userId, PERMISSIONS.USERS_VIEW)))
      return forbiddenError();

    const { id } = await params;
    const found = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });

    if (!found) return notFoundError();

    const isOwner = await isSystemOwnerById(id);

    return successResponse({
      id: found.id,
      name: found.name,
      email: found.email,
      isActive: found.isActive,
      phone: found.phone,
      roles: found.roles.map((r) => r.role.name),
      isSystemOwner: isOwner,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedError();
    if (!(await requireDbPermission(currentUser.userId, PERMISSIONS.USERS_EDIT)))
      return forbiddenError();

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, phone, isActive, roleIds } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return notFoundError();

    // Prevent modifying system owner's critical fields
    if (await isSystemOwnerById(id)) {
      if (isActive !== undefined || roleIds !== undefined) {
        return errorResponse("لا يمكن تعديل صلاحيات أو حالة مالك النظام");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await hashPassword(password);

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        roles: roleIds
          ? {
              deleteMany: {},
              create: roleIds.map((roleId: string) => ({ roleId })),
            }
          : undefined,
      },
      include: { roles: { include: { role: true } } },
    });

    await logAudit(currentUser.userId, "UPDATE", "User", id, {
      name,
      email,
    });

    return successResponse({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      isActive: updated.isActive,
      phone: updated.phone,
      roles: updated.roles.map((r) => r.role.name),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorizedError();
    if (
      !(await requireDbPermission(currentUser.userId, PERMISSIONS.USERS_DELETE))
    )
      return forbiddenError();

    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!target) return notFoundError();

    if (await isSystemOwnerById(id)) {
      return errorResponse("لا يمكن حذف مالك النظام");
    }

    if (currentUser.userId === id) {
      return errorResponse("لا يمكنك حذف نفسك");
    }

    const isSystemAdmin = target.roles.some((r) => r.role.name === "مدير النظام");

    if (isSystemAdmin) {
      const otherActiveAdmins = await prisma.user.count({
        where: {
          isActive: true,
          id: { not: id },
          roles: { some: { role: { name: "مدير النظام" } } },
        },
      });
      if (otherActiveAdmins === 0) {
        return errorResponse("لا يمكن حذف آخر مشرف نظام نشط");
      }
    }

    const [
      auditLogCount,
      customerCount,
      supplierCount,
      invoiceCount,
      purchaseInvoiceCount,
      paymentCount,
      exchangeRateCount,
      accountCount,
      journalEntryCount,
    ] = await Promise.all([
      prisma.auditLog.count({ where: { userId: id } }),
      prisma.customer.count({ where: { createdById: id } }),
      prisma.supplier.count({ where: { createdById: id } }),
      prisma.invoice.count({ where: { createdById: id } }),
      prisma.purchaseInvoice.count({ where: { createdById: id } }),
      prisma.payment.count({ where: { createdById: id } }),
      prisma.exchangeRate.count({ where: { createdById: id } }),
      prisma.account.count({ where: { createdById: id } }),
      prisma.journalEntry.count({ where: { createdById: id } }),
    ]);

    const totalRelated =
      auditLogCount +
      customerCount +
      supplierCount +
      invoiceCount +
      purchaseInvoiceCount +
      paymentCount +
      exchangeRateCount +
      accountCount +
      journalEntryCount;

    if (totalRelated > 0) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      await logAudit(currentUser.userId, "DEACTIVATE", "User", id, {
        reason: "user_has_related_records",
        relatedRecords: {
          auditLogs: auditLogCount,
          customers: customerCount,
          suppliers: supplierCount,
          invoices: invoiceCount,
          purchases: purchaseInvoiceCount,
          payments: paymentCount,
          exchangeRates: exchangeRateCount,
          accounts: accountCount,
          journalEntries: journalEntryCount,
        },
      });

      return successResponse({
        action: "deactivated",
        userId: id,
        isActive: false,
      });
    }

    await prisma.user.delete({ where: { id } });

    await logAudit(currentUser.userId, "DELETE", "User", id, {
      wasPermanent: true,
    });

    return successResponse({
      action: "deleted",
      userId: id,
    });
  } catch (error) {
    return serverError(error);
  }
}
