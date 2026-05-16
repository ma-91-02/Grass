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

const purchaseItemSchema = z.object({
  productId: z.string().min(1, "المادة مطلوبة"),
  productName: z.string().min(1),
  productCode: z.string().min(1),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون 1 على الأقل"),
  purchasePrice: z.coerce.number().min(0, "سعر الشراء يجب أن يكون 0 أو أكثر"),
  productionDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  totalPrice: z.coerce.number().default(0),
});

const purchaseExpenseSchema = z.object({
  name: z.string().min(1, "اسم المصروف مطلوب"),
  amount: z.coerce.number().min(0, "المبلغ يجب أن يكون 0 أو أكثر"),
});

const purchaseSchema = z.object({
  supplierInvoiceNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional(),
  currency: z.enum(["USD", "IQD"] as const),
  exchangeRateValue: z.coerce.number().min(0).default(0),
  supplierId: z.string().min(1, "المورد مطلوب"),
  warehouseId: z.string().min(1, "المخزن مطلوب"),
  notes: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "BANK", "CREDIT"] as const).default("CASH"),
  paid: z.coerce.number().min(0).default(0),
  paymentAccountId: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, "يجب إضافة مادة واحدة على الأقل"),
  expenses: z.array(purchaseExpenseSchema).default([]),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  const invoices = await prisma.purchaseInvoice.findMany({
    include: {
      supplier: { select: { name: true } },
      warehouse: { select: { name: true } },
      paymentAccount: { select: { name: true } },
      items: true,
      expenses: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const data = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    supplierInvoiceNumber: inv.supplierInvoiceNumber,
    purchaseDate: inv.purchaseDate,
    currency: inv.currency,
    exchangeRateValue: Number(inv.exchangeRateValue),
    supplierId: inv.supplierId,
    supplierName: inv.supplier?.name || null,
    warehouseId: inv.warehouseId,
    warehouseName: inv.warehouse?.name || null,
    notes: inv.notes,
    subtotal: Number(inv.subtotal),
    totalExpenses: Number(inv.totalExpenses),
    totalCost: Number(inv.totalCost),
    paymentMethod: inv.paymentMethod,
    paid: Number(inv.paid),
    remaining: Number(inv.remaining),
    paymentAccountId: inv.paymentAccountId,
    paymentAccountName: inv.paymentAccount?.name || null,
    status: inv.status,
    items: inv.items.map((item) => ({
      id: item.id,
      purchaseInvoiceId: item.purchaseInvoiceId,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.quantity,
      purchasePrice: Number(item.purchasePrice),
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      totalPrice: Number(item.totalPrice),
    })),
    expenses: inv.expenses.map((exp) => ({
      id: exp.id,
      purchaseInvoiceId: exp.purchaseInvoiceId,
      name: exp.name,
      amount: Number(exp.amount),
    })),
    createdById: inv.createdById,
    createdAt: inv.createdAt,
  }));

  return successResponse(data);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (!checkPermission(currentUser, PERMISSIONS.PURCHASES_CREATE)) {
    return forbiddenError("لا تملك صلاحية إنشاء فاتورة مشتريات");
  }

  try {
    const body = await request.json();
    const parsed = purchaseSchema.parse(body);
    const errors: string[] = [];

    if (parsed.paymentMethod !== "CREDIT" && parsed.paid > 0 && !parsed.paymentAccountId) {
      errors.push("يجب اختيار حساب التسديد عند الدفع");
    }

    if (parsed.paymentMethod === "CREDIT" && parsed.paid > 0) {
      errors.push("الدفع على الحساب لا يمكن أن يكون له مبلغ مدفوع");
    }

    if (errors.length > 0) {
      return errorResponse(errors.join("، "));
    }

    const count = await prisma.purchaseInvoice.count();
    const invoiceNumber = `PI-${String(count + 1).padStart(6, "0")}`;

    const subtotal = parsed.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalExpenses = parsed.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalCost = subtotal + totalExpenses;
    const remaining = totalCost - parsed.paid;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber,
          supplierInvoiceNumber: parsed.supplierInvoiceNumber || null,
          purchaseDate: parsed.purchaseDate ? new Date(parsed.purchaseDate) : new Date(),
          currency: parsed.currency,
          exchangeRateValue: parsed.exchangeRateValue,
          supplierId: parsed.supplierId,
          warehouseId: parsed.warehouseId,
          notes: parsed.notes || null,
          subtotal,
          totalExpenses,
          totalCost,
          paymentMethod: parsed.paymentMethod,
          paid: parsed.paid,
          remaining,
          paymentAccountId: parsed.paymentAccountId || null,
          status: "COMPLETED",
          createdById: currentUser.userId,
          items: {
            create: parsed.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productCode: item.productCode,
              quantity: item.quantity,
              purchasePrice: item.purchasePrice,
              productionDate: item.productionDate ? new Date(item.productionDate) : null,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              totalPrice: item.totalPrice,
            })),
          },
          expenses: {
            create: parsed.expenses.map((exp) => ({
              name: exp.name,
              amount: exp.amount,
            })),
          },
        },
        include: {
          items: true,
          expenses: true,
          supplier: { select: { name: true } },
          warehouse: { select: { name: true } },
          paymentAccount: { select: { name: true } },
        },
      });

      for (const item of parsed.items) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId: parsed.warehouseId,
            type: "IN",
            quantity: item.quantity,
            referenceType: "PURCHASE_INVOICE",
            referenceId: invoice.id,
          },
        });
      }

      for (const item of parsed.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { purchasePrice: true },
        });
        if (product && Number(item.purchasePrice) > Number(product.purchasePrice)) {
          await tx.product.update({
            where: { id: item.productId },
            data: { purchasePrice: item.purchasePrice },
          });
        }
      }

      if (parsed.paymentMethod !== "CREDIT" && parsed.paid > 0 && parsed.paymentAccountId) {
        const account = await tx.paymentAccount.findUnique({
          where: { id: parsed.paymentAccountId },
        });
        if (account) {
          const newBalance = Number(account.balance) + parsed.paid;
          await tx.paymentAccount.update({
            where: { id: parsed.paymentAccountId },
            data: { balance: newBalance },
          });
        }
      }

      return invoice;
    });

    try {
      await logAudit(currentUser.userId, "CREATE", "PurchaseInvoice", result.id, {
        invoiceNumber: result.invoiceNumber,
      });
    } catch {
      console.error("Audit log failed for purchase invoice create");
    }

    return successResponse({
      id: result.id,
      invoiceNumber: result.invoiceNumber,
      supplierInvoiceNumber: result.supplierInvoiceNumber,
      purchaseDate: result.purchaseDate,
      currency: result.currency,
      exchangeRateValue: Number(result.exchangeRateValue),
      supplierId: result.supplierId,
      supplierName: result.supplier?.name || null,
      warehouseId: result.warehouseId,
      warehouseName: result.warehouse?.name || null,
      notes: result.notes,
      subtotal: Number(result.subtotal),
      totalExpenses: Number(result.totalExpenses),
      totalCost: Number(result.totalCost),
      paymentMethod: result.paymentMethod,
      paid: Number(result.paid),
      remaining: Number(result.remaining),
      paymentAccountId: result.paymentAccountId,
      paymentAccountName: result.paymentAccount?.name || null,
      status: result.status,
      items: result.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        quantity: item.quantity,
        purchasePrice: Number(item.purchasePrice),
        productionDate: item.productionDate,
        expiryDate: item.expiryDate,
        totalPrice: Number(item.totalPrice),
      })),
      expenses: result.expenses.map((exp) => ({
        id: exp.id,
        name: exp.name,
        amount: Number(exp.amount),
      })),
      createdAt: result.createdAt,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create purchase invoice error:", error);
    return errorResponse("فشل إنشاء فاتورة المشتريات", 500);
  }
}
