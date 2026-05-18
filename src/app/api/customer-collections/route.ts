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
import { customerCollectionSchema } from "@/lib/schemas";
import { LedgerValidator } from "@/lib/services/ledger-validator";
import { PeriodGuard } from "@/lib/services/period-guard";

const ACCOUNT_CODES = {
  CASH_IQD: "1.1.1",
  CASH_USD: "1.1.2",
  AR_IQD: "1.1.6",
  AR_USD: "1.1.7",
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (!(await requireDbPermission(user.userId, PERMISSIONS.COLLECTIONS_VIEW))) {
    return forbiddenError("لا تملك صلاحية عرض التحصيلات");
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const companyId = searchParams.get("companyId");
  const invoiceId = searchParams.get("invoiceId");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const search = searchParams.get("search");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");

  // Pagination normalization
  let page = parseInt(pageParam || "1", 10);
  let limit = parseInt(limitParam || "20", 10);
  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const where: Record<string, unknown> = {};

  if (customerId) {
    where.customerId = customerId;
  }

  if (invoiceId) {
    where.invoiceId = invoiceId;
  }

  if (companyId) {
    if (!(await canAccessCompany(user, companyId))) {
      return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
    }
    where.companyId = companyId;
  } else {
    // If no company filter, restrict to user's companies
    const userRecord = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { company: true },
    });
    if (userRecord?.companyId) {
      where.companyId = userRecord.companyId;
    }
  }

  const fromDate = fromParam ? new Date(fromParam) : undefined;
  const toDate = toParam ? new Date(toParam) : undefined;
  if (fromDate && toDate) {
    where.collectionDate = { gte: fromDate, lte: toDate };
  } else if (fromDate) {
    where.collectionDate = { gte: fromDate };
  } else if (toDate) {
    where.collectionDate = { lte: toDate };
  }

  // Search on customerName or invoiceNumber
  if (search) {
    where.OR = [
      {
        customer: {
          name: { contains: search, mode: "insensitive" },
        },
      },
      {
        invoice: {
          invoiceNumber: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [collections, total] = await Promise.all([
    prisma.customerCollection.findMany({
      where,
      orderBy: { collectionDate: "desc" },
      skip,
      take: limit,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        invoice: { select: { id: true, invoiceNumber: true, remaining: true } },
        paymentAccount: { select: { id: true, name: true } },
      },
    }),
    prisma.customerCollection.count({ where }),
  ]);

  const data = collections.map((c) => ({
    id: c.id,
    customerId: c.customerId,
    customerName: c.customer?.name,
    customerCode: c.customer?.code,
    invoiceId: c.invoiceId,
    invoiceNumber: c.invoice?.invoiceNumber,
    paymentAccountId: c.paymentAccountId,
    paymentAccountName: c.paymentAccount?.name,
    amount: Number(c.amount),
    currency: c.currency,
    collectionDate: c.collectionDate,
    notes: c.notes,
    createdAt: c.createdAt,
  }));

  const summary = {
    totalCollections: total,
    totalAmount: data.reduce((sum, c) => sum + c.amount, 0),
  };

  return successResponse({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary,
  });
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorizedError();

  if (
    !(await requireDbPermission(
      currentUser.userId,
      PERMISSIONS.COLLECTIONS_CREATE,
    ))
  ) {
    return forbiddenError("لا تملك صلاحية إنشاء تحصيل");
  }

  try {
    const body = await request.json();
    const parsed = customerCollectionSchema.parse(body);

    const {
      customerId,
      invoiceId,
      paymentAccountId,
      amount,
      currency,
      collectionDate,
      notes,
    } = parsed;

    // Load customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) return notFoundError("العميل غير موجود");
    if (!customer.isActive) return errorResponse("العميل غير نشط", 400);

    if (
      customer.companyId &&
      !(await canAccessCompany(currentUser, customer.companyId))
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
        return conflictError("عملة حساب الدفع لا تطابق عملة التحصيل");
      }
    }

    // Validate invoice if provided
    let invoice = null;
    if (invoiceId) {
      invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      if (!invoice) return notFoundError("الفاتورة غير موجودة");
      if (invoice.status !== "POSTED") {
        return errorResponse("لا يمكن التحصيل على فاتورة غير مرحلة", 400);
      }
      if (invoice.customerId !== customerId) {
        return conflictError("الفاتورة لا تنتمي لهذا العميل");
      }
      if (Number(invoice.remaining) <= 0) {
        return errorResponse("الفاتورة مسددة بالكامل", 400);
      }
      if (invoice.currency !== currency) {
        return conflictError("عملة الفاتورة لا تطابق عملة التحصيل");
      }
      if (amount > Number(invoice.remaining)) {
        return errorResponse(
          `مبلغ التحصيل (${amount}) يتجاوز المتبقي (${Number(invoice.remaining)})`,
          400,
        );
      }
      if (invoice.companyId && invoice.companyId !== customer.companyId) {
        return conflictError("الفاتورة لا تنتمي لنفس شركة العميل");
      }
    }

    // Guard: collection amount must not exceed customer's current balance
    if (amount > Number(customer.currentBalance ?? 0)) {
      return errorResponse(
        `مبلغ التحصيل (${amount}) يتجاوز رصيد العميل (${Number(customer.currentBalance ?? 0)})`,
        400,
      );
    }

    if (!customer.companyId) {
      return errorResponse("العميل لا ينتمي لأي شركة", 400);
    }

    // Check fiscal period
    const periodCheck = await PeriodGuard.checkPeriodOpen(
      customer.companyId,
      collectionDate,
      undefined,
    );
    if (!periodCheck.allowed) {
      return errorResponse(periodCheck.error!, 423);
    }

    // Load system accounts
    const cashCode =
      currency === "USD" ? ACCOUNT_CODES.CASH_USD : ACCOUNT_CODES.CASH_IQD;
    const arCode =
      currency === "USD" ? ACCOUNT_CODES.AR_USD : ACCOUNT_CODES.AR_IQD;

    const [cashAccount, arAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { companyId: customer.companyId, code: cashCode },
      }),
      prisma.account.findFirst({
        where: { companyId: customer.companyId, code: arCode },
      }),
    ]);

    if (!cashAccount) {
      return errorResponse("حساب الصندوق غير موجود في شجرة الحسابات", 500);
    }
    if (!arAccount) {
      return errorResponse(
        "حساب الذمم المدينة غير موجود في شجرة الحسابات",
        500,
      );
    }

    // Validate account statuses and posting eligibility
    if (!cashAccount.isActive) {
      return errorResponse("حساب الصندوق غير نشط", 400);
    }
    if (!arAccount.isActive) {
      return errorResponse("حساب الذمم المدينة غير نشط", 400);
    }
    if (!cashAccount.isPosting) {
      return errorResponse("حساب الصندوق ليس حساب ترحيل", 400);
    }
    if (!arAccount.isPosting) {
      return errorResponse("حساب الذمم المدينة ليس حساب ترحيل", 400);
    }
    if (cashAccount.currency !== currency) {
      return conflictError("عملة حساب الصندوق لا تطابق عملة التحصيل");
    }
    if (arAccount.currency !== currency) {
      return conflictError("عملة حساب الذمم المدينة لا تطابق عملة التحصيل");
    }

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Lock customer row
      await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;

      // Re-read customer inside tx
      const lockedCustomer = await tx.customer.findUnique({
        where: { id: customerId },
      });
      if (!lockedCustomer) throw new Error("العميل غير موجود");

      // Guard: balance must not go negative
      const currentBalance = Number(lockedCustomer.currentBalance ?? 0);
      if (amount > currentBalance) {
        throw new Error(
          `مبلغ التحصيل (${amount}) يتجاوز رصيد العميل (${currentBalance})`,
        );
      }

      // If invoice specified, lock and re-read remaining
      let lockedInvoice = null;
      if (invoiceId) {
        await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
        lockedInvoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
        });
        if (!lockedInvoice) throw new Error("الفاتورة غير موجودة");
        if (Number(lockedInvoice.remaining) <= 0) {
          throw new Error("الفاتورة مسددة بالكامل");
        }
        if (amount > Number(lockedInvoice.remaining)) {
          throw new Error("مبلغ التحصيل يتجاوز المتبقي");
        }
      }

      // Generate journal entry number
      const jeCount = await tx.journalEntry.count({
        where: { companyId: customer.companyId || undefined },
      });
      const entryNumber = `JE-${String(jeCount + 1).padStart(5, "0")}`;

      // Journal lines: Dr Cash/Bank, Cr AR
      const journalLines = [
        {
          accountId: cashAccount.id,
          debit: amount,
          credit: 0,
          description: notes || `تحصيل من ${lockedCustomer.name}`,
        },
        {
          accountId: arAccount.id,
          debit: 0,
          credit: amount,
          description: notes || `تحصيل من ${lockedCustomer.name}`,
        },
      ];

      const validation = LedgerValidator.validateLines(journalLines);
      if (!validation.valid) {
        throw new Error(
          `قيد التحصيل غير متوازن: ${validation.errors.join(" | ")}`,
        );
      }

      const journalEntry = await tx.journalEntry.create({
        data: {
          companyId: customer.companyId!,
          entryNumber,
          entryDate: collectionDate,
          currency,
          exchangeRateSnapshot: 1,
          description: notes || `تحصيل من ${lockedCustomer.name}`,
          sourceType: "CustomerCollection",
          sourceId: "", // placeholder, updated after collection creation
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

      // Update customer balance (decrement)
      await tx.customer.update({
        where: { id: customerId },
        data: {
          currentBalance: { decrement: amount },
        },
      });

      // Update invoice if specified
      let updatedInvoice = null;
      if (lockedInvoice) {
        const newPaid = Number(lockedInvoice.paid) + amount;
        const newRemaining = Number(lockedInvoice.remaining) - amount;
        const totalAfterTax = Number(lockedInvoice.totalAfterTax);

        if (newRemaining < 0) {
          throw new Error("المتبقي لا يمكن أن يصبح سالباً");
        }
        if (newPaid > totalAfterTax) {
          throw new Error(
            `المبلغ المدفوع (${newPaid}) يتجاوز إجمالي الفاتورة (${totalAfterTax})`,
          );
        }

        updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId! },
          data: {
            paid: newPaid,
            remaining: newRemaining,
          },
        });
      }

      // Create collection record
      const collection = await tx.customerCollection.create({
        data: {
          companyId: customer.companyId,
          customerId,
          invoiceId: invoiceId || null,
          paymentAccountId: paymentAccountId || null,
          amount,
          currency,
          collectionDate,
          journalEntryId: journalEntry.id,
          notes,
          createdById: currentUser.userId,
        },
      });

      // Update journal sourceId with collection id
      await tx.journalEntry.update({
        where: { id: journalEntry.id },
        data: { sourceId: collection.id },
      });

      // Audit inside transaction
      await tx.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: "CREATE",
          entity: "CustomerCollection",
          entityId: collection.id,
          details: {
            customerId,
            invoiceId: invoiceId || null,
            amount,
            currency,
            journalEntryId: journalEntry.id,
            customerBalanceAfter:
              Number(lockedCustomer.currentBalance ?? 0) - amount,
          } as never,
        },
      });

      return { collection, journalEntry, updatedInvoice };
    });

    return successResponse({
      id: result.collection.id,
      customerId: result.collection.customerId,
      invoiceId: result.collection.invoiceId,
      amount: Number(result.collection.amount),
      currency: result.collection.currency,
      collectionDate: result.collection.collectionDate,
      journalEntryId: result.journalEntry.id,
      notes: result.collection.notes,
      createdAt: result.collection.createdAt,
      invoiceRemaining: result.updatedInvoice
        ? Number(result.updatedInvoice.remaining)
        : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "فشل إنشاء التحصيل";
    console.error("Customer collection error:", error);
    return errorResponse(message, 500);
  }
}
