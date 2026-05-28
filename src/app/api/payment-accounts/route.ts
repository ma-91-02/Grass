import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireDbPermission } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
} from "@/lib/api-response";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/permissions";

const accountSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  type: z.enum(["CASH", "BANK"] as const).default("CASH"),
  currency: z.enum(["USD", "IQD"] as const).default("IQD"),
  balance: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();

    const accounts = await prisma.paymentAccount.findMany({
      orderBy: { name: "asc" },
    });

    const data = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      balance: Number(a.balance),
      isActive: a.isActive,
    }));

    return successResponse(data);
  } catch (error) {
    console.error("GET payment accounts error:", error);
    return errorResponse("فشل تحميل حسابات التسديد", 500);
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!(await requireDbPermission(currentUser.userId, PERMISSIONS.PAYMENT_ACCOUNTS_MANAGE))) {
    return forbiddenError("لا تملك صلاحية إدارة حسابات التسديد");
  }

  try {
    const body = await request.json();
    const parsed = accountSchema.parse(body);

    const existing = await prisma.paymentAccount.findUnique({
      where: { name: parsed.name },
    });
    if (existing) {
      return errorResponse("حساب التسديد موجود مسبقاً", 409);
    }

    const account = await prisma.paymentAccount.create({
      data: parsed,
    });

    return successResponse(
      {
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        balance: Number(account.balance),
        isActive: account.isActive,
      },
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create payment account error:", error);
    return errorResponse("فشل إنشاء حساب التسديد", 500);
  }
}
