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

  if (!(await requireDbPermission(user.userId, PERMISSIONS.SALES_VIEW))) {
    return forbiddenError("لا تملك صلاحية عرض فاتورة البيع");
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      company: {
        select: { name: true, code: true, taxId: true, address: true },
      },
      customer: { select: { name: true, code: true } },
      warehouse: { select: { name: true, code: true } },
      items: {
        include: {
          product: { select: { name: true, code: true } },
        },
      },
    },
  });

  if (!invoice) return notFoundError();

  if (invoice.companyId && !(await canAccessCompany(user, invoice.companyId))) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "json") {
    return successResponse({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      companyName: invoice.company?.name,
      customerName: invoice.customer?.name,
      customerCode: invoice.customer?.code,
      warehouseName: invoice.warehouse?.name,
      paymentType: invoice.paymentType,
      status: invoice.status,
      currency: invoice.currency,
      totalBeforeTax: Number(invoice.totalBeforeTax ?? 0),
      taxAmount: Number(invoice.taxAmount ?? 0),
      discountAmount: Number(invoice.discountAmount ?? 0),
      discountPercent: Number(invoice.discountPercent ?? 0),
      totalAfterTax: Number(invoice.totalAfterTax ?? 0),
      paid: Number(invoice.paid ?? 0),
      remaining: Number(invoice.remaining ?? 0),
      notes: invoice.notes,
      items: invoice.items.map((item) => ({
        productName: item.product?.name || item.productNameSnapshot,
        productCode: item.product?.code || item.productCodeSnapshot,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice ?? 0),
        discountPercent: Number(item.discountPercent ?? 0),
        discountAmount: Number(item.discountAmount ?? 0),
        lineTotal: Number(item.lineTotal ?? 0),
      })),
    });
  }

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة بيع — ${escapeHtml(invoice.invoiceNumber)}</title>
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
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      border-bottom: 2px solid #333;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 { margin: 0; font-size: 22px; }
    .header .company { font-size: 14px; color: #555; margin-top: 4px; }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .meta .field { min-width: 180px; }
    .meta .label { color: #666; font-size: 12px; }
    .meta .value { font-weight: 600; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: right;
    }
    th { background: #f5f5f5; font-weight: 600; }
    .totals {
      width: 300px;
      margin-right: auto;
      margin-left: 0;
      font-size: 14px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #eee;
    }
    .totals .row.bold {
      font-weight: 700;
      border-top: 2px solid #333;
      border-bottom: 2px solid #333;
      margin-top: 4px;
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
      <h1>فاتورة بيع</h1>
      <div class="company">${escapeHtml(invoice.company?.name)} — ${escapeHtml(invoice.company?.code)}</div>
      ${invoice.company?.taxId ? `<div class="company">الرقم الضريبي: ${escapeHtml(invoice.company.taxId)}</div>` : ""}
    </div>

    <div class="meta">
      <div class="field">
        <div class="label">رقم الفاتورة</div>
        <div class="value">${escapeHtml(invoice.invoiceNumber)}</div>
      </div>
      <div class="field">
        <div class="label">التاريخ</div>
        <div class="value">${formatDate(invoice.invoiceDate)}</div>
      </div>
      <div class="field">
        <div class="label">العميل</div>
        <div class="value">${escapeHtml(invoice.customer?.name)} (${escapeHtml(invoice.customer?.code)})</div>
      </div>
      <div class="field">
        <div class="label">المخزن</div>
        <div class="value">${escapeHtml(invoice.warehouse?.name)}</div>
      </div>
      <div class="field">
        <div class="label">طريقة الدفع</div>
        <div class="value">${escapeHtml(invoice.paymentType)}</div>
      </div>
      <div class="field">
        <div class="label">الحالة</div>
        <div class="value">${escapeHtml(invoice.status)}</div>
      </div>
      <div class="field">
        <div class="label">العملة</div>
        <div class="value">${escapeHtml(invoice.currency)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>سعر الوحدة</th>
          <th>الخصم</th>
          <th>المجموع</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          .map(
            (item, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(item.product?.name || item.productNameSnapshot || "—")} (${escapeHtml(item.product?.code || item.productCodeSnapshot || "—")})</td>
          <td>${item.quantity}</td>
          <td>${formatNumber(Number(item.unitPrice ?? 0))}</td>
          <td>${Number(item.discountPercent ?? 0) > 0 || Number(item.discountAmount ?? 0) > 0 ? `${formatNumber(Number(item.discountPercent ?? 0))}% + ${formatNumber(Number(item.discountAmount ?? 0))}` : "—"}</td>
          <td>${formatNumber(Number(item.lineTotal ?? 0))}</td>
        </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>المجموع الفرعي</span><span>${formatNumber(Number(invoice.totalBeforeTax ?? 0))} ${escapeHtml(invoice.currency)}</span></div>
      <div class="row"><span>الضريبة</span><span>${formatNumber(Number(invoice.taxAmount ?? 0))} ${escapeHtml(invoice.currency)}</span></div>
      <div class="row"><span>الخصم</span><span>${formatNumber(Number(invoice.discountAmount ?? 0))} ${escapeHtml(invoice.currency)}</span></div>
      <div class="row bold"><span>الإجمالي</span><span>${formatNumber(Number(invoice.totalAfterTax ?? 0))} ${escapeHtml(invoice.currency)}</span></div>
      <div class="row"><span>المدفوع</span><span>${formatNumber(Number(invoice.paid ?? 0))} ${escapeHtml(invoice.currency)}</span></div>
      <div class="row"><span>المتبقي</span><span>${formatNumber(Number(invoice.remaining ?? 0))} ${escapeHtml(invoice.currency)}</span></div>
    </div>

    ${invoice.notes ? `<div style="margin-top:20px;font-size:13px;color:#555;"><strong>ملاحظات:</strong> ${escapeHtml(invoice.notes)}</div>` : ""}

    <div class="footer">
      تم إنشاء هذه الفاتورة بتاريخ ${new Date().toLocaleString("ar-IQ")}
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
