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
  forbiddenError,
  conflictError,
} from "@/lib/api-response";
import { customerFormSchema } from "@/lib/schemas";
import { PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  if (!(await requireDbPermission(user.userId, PERMISSIONS.CUSTOMERS_VIEW)))
    return forbiddenError();

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get("companyId");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { companyId: true },
  });

  const isGlobalAdmin = await canAccessCompany(user, "any");

  const whereClause: Record<string, unknown> = {};

  if (companyId) {
    if (!(await canAccessCompany(user, companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }
    whereClause.companyId = companyId;
  } else if (!isGlobalAdmin && dbUser?.companyId) {
    whereClause.companyId = dbUser.companyId;
  }

  const customers = await prisma.customer.findMany({
    where: whereClause,
    include: {
      customerCategory: true,
      accounts: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const data = customers.map((c) => ({
    id: c.id,
    companyId: c.companyId,
    name: c.name,
    code: c.code,
    phone: c.phone,
    whatsapp: c.whatsapp,
    email: c.email,
    address: c.address,
    governorate: c.governorate,
    customerType: c.customerType,
    customerCategoryId: c.customerCategoryId,
    customerCategoryName: c.customerCategory?.name || null,
    isActive: c.isActive,
    notes: c.notes,
    creditLimit: Number(c.creditLimit ?? 0),
    currentBalance: Number(c.currentBalance ?? 0),
    currency: c.currency,
    accounts: c.accounts.map((a) => ({
      id: a.id,
      customerId: a.customerId,
      currency: a.currency,
      balance: Number(a.balance),
    })),
    createdAt: c.createdAt,
  }));

  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.CUSTOMERS_CREATE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء عميل");
  }

  try {
    const body = await request.json();
    const parsed = customerFormSchema.parse(body);

    if (!(await canAccessCompany(currentUser, parsed.companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Duplicate code check per company
    const existingCode = await prisma.customer.findFirst({
      where: { companyId: parsed.companyId, code: parsed.code },
    });
    if (existingCode) {
      return conflictError("كود العميل مستخدم مسبقاً في هذه الشركة");
    }

    const customer = await prisma.customer.create({
      data: {
        companyId: parsed.companyId,
        code: parsed.code,
        name: parsed.name,
        phone: parsed.phone || null,
        whatsapp: parsed.whatsapp || null,
        email: parsed.email || null,
        address: parsed.address || null,
        governorate: parsed.governorate || null,
        customerType: parsed.customerType,
        customerCategoryId: parsed.customerCategoryId || null,
        notes: parsed.notes || null,
        creditLimit: parsed.creditLimit ?? 0,
        createdById: currentUser.userId,
        accounts: {
          create: [
            {
              currency: "IQD",
              balance: parsed.openingBalanceIqd || 0,
            },
            {
              currency: "USD",
              balance: parsed.openingBalanceUsd || 0,
            },
          ],
        },
      },
      include: { accounts: true, customerCategory: true },
    });

    await logAudit(currentUser.userId, "CREATE", "Customer", customer.id, {
      name: customer.name,
      code: customer.code,
      companyId: customer.companyId,
    });

    return successResponse(
      {
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
      },
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create customer error:", error);
    return errorResponse("فشل إنشاء العميل", 500);
  }
}
