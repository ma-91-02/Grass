import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, checkPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
  forbiddenError,
} from "@/lib/api-response";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

const supplierSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
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
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { accounts: true },
  });
  if (!supplier) return notFoundError();

  return successResponse({
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    phone: supplier.phone,
    address: supplier.address,
    governorate: supplier.governorate,
    notes: supplier.notes,
    isActive: supplier.isActive,
    accounts: supplier.accounts.map((a) => ({
      id: a.id,
      supplierId: a.supplierId,
      currency: a.currency,
      balance: Number(a.balance),
    })),
    createdAt: supplier.createdAt,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!checkPermission(currentUser, PERMISSIONS.SUPPLIERS_EDIT)) {
    return forbiddenError("لا تملك صلاحية تعديل مورد");
  }

  const { id } = await params;
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  try {
    const body = await request.json();
    const parsed = supplierSchema.parse(body);

    const { openingBalanceIqd, openingBalanceUsd, ...supplierData } = parsed;

    const accountUpdates: { currency: string; balance: number }[] = [];
    if (openingBalanceIqd !== undefined) {
      accountUpdates.push({ currency: "IQD", balance: openingBalanceIqd });
    }
    if (openingBalanceUsd !== undefined) {
      accountUpdates.push({ currency: "USD", balance: openingBalanceUsd });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...supplierData,
        ...(accountUpdates.length > 0
          ? {
              accounts: {
                upsert: accountUpdates.map((a) => ({
                  where: {
                    supplierId_currency: {
                      supplierId: id,
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
      include: { accounts: true },
    });

    try {
      await logAudit(currentUser.userId, "UPDATE", "Supplier", id, {
        name: supplier.name,
      });
    } catch {
      console.error("Audit log failed for supplier update");
    }

    return successResponse({
      id: supplier.id,
      name: supplier.name,
      code: supplier.code,
      phone: supplier.phone,
      address: supplier.address,
      governorate: supplier.governorate,
      notes: supplier.notes,
      isActive: supplier.isActive,
      accounts: supplier.accounts.map((a) => ({
        id: a.id,
        supplierId: a.supplierId,
        currency: a.currency,
        balance: Number(a.balance),
      })),
      createdAt: supplier.createdAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث المورد", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!checkPermission(currentUser, PERMISSIONS.SUPPLIERS_DELETE)) {
    return forbiddenError("لا تملك صلاحية حذف مورد");
  }

  try {
    const { id } = await params;

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return notFoundError();

    // Check if supplier is used in any purchases (future)
    // For now, no relations exist besides accounts

    await prisma.supplierAccount.deleteMany({ where: { supplierId: id } });
    await prisma.supplier.delete({ where: { id } });

    try {
      await logAudit(currentUser.userId, "DELETE", "Supplier", id, {
        name: supplier.name,
      });
    } catch {
      console.error("Audit log failed for supplier delete");
    }

    return successResponse({ id });
  } catch (error) {
    console.error("Delete supplier error:", error);
    return errorResponse("فشل حذف المورد", 500);
  }
}
