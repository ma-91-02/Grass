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

const supplierSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  openingBalanceIqd: z.number().optional().default(0),
  openingBalanceUsd: z.number().optional().default(0),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();

    const suppliers = await prisma.supplier.findMany({
      include: { accounts: true },
      orderBy: { createdAt: "desc" },
    });

    const data = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      phone: s.phone,
      address: s.address,
      governorate: s.governorate,
      notes: s.notes,
      isActive: s.isActive,
      accounts: s.accounts.map((a) => ({
        id: a.id,
        supplierId: a.supplierId,
        currency: a.currency,
        balance: Number(a.balance),
      })),
      createdAt: s.createdAt,
    }));

    return successResponse(data);
  } catch (error) {
    console.error("GET suppliers error:", error);
    return errorResponse("فشل تحميل الموردين", 500);
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!checkPermission(currentUser, PERMISSIONS.SUPPLIERS_CREATE)) {
    return forbiddenError("لا تملك صلاحية إنشاء مورد");
  }

  try {
    const body = await request.json();
    const parsed = supplierSchema.parse(body);

    const count = await prisma.supplier.count();
    const code = `SUP-${String(count + 1).padStart(5, "0")}`;

    const supplier = await prisma.supplier.create({
      data: {
        name: parsed.name,
        code,
        phone: parsed.phone || null,
        address: parsed.address || null,
        governorate: parsed.governorate || null,
        notes: parsed.notes || null,
        createdById: currentUser.userId,
        accounts: {
          create: [
            { currency: "IQD", balance: parsed.openingBalanceIqd || 0 },
            { currency: "USD", balance: parsed.openingBalanceUsd || 0 },
          ],
        },
      },
      include: { accounts: true },
    });

    try {
      await logAudit(currentUser.userId, "CREATE", "Supplier", supplier.id, {
        name: supplier.name,
      });
    } catch {
      console.error("Audit log failed for supplier create");
    }

    return successResponse(
      {
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
      },
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create supplier error:", error);
    return errorResponse("فشل إنشاء المورد", 500);
  }
}
