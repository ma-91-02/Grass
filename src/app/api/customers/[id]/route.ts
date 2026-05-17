import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  logAudit,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const customerUpdateSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب").optional(),
  code: z.string().min(1, "كود العميل مطلوب").optional(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().nullable(),
  address: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  customerType: z
    .enum(["INDIVIDUAL", "MARKET", "WHOLESALE", "AGENT", "ONLINE"])
    .optional(),
  customerCategoryId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  creditLimit: z.coerce.number().min(0).optional(),
  openingBalanceIqd: z.coerce.number().optional(),
  openingBalanceUsd: z.coerce.number().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.CUSTOMERS_VIEW)))
    return forbiddenError();

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { accounts: true, customerCategory: true },
  });
  if (!customer) return notFoundError();

  if (
    customer.companyId &&
    !(await canAccessCompany(user, customer.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  return successResponse({
    id: customer.id,
    companyId: customer.companyId,
    name: customer.name,
    code: customer.code,
    phone: customer.phone,
    whatsapp: customer.whatsapp,
    email: customer.email,
    address: customer.address,
    governorate: customer.governorate,
    customerType: customer.customerType,
    customerCategoryId: customer.customerCategoryId,
    customerCategoryName: customer.customerCategory?.name || null,
    isActive: customer.isActive,
    notes: customer.notes,
    creditLimit: Number(customer.creditLimit ?? 0),
    currentBalance: Number(customer.currentBalance ?? 0),
    currency: customer.currency,
    accounts: customer.accounts.map((a) => ({
      id: a.id,
      customerId: a.customerId,
      currency: a.currency,
      balance: Number(a.balance),
    })),
    createdAt: customer.createdAt,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.CUSTOMERS_EDIT))
  ) {
    return forbiddenError("لا تملك صلاحية تعديل عميل");
  }

  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  if (
    existing.companyId &&
    !(await canAccessCompany(currentUser, existing.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  try {
    const body = await request.json();
    const parsed = customerUpdateSchema.parse(body);

    // Per-company duplicate code check
    if (parsed.code && parsed.code !== existing.code && existing.companyId) {
      const duplicateCode = await prisma.customer.findFirst({
        where: {
          companyId: existing.companyId,
          code: parsed.code,
          id: { not: id },
        },
      });
      if (duplicateCode) {
        return conflictError("كود العميل مستخدم مسبقاً في هذه الشركة");
      }
    }

    const {
      openingBalanceIqd,
      openingBalanceUsd,
      creditLimit,
      ...customerData
    } = parsed;

    const updateData: Record<string, unknown> = { ...customerData };

    if (creditLimit !== undefined) {
      updateData.creditLimit = creditLimit;
    }

    const accountUpdates: { currency: string; balance: number }[] = [];
    if (openingBalanceIqd !== undefined) {
      accountUpdates.push({ currency: "IQD", balance: openingBalanceIqd });
    }
    if (openingBalanceUsd !== undefined) {
      accountUpdates.push({ currency: "USD", balance: openingBalanceUsd });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...updateData,
        ...(accountUpdates.length > 0
          ? {
              accounts: {
                upsert: accountUpdates.map((a) => ({
                  where: {
                    customerId_currency: {
                      customerId: id,
                      currency: a.currency as "IQD" | "USD",
                    },
                  },
                  update: { balance: a.balance },
                  create: {
                    currency: a.currency as "IQD" | "USD",
                    balance: a.balance,
                  },
                })),
              },
            }
          : {}),
      },
      include: { accounts: true, customerCategory: true },
    });

    await logAudit(currentUser.userId, "UPDATE", "Customer", id, {
      name: customer.name,
      code: customer.code,
    });

    return successResponse({
      id: customer.id,
      companyId: customer.companyId,
      name: customer.name,
      code: customer.code,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      address: customer.address,
      governorate: customer.governorate,
      customerType: customer.customerType,
      customerCategoryId: customer.customerCategoryId,
      customerCategoryName: customer.customerCategory?.name || null,
      isActive: customer.isActive,
      notes: customer.notes,
      creditLimit: Number(customer.creditLimit ?? 0),
      currentBalance: Number(customer.currentBalance ?? 0),
      currency: customer.currency,
      accounts: customer.accounts.map((a) => ({
        id: a.id,
        customerId: a.customerId,
        currency: a.currency,
        balance: Number(a.balance),
      })),
      createdAt: customer.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث العميل", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.CUSTOMERS_DELETE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية حذف عميل");
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { invoices: true },
  });
  if (!customer) return notFoundError();

  if (
    customer.companyId &&
    !(await canAccessCompany(currentUser, customer.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  if (customer.invoices.length > 0) {
    // Safe deactivate instead of hard delete
    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    await logAudit(currentUser.userId, "DEACTIVATE", "Customer", id, {
      name: customer.name,
      reason: "has_invoices",
      invoiceCount: customer.invoices.length,
    });

    return successResponse({ id, action: "deactivated", isActive: false });
  }

  await prisma.customerAccount.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } });

  await logAudit(currentUser.userId, "DELETE", "Customer", id, {
    name: customer.name,
    wasPermanent: true,
  });

  return successResponse({ id, action: "deleted" });
}
