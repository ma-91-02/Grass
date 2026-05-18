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

  if (
    !(await requireDbPermission(user.userId, PERMISSIONS.SALES_RETURNS_VIEW))
  ) {
    return forbiddenError("لا تملك صلاحية عرض مرتجع البيع");
  }

  const { id } = await params;
  const salesReturn = await prisma.salesReturn.findUnique({
    where: { id },
    include: {
      company: { select: { name: true, code: true, taxId: true } },
      originalInvoice: { select: { invoiceNumber: true } },
      customer: { select: { name: true, code: true } },
      warehouse: { select: { name: true, code: true } },
      lines: {
        include: {
          product: { select: { name: true, code: true } },
        },
      },
    },
  });

  if (!salesReturn) return notFoundError();

  if (
    salesReturn.companyId &&
    !(await canAccessCompany(user, salesReturn.companyId))
  ) {
    return forbiddenError("لا يمكنك الوصول إلى هذه الشركة");
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "json") {
    return successResponse({
      id: salesReturn.id,
      returnNumber: salesReturn.returnNumber,
      returnDate: salesReturn.returnDate,
      companyName: salesReturn.company?.name,
      originalInvoiceNumber: salesReturn.originalInvoice?.invoiceNumber,
      customerName: salesReturn.customer?.name,
      customerCode: salesReturn.customer?.code,
      warehouseName: salesReturn.warehouse?.name,
      status: salesReturn.status,
      totalAmount: Number(salesReturn.totalAmount ?? 0),
      totalCogs: Number(salesReturn.totalCogs ?? 0),
      currency: salesReturn.currency,
      notes: salesReturn.notes,
      lines: salesReturn.lines.map((l) => ({
        productName: l.product?.name,
        productCode: l.product?.code,
        quantity: l.quantity,
        unitPriceSnapshot: Number(l.unitPriceSnapshot ?? 0),
        averageCostSnapshot: Number(l.averageCostSnapshot ?? 0),
        lineTotal: Number(l.lineTotal ?? 0),
      })),
    });
  }

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>إشعار مرتجع — ${escapeHtml(salesReturn.returnNumber)}</title>
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
      <h1>إشعار مرتجع بيع</h1>
      <div class="company">${escapeHtml(salesReturn.company?.name)} — ${escapeHtml(salesReturn.company?.code)}</div>
      ${salesReturn.company?.taxId ? `<div class="company">الرقم الضريبي: ${escapeHtml(salesReturn.company.taxId)}</div>` : ""}
    </div>

    <div class="meta">
      <div class="field">
        <div class="label">رقم الإشعار</div>
        <div class="value">${escapeHtml(salesReturn.returnNumber)}</div>
      </div>
      <div class="field">
        <div class="label">التاريخ</div>
        <div class="value">${formatDate(salesReturn.returnDate)}</div>
      </div>
      <div class="field">
        <div class="label">الفاتورة الأصلية</div>
        <div class="value">${escapeHtml(salesReturn.originalInvoice?.invoiceNumber)}</div>
      </div>
      <div class="field">
        <div class="label">العميل</div>
        <div class="value">${escapeHtml(salesReturn.customer?.name)} (${escapeHtml(salesReturn.customer?.code)})</div>
      </div>
      <div class="field">
        <div class="label">المخزن</div>
        <div class="value">${escapeHtml(salesReturn.warehouse?.name)}</div>
      </div>
      <div class="field">
        <div class="label">الحالة</div>
        <div class="value">${escapeHtml(salesReturn.status)}</div>
      </div>
      <div class="field">
        <div class="label">العملة</div>
        <div class="value">${escapeHtml(salesReturn.currency)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>سعر الوحدة (لحظة البيع)</th>
          <th>تكلفة الوحدة</th>
          <th>المجموع</th>
        </tr>
      </thead>
      <tbody>
        ${salesReturn.lines
          .map(
            (l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(l.product?.name || "—")} (${escapeHtml(l.product?.code || "—")})</td>
          <td>${l.quantity}</td>
          <td>${formatNumber(Number(l.unitPriceSnapshot ?? 0))}</td>
          <td>${formatNumber(Number(l.averageCostSnapshot ?? 0))}</td>
          <td>${formatNumber(Number(l.lineTotal ?? 0))}</td>
        </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>إجمالي المرتجع</span><span>${formatNumber(Number(salesReturn.totalAmount ?? 0))} ${escapeHtml(salesReturn.currency)}</span></div>
      <div class="row"><span>تكلفة البضاعة المباعة</span><span>${formatNumber(Number(salesReturn.totalCogs ?? 0))} ${escapeHtml(salesReturn.currency)}</span></div>
    </div>

    ${salesReturn.notes ? `<div style="margin-top:20px;font-size:13px;color:#555;"><strong>ملاحظات:</strong> ${escapeHtml(salesReturn.notes)}</div>` : ""}

    <div class="footer">
      تم إنشاء هذا الإشعار بتاريخ ${new Date().toLocaleString("ar-IQ")}
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
