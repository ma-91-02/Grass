import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { LedgerValidator } from "@/lib/services/ledger-validator";
import { PeriodGuard } from "@/lib/services/period-guard";
import { CurrencyGuard } from "@/lib/services/currency-guard";
import { ACCOUNT_CODES } from "@/lib/account-codes";
import { z } from "zod";

const paymentSchema = z.object({
  supplierId: z.string().min(1, "المورد مطلوب"),
  purchaseInvoiceId: z.string().optional().nullable(),
  paymentAccountId: z.string().optional().nullable(),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  currency: z.enum(["IQD", "USD"]).default("IQD"),
  paymentDate: z.string().refine((d) => !isNaN(Date.parse(d)), "تاريخ غير صحيح"),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (!(await requireDbPermission(user.userId, PERMISSIONS.PAYMENTS_VIEW))) {
    return forbiddenError("لا تملك صلاحية عرض المدفوعات");
  }

  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId");
  const companyId = searchParams.get("companyId");
  const purchaseInvoiceId = searchParams.get("purchaseInvoiceId");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const search = searchParams.get("search");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  let page = parseInt(pageParam || "1", 10);
  let limit = parseInt(limitParam || "20", 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const where: Record<string, unknown> = {};

  if (supplierId) {
    where.supplierId = supplierId;
  }

  if (purchaseInvoiceId) {
    where.purchaseInvoiceId = purchaseInvoiceId;
  }

  if (companyId) {
    if (!(await canAccessCompany(user, companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }
    where.companyId = companyId;
  } else {
    const userRecord = await prisma.user.findUnique({
      where: { id: user.userId },
    });
    if (userRecord?.companyId) {
      where.companyId = userRecord.companyId;
    }
  }

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;
  if (fromDate && toDate) {
    where.paymentDate = { gte: fromDate, lte: toDate };
  } else if (fromDate) {
    where.paymentDate = { gte: fromDate };
  } else if (toDate) {
    where.paymentDate = { lte: toDate };
  }

  if (search) {
    where.OR = [
      {
        supplier: {
          name: { contains: search, mode: "insensitive" },
        },
      },
      {
        purchaseInvoice: {
          invoiceNumber: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    prisma.supplierPayment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      skip,
      take: limit,
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        purchaseInvoice: {
          select: { id: true, invoiceNumber: true, remaining: true },
        },
        paymentAccount: { select: { id: true, name: true } },
      },
    }),
    prisma.supplierPayment.count({ where }),
  ]);

  const data = payments.map((p) => ({
    id: p.id,
    supplierId: p.supplierId,
    supplierName: p.supplier?.name,
    supplierCode: p.supplier?.code,
    purchaseInvoiceId: p.purchaseInvoiceId,
    invoiceNumber: p.purchaseInvoice?.invoiceNumber,
    paymentAccountId: p.paymentAccountId,
    paymentAccountName: p.paymentAccount?.name,
    amount: Number(p.amount),
    currency: p.currency,
    paymentDate: p.paymentDate,
    notes: p.notes,
    createdAt: p.createdAt,
  }));

  return successResponse({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary: {
      totalPayments: total,
      totalAmount: data.reduce((sum, p) => sum + p.amount, 0),
    },
  });
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(currentUser.userId, PERMISSIONS.PAYMENTS_CREATE))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء مدفوعات");
  }

  try {
    const body = await request.json();
    const parsed = paymentSchema.parse(body);

    const {
      supplierId,
      purchaseInvoiceId,
      paymentAccountId,
      amount,
      currency,
      paymentDate,
      notes,
    } = parsed;

    const paymentDateObj = new Date(paymentDate);

    // Load supplier
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) return notFoundError("المورد غير موجود");
    if (!supplier.isActive) return errorResponse("المورد غير نشط", 400);

    if (
      supplier.companyId &&
      !(await canAccessCompany(currentUser, supplier.companyId))
    ) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }

    // Validate payment account if provided
    if (paymentAccountId) {
      const paymentAccount = await prisma.paymentAccount.findUnique({
        where: { id: paymentAccountId },
      });
      if (!paymentAccount) return notFoundError("حساب الدفع غير موجود");
      if (!paymentAccount.isActive)
        return errorResponse("حساب الدفع غير نشط", 400);
      if (paymentAccount.currency !== currency) {
        return conflictError("عملة حساب الدفع لا تطابق عملة الدفع");
      }
    }

    // Validate purchase invoice if provided
    let invoice = null;
    if (purchaseInvoiceId) {
      invoice = await prisma.purchaseInvoice.findUnique({
        where: { id: purchaseInvoiceId },
      });
      if (!invoice) return notFoundError("فاتورة الشراء غير موجودة");
      if (invoice.supplierId !== supplierId) {
        return conflictError("الفاتورة لا تنتمي لهذا المورد");
      }
      if (Number(invoice.remaining) <= 0) {
        return errorResponse("الفاتورة مسددة بالكامل", 400);
      }
      if (invoice.currency !== currency) {
        return conflictError("عملة الفاتورة لا تطابق عملة الدفع");
      }
      if (amount > Number(invoice.remaining)) {
        return errorResponse(
          `مبلغ الدفع (${amount}) يتجاوز المتبقي (${Number(invoice.remaining)})`,
          400,
        );
      }
    }

    if (!supplier.companyId) {
      return errorResponse("المورد لا ينتمي لأي شركة", 400);
    }

    // Check fiscal period
    const periodCheck = await PeriodGuard.checkPeriodOpen(
      supplier.companyId,
      paymentDateObj,
      undefined,
    );
    if (!periodCheck.allowed) {
      return errorResponse(periodCheck.error!, 423);
    }

    // Load system accounts
    const cashCode =
      currency === "USD" ? ACCOUNT_CODES.CASH_USD : ACCOUNT_CODES.CASH_IQD;
    const apCode =
      currency === "USD" ? ACCOUNT_CODES.AP_USD : ACCOUNT_CODES.AP_IQD;

    const [cashAccount, apAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { companyId: supplier.companyId, code: cashCode },
      }),
      prisma.account.findFirst({
        where: { companyId: supplier.companyId, code: apCode },
      }),
    ]);

    if (!cashAccount) {
      return errorResponse("حساب الصندوق غير موجود في شجرة الحسابات", 500);
    }
    if (!apAccount) {
      return errorResponse(
        "حساب الذمم الدائنة غير موجود في شجرة الحسابات",
        500,
      );
    }

    if (!cashAccount.isActive || !apAccount.isActive) {
      return errorResponse("أحد الحسابات المطلوبة غير نشط", 400);
    }
    if (!cashAccount.isPosting || !apAccount.isPosting) {
      return errorResponse("أحد الحسابات المطلوبة ليس حساب ترحيل", 400);
    }

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Lock supplier
      await tx.$queryRaw`SELECT id FROM "Supplier" WHERE id = ${supplierId} FOR UPDATE`;

      let lockedInvoice = null;
      if (purchaseInvoiceId) {
        await tx.$queryRaw`SELECT id FROM "PurchaseInvoice" WHERE id = ${purchaseInvoiceId} FOR UPDATE`;
        lockedInvoice = await tx.purchaseInvoice.findUnique({
          where: { id: purchaseInvoiceId },
        });
        if (!lockedInvoice) throw new Error("فاتورة الشراء غير موجودة");
        if (Number(lockedInvoice.remaining) <= 0) {
          throw new Error("الفاتورة مسددة بالكامل");
        }
        if (amount > Number(lockedInvoice.remaining)) {
          throw new Error("مبلغ الدفع يتجاوز المتبقي");
        }
      }

      // Generate journal entry number
      const jeCount = await tx.journalEntry.count({
        where: { companyId: supplier.companyId || undefined },
      });
      const entryNumber = `JE-${String(jeCount + 1).padStart(5, "0")}`;

      // Journal lines: Dr AP, Cr Cash/Bank
      const journalLines = [
        {
          accountId: apAccount.id,
          debit: amount,
          credit: 0,
          description: notes || `دفع للمورد ${supplier.name}`,
        },
        {
          accountId: cashAccount.id,
          debit: 0,
          credit: amount,
          description: notes || `دفع للمورد ${supplier.name}`,
        },
      ];

      const validation = LedgerValidator.validateLines(journalLines);
      if (!validation.valid) {
        throw new Error(
          `قيد الدفع غير متوازن: ${validation.errors.join(" | ")}`,
        );
      }

      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId: supplier.companyId!,
          entryNumber,
          entryDate: paymentDateObj,
          currency,
          exchangeRateSnapshot: 1,
          description: notes || `دفع للمورد ${supplier.name}`,
          sourceType: "SupplierPayment",
          sourceId: "",
          status: "POSTED",
          postedAt: new Date(),
          createdById: currentUser.userId,
          lines: {
            create: journalLines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
        include: { lines: true },
      });

      // Update purchase invoice if specified
      let updatedInvoice = null;
      if (lockedInvoice) {
        const newPaid = Number(lockedInvoice.paid) + amount;
        const newRemaining = Number(lockedInvoice.remaining) - amount;

        if (newRemaining < 0) {
          throw new Error("المتبقي لا يمكن أن يصبح سالباً");
        }

        updatedInvoice = await tx.purchaseInvoice.update({
          where: { id: purchaseInvoiceId! },
          data: {
            paid: newPaid,
            remaining: newRemaining,
          },
        });
      }

      // Create payment record
      const payment = await tx.supplierPayment.create({
        data: {
          companyId: supplier.companyId,
          supplierId,
          purchaseInvoiceId: purchaseInvoiceId || null,
          paymentAccountId: paymentAccountId || null,
          amount,
          currency,
          paymentDate: paymentDateObj,
          journalEntryId: journalEntry.id,
          notes,
          createdById: currentUser.userId,
        },
      });

      // Update journal sourceId
      await tx.journalEntry.update({
        where: { id: journalEntry.id },
        data: { sourceId: payment.id },
      });

      // Audit inside transaction
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: "CREATE",
          entity: "SupplierPayment",
          entityId: payment.id,
          details: {
            supplierId,
            purchaseInvoiceId: purchaseInvoiceId || null,
            amount,
            currency,
            journalEntryId: journalEntry.id,
          } as never,
        },
      });

      return { payment, journalEntry, updatedInvoice };
    });

    return successResponse(
      {
        id: result.payment.id,
        supplierId: result.payment.supplierId,
        purchaseInvoiceId: result.payment.purchaseInvoiceId,
        amount: Number(result.payment.amount),
        currency: result.payment.currency,
        paymentDate: result.payment.paymentDate,
        journalEntryId: result.journalEntry.id,
        notes: result.payment.notes,
        invoiceRemaining: result.updatedInvoice
          ? Number(result.updatedInvoice.remaining)
          : null,
      },
      201,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues.map((e) => e.message).join("، "), 400);
    }
    const message =
      error instanceof Error ? error.message : "فشل إنشاء الدفع";
    console.error("Supplier payment error:", error);
    return errorResponse(message, 500);
  }
}
