import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    direction: "rtl",
    fontFamily: "Helvetica",
    padding: 30,
    fontSize: 10,
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoLabel: {
    color: "#666",
  },
  infoValue: {
    fontWeight: "bold",
  },
  section: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottom: "1 solid #ddd",
    paddingBottom: 4,
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottom: "1 solid #ddd",
    paddingVertical: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #eee",
    paddingVertical: 4,
  },
  cellCode: { width: "12%", textAlign: "right", paddingHorizontal: 4 },
  cellName: { width: "25%", textAlign: "right", paddingHorizontal: 4 },
  cellQty: { width: "8%", textAlign: "center", paddingHorizontal: 4 },
  cellPrice: { width: "13%", textAlign: "right", paddingHorizontal: 4 },
  cellTotal: { width: "14%", textAlign: "right", paddingHorizontal: 4 },
  cellExpense: { width: "14%", textAlign: "right", paddingHorizontal: 4 },
  cellFinal: { width: "14%", textAlign: "right", paddingHorizontal: 4 },
  totals: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1 solid #ddd",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 5,
    paddingTop: 5,
    borderTop: "1 solid #ddd",
  },
  footer: {
    textAlign: "center",
    color: "#999",
    fontSize: 8,
    marginTop: 30,
  },
});

function enNum(n: number | string): string {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

interface PurchaseInvoicePdfProps {
  invoice: {
    invoiceNumber: string;
    supplierInvoiceNumber: string | null;
    purchaseDate: string;
    currency: string;
    exchangeRateValue: number;
    supplierName: string | null;
    warehouseName: string | null;
    notes: string | null;
    subtotal: number;
    totalExpenses: number;
    totalCost: number;
    paymentMethod: string;
    paid: number;
    remaining: number;
    items: Array<{
      productCode: string;
      productName: string;
      quantity: number;
      purchasePrice: number;
      totalPrice: number;
      expenseShare: number;
      finalCost: number;
    }>;
    expenses: Array<{
      name: string;
      amount: number;
      currency: string;
      amountInInvoiceCurrency: number;
    }>;
  };
}

export function PurchaseInvoicePdf({ invoice }: PurchaseInvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>فاتورة مشتريات</Text>
          <Text style={styles.subtitle}>{invoice.invoiceNumber}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text>
              <Text style={styles.infoLabel}>المورد: </Text>
              <Text style={styles.infoValue}>
                {invoice.supplierName || "—"}
              </Text>
            </Text>
            <Text>
              <Text style={styles.infoLabel}>رقم فاتورة المورد: </Text>
              <Text style={styles.infoValue}>
                {invoice.supplierInvoiceNumber || "—"}
              </Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text>
              <Text style={styles.infoLabel}>التاريخ: </Text>
              <Text style={styles.infoValue}>
                {new Date(invoice.purchaseDate).toLocaleDateString("ar-IQ")}
              </Text>
            </Text>
            <Text>
              <Text style={styles.infoLabel}>المخزن: </Text>
              <Text style={styles.infoValue}>
                {invoice.warehouseName || "—"}
              </Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text>
              <Text style={styles.infoLabel}>العملة: </Text>
              <Text style={styles.infoValue}>
                {invoice.currency === "USD" ? "دولار أمريكي" : "دينار عراقي"}
              </Text>
            </Text>
            <Text>
              <Text style={styles.infoLabel}>طريقة الدفع: </Text>
              <Text style={styles.infoValue}>
                {invoice.paymentMethod === "CASH" ? "نقداً" : "على الحساب"}
              </Text>
            </Text>
          </View>
          {invoice.notes && (
            <View style={styles.infoRow}>
              <Text>
                <Text style={styles.infoLabel}>ملاحظات: </Text>
                <Text>{invoice.notes}</Text>
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المواد</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.cellCode}>الكود</Text>
              <Text style={styles.cellName}>المادة</Text>
              <Text style={styles.cellQty}>الكمية</Text>
              <Text style={styles.cellPrice}>سعر الشراء</Text>
              <Text style={styles.cellTotal}>الإجمالي</Text>
              <Text style={styles.cellExpense}>حصة المصروفات</Text>
              <Text style={styles.cellFinal}>التكلفة النهائية</Text>
            </View>
            {invoice.items.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellCode}>{item.productCode}</Text>
                <Text style={styles.cellName}>{item.productName}</Text>
                <Text style={styles.cellQty}>{enNum(item.quantity)}</Text>
                <Text style={styles.cellPrice}>
                  {enNum(item.purchasePrice)}
                </Text>
                <Text style={styles.cellTotal}>{enNum(item.totalPrice)}</Text>
                <Text style={styles.cellExpense}>
                  {enNum(item.expenseShare)}
                </Text>
                <Text style={styles.cellFinal}>{enNum(item.finalCost)}</Text>
              </View>
            ))}
          </View>
        </View>

        {invoice.expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المصاريف</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text
                  style={{
                    width: "40%",
                    textAlign: "right",
                    paddingHorizontal: 4,
                  }}
                >
                  الاسم
                </Text>
                <Text
                  style={{
                    width: "20%",
                    textAlign: "right",
                    paddingHorizontal: 4,
                  }}
                >
                  المبلغ
                </Text>
                <Text
                  style={{
                    width: "20%",
                    textAlign: "right",
                    paddingHorizontal: 4,
                  }}
                >
                  العملة
                </Text>
                <Text
                  style={{
                    width: "20%",
                    textAlign: "right",
                    paddingHorizontal: 4,
                  }}
                >
                  بعملة الفاتورة
                </Text>
              </View>
              {invoice.expenses.map((exp, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text
                    style={{
                      width: "40%",
                      textAlign: "right",
                      paddingHorizontal: 4,
                    }}
                  >
                    {exp.name}
                  </Text>
                  <Text
                    style={{
                      width: "20%",
                      textAlign: "right",
                      paddingHorizontal: 4,
                    }}
                  >
                    {enNum(exp.amount)}
                  </Text>
                  <Text
                    style={{
                      width: "20%",
                      textAlign: "right",
                      paddingHorizontal: 4,
                    }}
                  >
                    {exp.currency === "USD" ? "دولار" : "دينار"}
                  </Text>
                  <Text
                    style={{
                      width: "20%",
                      textAlign: "right",
                      paddingHorizontal: 4,
                    }}
                  >
                    {enNum(exp.amountInInvoiceCurrency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.infoLabel}>إجمالي المواد</Text>
            <Text>{enNum(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.infoLabel}>إجمالي المصاريف</Text>
            <Text>{enNum(invoice.totalExpenses)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <View style={styles.totalRow}>
              <Text>إجمالي الكلفة</Text>
              <Text>
                {enNum(invoice.totalCost)}{" "}
                {invoice.currency === "USD" ? "$" : "د.ع"}
              </Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: "green" }}>المدفوع</Text>
            <Text style={{ color: "green" }}>{enNum(invoice.paid)}</Text>
          </View>
          {invoice.remaining > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ color: "red" }}>الباقي</Text>
              <Text style={{ color: "red" }}>{enNum(invoice.remaining)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>تم إنشاؤها بواسطة نظام Grass ERP</Text>
      </Page>
    </Document>
  );
}
