import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToStream } from "@react-pdf/renderer";
import { PurchaseInvoicePdf } from "@/components/pdf/purchase-invoice-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true } },
        warehouse: { select: { name: true } },
        items: true,
        expenses: true,
      },
    });

    if (!invoice) {
      return new Response("فاتورة المشتريات غير موجودة", { status: 404 });
    }

    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      supplierInvoiceNumber: invoice.supplierInvoiceNumber,
      purchaseDate: invoice.purchaseDate.toISOString(),
      currency: invoice.currency,
      exchangeRateValue: Number(invoice.exchangeRateValue),
      supplierName: invoice.supplier?.name || null,
      warehouseName: invoice.warehouse?.name || null,
      notes: invoice.notes,
      subtotal: Number(invoice.subtotal),
      totalExpenses: Number(invoice.totalExpenses),
      totalCost: Number(invoice.totalCost),
      paymentMethod: invoice.paymentMethod,
      paid: Number(invoice.paid),
      remaining: Number(invoice.remaining),
      items: invoice.items.map((item) => ({
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        purchasePrice: Number(item.purchasePrice),
        totalPrice: Number(item.totalPrice),
        expenseShare: Number(item.expenseShare),
        finalCost: Number(item.finalCost),
      })),
      expenses: invoice.expenses.map((exp) => ({
        name: exp.name,
        amount: Number(exp.amount),
        currency: exp.currency,
        amountInInvoiceCurrency: Number(exp.amountInInvoiceCurrency),
      })),
    };

    const stream = await renderToStream(
      <PurchaseInvoicePdf invoice={pdfData} />,
    );

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response("فشل إنشاء ملف PDF", { status: 500 });
  }
}
