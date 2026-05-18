import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  requireDbPermission,
  canAccessCompany,
} from "@/lib/auth";
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  successResponse,
} from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";

function escapeHtml(str: string | null | undefined): string {
  if (str == null) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("ar-IQ");
}

function formatNumber(n: number | string | null | undefined): string {
  if (n == null) return "0";
  const num = typeof n === "string" ? Number(n) : n;
  return num.toLocaleString("ar-IQ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();

  if (!(await requireDbPermission(user.userId, PERMISSIONS.COLLECTIONS_VIEW))) {
    return forbiddenError("لا تملك صلاحية عرض سند التحصيل");
  }

  const { id } = await params;
  const collection = await prisma.customerCollection.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, code: true, taxId: true } },
      customer: { select: { name: true, code: true } },
      invoice: { select: { invoiceNumber: true } },
      paymentAccount: { select: { name: true } },
    },
  });

  if (!collection) return notFoundError();

  if (
    collection.companyId &&
    !(await canAccessCompany(user, collection.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "json") {
    return successResponse({
      id: collection.id,
      collectionDate: collection.collectionDate,
      companyName: collection.company?.name,
      customerName: collection.customer?.name,
      customerCode: collection.customer?.code,
      invoiceNumber: collection.invoice?.invoiceNumber,
      paymentAccountName: collection.paymentAccount?.name,
      amount: Number(collection.amount ?? 0),
      currency: collection.currency,
      notes: collection.notes,
      journalEntryId: collection.journalEntryId,
    });
  }

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سند تحصيل — ${escapeHtml(collection.id.substring(0, 8).toUpperCase())}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 24px;
      background: #fff;
      color: #222;
      direction: rtl;
    }
    .container { max-width: 600px; margin: 0 auto; }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 16px;
      margin-bottom: 24px;
      text-align: center;
    }
    .header h1 { margin: 0; font-size: 22px; }
    .header .company { font-size: 14px; color: #555; margin-top: 4px; }
    .receipt-box {
      border: 2px dashed #333;
      padding: 24px;
      margin-bottom: 24px;
    }
    .field {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
      font-size: 15px;
    }
    .field .label { color: #666; }
    .field .value { font-weight: 600; }
    .field.amount {
      font-size: 18px;
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
      margin-top: 8px;
      padding: 14px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #777;
      text-align: center;
    }
    @media print {
      body { padding: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>سند تحصيل</h1>
      <div class="company">${escapeHtml(collection.company?.name)} — ${escapeHtml(collection.company?.code)}</div>
      ${collection.company?.taxId ? `<div class="company">الرقم الضريبي: ${escapeHtml(collection.company.taxId)}</div>` : ""}
    </div>

    <div class="receipt-box">
      <div class="field">
        <span class="label">رقم السند</span>
        <span class="value">${escapeHtml(collection.id.substring(0, 8).toUpperCase())}</span>
      </div>
      <div class="field">
        <span class="label">التاريخ</span>
        <span class="value">${formatDate(collection.collectionDate)}</span>
      </div>
      <div class="field">
        <span class="label">العميل</span>
        <span class="value">${escapeHtml(collection.customer?.name)} (${escapeHtml(collection.customer?.code)})</span>
      </div>
      ${
        collection.invoice?.invoiceNumber
          ? `
      <div class="field">
        <span class="label">رقم الفاتورة</span>
        <span class="value">${escapeHtml(collection.invoice.invoiceNumber)}</span>
      </div>
      `
          : ""
      }
      <div class="field">
        <span class="label">حساب الدفع</span>
        <span class="value">${escapeHtml(collection.paymentAccount?.name || "—")}</span>
      </div>
      <div class="field amount">
        <span class="label">المبلغ</span>
        <span class="value">${formatNumber(Number(collection.amount ?? 0))} ${escapeHtml(collection.currency)}</span>
      </div>
      ${
        collection.notes
          ? `
      <div class="field">
        <span class="label">ملاحظات</span>
        <span class="value">${escapeHtml(collection.notes)}</span>
      </div>
      `
          : ""
      }
      ${
        collection.journalEntryId
          ? `
      <div class="field">
        <span class="label">رقم القيد</span>
        <span class="value">${escapeHtml(collection.journalEntryId)}</span>
      </div>
      `
          : ""
      }
    </div>

    <div class="footer">
      تم إنشاء هذا السند بتاريخ ${new Date().toLocaleString("ar-IQ")}
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
