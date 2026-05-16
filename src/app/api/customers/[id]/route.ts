import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  notFoundError,
} from "@/lib/api-response";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  customerType: z
    .enum(["INDIVIDUAL", "MARKET", "WHOLESALE", "AGENT", "ONLINE"])
    .optional(),
  isActive: z.boolean().optional(),
  creditLimit: z.number().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return notFoundError();

  return successResponse(customer);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  const { id } = await params;
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return notFoundError();

  try {
    const body = await request.json();
    const parsed = customerSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: parsed,
    });

    await logAudit(currentUser.userId, "UPDATE", "Customer", id, {
      name: customer.name,
    });

    return successResponse(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    return errorResponse("فشل تحديث العميل", 500);
  }
}
