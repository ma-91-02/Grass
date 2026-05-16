import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
} from "@/lib/api-response";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  customerType: z.enum([
    "INDIVIDUAL",
    "MARKET",
    "WHOLESALE",
    "AGENT",
    "ONLINE",
  ]),
  creditLimit: z.number().optional().default(0),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return successResponse(customers);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  try {
    const body = await request.json();
    const parsed = customerSchema.parse(body);

    const count = await prisma.customer.count();
    const code = `CUS-${String(count + 1).padStart(5, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        ...parsed,
        code,
        createdById: currentUser.userId,
      },
    });

    await logAudit(currentUser.userId, "CREATE", "Customer", customer.id, {
      name: customer.name,
    });

    return successResponse(customer, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create customer error:", error);
    return errorResponse("فشل إنشاء العميل", 500);
  }
}
