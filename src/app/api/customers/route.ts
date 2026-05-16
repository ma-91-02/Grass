import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, checkPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

const customerSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  customerType: z.enum([
    "INDIVIDUAL",
    "MARKET",
    "WHOLESALE",
    "AGENT",
    "ONLINE",
  ]),
  customerCategoryId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  openingBalanceIqd: z.number().optional().default(0),
  openingBalanceUsd: z.number().optional().default(0),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();

    const customers = await prisma.customer.findMany({
      include: {
        customerCategory: true,
        accounts: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const data = customers.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      phone: c.phone,
      whatsapp: c.whatsapp,
      address: c.address,
      governorate: c.governorate,
      customerType: c.customerType,
      customerCategoryId: c.customerCategoryId,
      customerCategoryName: c.customerCategory?.name || null,
      isActive: c.isActive,
      notes: c.notes,
      accounts: c.accounts.map((a) => ({
        id: a.id,
        customerId: a.customerId,
        currency: a.currency,
        balance: Number(a.balance),
      })),
      createdAt: c.createdAt,
    }));

    return successResponse(data);
  } catch (error) {
    console.error("GET customers error:", error);
    return errorResponse("فشل تحميل العملاء", 500);
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!checkPermission(currentUser, PERMISSIONS.CUSTOMERS_CREATE)) {
    return forbiddenError("لا تملك صلاحية إنشاء عميل");
  }

  try {
    const body = await request.json();
    const parsed = customerSchema.parse(body);

    const count = await prisma.customer.count();
    const code = `CUS-${String(count + 1).padStart(5, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        name: parsed.name,
        code,
        phone: parsed.phone || null,
        whatsapp: parsed.whatsapp || null,
        address: parsed.address || null,
        governorate: parsed.governorate || null,
        customerType: parsed.customerType,
        customerCategoryId: parsed.customerCategoryId || null,
        notes: parsed.notes || null,
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

    try {
      await logAudit(currentUser.userId, "CREATE", "Customer", customer.id, {
        name: customer.name,
      });
    } catch {
      console.error("Audit log failed for customer create");
    }

    return successResponse(
      {
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
