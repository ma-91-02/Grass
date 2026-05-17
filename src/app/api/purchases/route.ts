import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, logAudit, checkDbPermission } from "@/lib/auth";
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
  currency: z.enum(["USD", "IQD"] as const).default("IQD"),
  amountInInvoiceCurrency: z.coerce.number().min(0).default(0),
});

const purchaseSchema = z.object({
  supplierInvoiceNumber: z.string().optional().nullable(),
  purchaseDate: z.string().optional(),
  currency: z.enum(["USD", "IQD"] as const),
  exchangeRateValue: z.coerce.number().min(0).default(0),
  supplierId: z.string().min(1, "المورد مطلوب"),
  warehouseId: z.string().min(1, "المخزن مطلوب"),
  notes: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "CREDIT"] as const).default("CASH"),
  paid: z.coerce.number().min(0).default(0),
  paymentAccountId: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, "يجب إضافة مادة واحدة على الأقل"),
  expenses: z.array(purchaseExpenseSchema).default([]),
});

function convertExpense(
  amount: number,
  expenseCurrency: string,
  invoiceCurrency: string,
  exchangeRate: number,
): number {
  if (expenseCurrency === invoiceCurrency) return amount;
  const rate = exchangeRate || 0;
  if (expenseCurrency === "USD") return amount * rate;
  return rate > 0 ? amount / rate : 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatInvoiceResponse(invoice: Record<string, any>) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    supplierInvoiceNumber: invoice.supplierInvoiceNumber,
    purchaseDate: invoice.purchaseDate,
    currency: invoice.currency,
    exchangeRateValue: Number(invoice.exchangeRateValue),
    supplierId: invoice.supplierId,
    supplierName: invoice.supplier?.name || null,
    warehouseId: invoice.warehouseId,
    warehouseName: invoice.warehouse?.name || null,
    notes: invoice.notes,
    subtotal: Number(invoice.subtotal) || 0,
    totalExpenses: Number(invoice.totalExpenses) || 0,
    totalCost: Number(invoice.totalCost) || 0,
    paymentMethod: invoice.paymentMethod,
    paid: Number(invoice.paid) || 0,
    remaining: Number(invoice.remaining) || 0,
    paymentAccountId: invoice.paymentAccountId,
    paymentAccountName: invoice.paymentAccount?.name || null,
    status: invoice.status,
    items: (invoice.items || []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      purchaseInvoiceId: item.purchaseInvoiceId as string,
      productId: item.productId as string | null,
      productName: (item.productName as string) || "",
      productCode: (item.productCode as string) || "",
      quantity: (item.quantity as number) || 0,
      purchasePrice: Number(item.purchasePrice) || 0,
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      totalPrice: Number(item.totalPrice) || 0,
      expenseShare: Number(item.expenseShare) || 0,
      finalCost: Number(item.finalCost) || 0,
      unitFinalCost: Number(item.unitFinalCost) || 0,
    })),
    expenses: (invoice.expenses || []).map((exp: Record<string, unknown>) => ({
      id: exp.id as string,
      purchaseInvoiceId: exp.purchaseInvoiceId as string,
      name: (exp.name as string) || "",
      amount: Number(exp.amount) || 0,
      currency: (exp.currency as string) || "IQD",
      amountInInvoiceCurrency: Number(exp.amountInInvoiceCurrency) || 0,
    })),
    createdById: invoice.createdById,
    createdAt: invoice.createdAt,
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorizedError();
    if (!(await checkDbPermission(user.userId, PERMISSIONS.PURCHASES_VIEW))) {
      return forbiddenError("لا تملك صلاحية عرض فواتير المشتريات");
    }

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

    return successResponse(invoices.map(formatInvoiceResponse));
  } catch (error) {
    console.error("GET purchases error:", error);
    return errorResponse("فشل تحميل فواتير المشتريات", 500);
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await checkDbPermission(currentUser.userId, PERMISSIONS.PURCHASES_CREATE))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء فاتورة مشتريات");
  }

  try {
    const body = await request.json();
    const parsed = purchaseSchema.parse(body);
    const errors: string[] = [];

    if (
      parsed.paymentMethod !== "CREDIT" &&
      parsed.paid > 0 &&
      !parsed.paymentAccountId
    ) {
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

    const subtotal = parsed.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );

    const computedExpenses = parsed.expenses.map((exp) => ({
      ...exp,
      amountInInvoiceCurrency: convertExpense(
        exp.amount,
        exp.currency,
        parsed.currency,
        parsed.exchangeRateValue,
      ),
    }));

    const totalExpensesInInvoiceCurrency = computedExpenses.reduce(
      (sum, exp) => sum + exp.amountInInvoiceCurrency,
      0,
    );

    const totalCost = subtotal + totalExpensesInInvoiceCurrency;
    const remaining = totalCost - parsed.paid;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber,
          supplierInvoiceNumber: parsed.supplierInvoiceNumber || null,
          purchaseDate: parsed.purchaseDate
            ? new Date(parsed.purchaseDate)
            : new Date(),
          currency: parsed.currency,
          exchangeRateValue: parsed.exchangeRateValue,
          supplierId: parsed.supplierId,
          warehouseId: parsed.warehouseId,
          notes: parsed.notes || null,
          subtotal,
          totalExpenses: totalExpensesInInvoiceCurrency,
          totalCost,
          paymentMethod: parsed.paymentMethod,
          paid: parsed.paid,
          remaining,
          paymentAccountId: parsed.paymentAccountId || null,
          status: "COMPLETED",
          createdById: currentUser.userId,
          items: {
            create: parsed.items.map((item) => {
              const expenseShare =
                subtotal > 0
                  ? (item.totalPrice / subtotal) *
                    totalExpensesInInvoiceCurrency
                  : 0;
              const finalCost = item.totalPrice + expenseShare;
              const unitFinalCost =
                item.quantity > 0 ? finalCost / item.quantity : 0;

              return {
                productId: item.productId,
                productName: item.productName,
                productCode: item.productCode,
                quantity: item.quantity,
                purchasePrice: item.purchasePrice,
                productionDate: item.productionDate
                  ? new Date(item.productionDate)
                  : null,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                totalPrice: item.totalPrice,
                expenseShare,
                finalCost,
                unitFinalCost,
              };
            }),
          },
          expenses: {
            create: computedExpenses.map((exp) => ({
              name: exp.name,
              amount: exp.amount,
              currency: exp.currency,
              amountInInvoiceCurrency: exp.amountInInvoiceCurrency,
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
        if (
          product &&
          Number(item.purchasePrice) > Number(product.purchasePrice)
        ) {
          await tx.product.update({
            where: { id: item.productId },
            data: { purchasePrice: item.purchasePrice },
          });
        }
      }

      if (
        parsed.paymentMethod !== "CREDIT" &&
        parsed.paid > 0 &&
        parsed.paymentAccountId
      ) {
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
      await logAudit(
        currentUser.userId,
        "CREATE",
        "PurchaseInvoice",
        result.id,
        { invoiceNumber: result.invoiceNumber },
      );
    } catch {
      console.error("Audit log failed for purchase invoice create");
    }

    return successResponse(formatInvoiceResponse(result), 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "));
    }
    console.error("Create purchase invoice error:", error);
    return errorResponse("فشل إنشاء فاتورة المشتريات", 500);
  }
}
