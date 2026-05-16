import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, checkPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

const customerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  customerType: z
    .enum(["INDIVIDUAL", "MARKET", "WHOLESALE", "AGENT", "ONLINE"])
    .optional(),
  customerCategoryId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  openingBalanceIqd: z.number().optional(),
  openingBalanceUsd: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { accounts: true, customerCategory: true },
  });
  if (!customer) return notFoundError();

  return successResponse({
    id: customer.id,
    name: customer.name,
    code: customer.code,
    phone: customer.phone,
    whatsapp: customer.whatsapp,
    address: customer.address,
    governorate: customer.governorate,
    customerType: customer.customerType,
    customerCategoryId: customer.customerCategoryId,
    customerCategoryName: customer.customerCategory?.name || null,
    isActive: customer.isActive,
    notes: customer.notes,
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

  if (!checkPermission(currentUser, PERMISSIONS.CUSTOMERS_EDIT)) {
    return forbiddenError("لا تملك صلاحية تعديل عميل");
  }

  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  try {
    const body = await request.json();
    const parsed = customerSchema.parse(body);

    const { openingBalanceIqd, openingBalanceUsd, ...customerData } = parsed;

    const updateData: Record<string, unknown> = { ...customerData };
    if (parsed.customerCategoryId !== undefined) {
      updateData.customerCategoryId = parsed.customerCategoryId || null;
    }

    const accountUpdates: {
      currency: string;
      balance: number;
    }[] = [];
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

    try {
      await logAudit(currentUser.userId, "UPDATE", "Customer", id, {
        name: customer.name,
      });
    } catch {
      console.error("Audit log failed for customer update");
    }

    return successResponse({
      id: customer.id,
      name: customer.name,
      code: customer.code,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      address: customer.address,
      governorate: customer.governorate,
      customerType: customer.customerType,
      customerCategoryId: customer.customerCategoryId,
      customerCategoryName: customer.customerCategory?.name || null,
      isActive: customer.isActive,
      notes: customer.notes,
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

  if (!checkPermission(currentUser, PERMISSIONS.CUSTOMERS_DELETE)) {
    return forbiddenError("لا تملك صلاحية حذف عميل");
  }

  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { invoices: true },
    });
    if (!customer) return notFoundError();

    if (customer.invoices.length > 0) {
      return conflictError(
        "لا يمكن حذف هذا العميل نهائياً لأنه مستخدم في فواتير. يمكنك تعطيله فقط.",
      );
    }

    await prisma.customerAccount.deleteMany({ where: { customerId: id } });
    await prisma.customer.delete({ where: { id } });

    try {
      await logAudit(currentUser.userId, "DELETE", "Customer", id, {
        name: customer.name,
      });
    } catch {
      console.error("Audit log failed for customer delete");
    }

    return successResponse({ id });
  } catch (error) {
    console.error("Delete customer error:", error);
    return errorResponse("فشل حذف العميل", 500);
  }
}
