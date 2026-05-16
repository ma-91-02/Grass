"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  purchaseInvoiceFormSchema,
  type PurchaseInvoiceFormData,
} from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type {
  SupplierData,
  WarehouseData,
  ProductData,
  PaymentAccountData,
} from "@/types";
import { PERMISSIONS } from "@/lib/permissions";

interface PurchaseInvoiceFormProps {
  userPermissions: string[];
  onSuccess?: () => void;
}

interface LineItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  purchasePrice: number;
  productionDate: string;
  expiryDate: string;
  totalPrice: number;
}

interface ExpenseItem {
  name: string;
  amount: number;
}

export function PurchaseInvoiceForm({
  userPermissions,
  onSuccess,
}: PurchaseInvoiceFormProps) {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      productId: "",
      productName: "",
      productCode: "",
      quantity: 1,
      purchasePrice: 0,
      productionDate: "",
      expiryDate: "",
      totalPrice: 0,
    },
  ]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  const canCreate = userPermissions.includes(PERMISSIONS.PURCHASES_CREATE);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<PurchaseInvoiceFormData>({
    resolver: zodResolver(purchaseInvoiceFormSchema) as unknown as import("react-hook-form").Resolver<PurchaseInvoiceFormData>,
    defaultValues: {
      supplierInvoiceNumber: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      currency: "IQD",
      exchangeRateValue: 0,
      supplierId: "",
      warehouseId: "",
      notes: "",
      paymentMethod: "CASH",
      paid: 0,
      paymentAccountId: "",
    },
  });

  const currency = useWatch({ control, name: "currency" });
  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const paid = useWatch({ control, name: "paid" });
  const supplierId = useWatch({ control, name: "supplierId" });

  useEffect(() => {
    async function loadData() {
      try {
        const [suppliersRes, warehousesRes, productsRes, accountsRes, exchangeRateRes] =
          await Promise.all([
            fetch("/api/suppliers"),
            fetch("/api/warehouses"),
            fetch("/api/products"),
            fetch("/api/payment-accounts"),
            fetch("/api/exchange-rates"),
          ]);

        const suppliersJson = await suppliersRes.json();
        const warehousesJson = await warehousesRes.json();
        const productsJson = await productsRes.json();
        const accountsJson = await accountsRes.json();
        const exchangeRateJson = await exchangeRateRes.json();

        setSuppliers(
          (suppliersJson.data || []).filter((s: SupplierData) => s.isActive),
        );
        setWarehouses(
          (warehousesJson.data || []).filter((w: WarehouseData) => w.isActive),
        );
        setProducts(productsJson.data || []);
        setPaymentAccounts(
          (accountsJson.data || []).filter((a: PaymentAccountData) => a.isActive),
        );

        const rates = exchangeRateJson.data || [];
        if (rates.length > 0) {
          setValue("exchangeRateValue", Number(rates[0].usdToIqd));
        }
      } catch (err) {
        console.error("Failed to load form data:", err);
        toast("فشل تحميل البيانات", "error");
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [setValue, toast]);

  const filteredAccounts = paymentAccounts.filter(
    (a) => a.currency === currency,
  );

  const updateItemTotal = useCallback(
    (index: number, item: Partial<LineItem>) => {
      setLineItems((prev) => {
        const updated = [...prev];
        const current = { ...updated[index], ...item };
        current.totalPrice = current.quantity * current.purchasePrice;
        updated[index] = current;
        return updated;
      });
    },
    [],
  );

  const handleProductSelect = useCallback(
    (index: number, productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        updateItemTotal(index, {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          purchasePrice: Number(product.purchasePrice),
        });
      }
    },
    [products, updateItemTotal],
  );

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        productId: "",
        productName: "",
        productCode: "",
        quantity: 1,
        purchasePrice: 0,
        productionDate: "",
        expiryDate: "",
        totalPrice: 0,
      },
    ]);
  }, []);

  const removeLineItem = useCallback((index: number) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const addExpense = useCallback(() => {
    setExpenses((prev) => [...prev, { name: "", amount: 0 }]);
  }, []);

  const updateExpense = useCallback(
    (index: number, field: keyof ExpenseItem, value: string | number) => {
      setExpenses((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    [],
  );

  const removeExpense = useCallback((index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const totalCost = subtotal + totalExpenses;
  const remaining = totalCost - Number(paid || 0);

  const selectedSupplier = suppliers.find(
    (s) => s.id === supplierId,
  );

  const onSubmit = useCallback(
    async (formData: PurchaseInvoiceFormData) => {
      if (!canCreate) {
        toast("لا تملك صلاحية إنشاء فاتورة مشتريات", "error");
        return;
      }

      if (lineItems.some((item) => !item.productId)) {
        toast("الرجاء اختيار المادة لجميع البنود", "error");
        return;
      }

      setLoading(true);
      try {
        const payload = {
          ...formData,
          items: lineItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            quantity: item.quantity,
            purchasePrice: Number(item.purchasePrice),
            productionDate: item.productionDate || null,
            expiryDate: item.expiryDate || null,
            totalPrice: item.totalPrice,
          })),
          expenses: expenses.map((exp) => ({
            name: exp.name,
            amount: Number(exp.amount || 0),
          })),
        };

        const res = await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error || "فشل إنشاء الفاتورة");

        toast("تم إنشاء فاتورة المشتريات بنجاح", "success");
        onSuccess?.();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "فشل إنشاء فاتورة المشتريات";
        toast(msg, "error");
      } finally {
        setLoading(false);
      }
    },
    [canCreate, lineItems, expenses, onSuccess, toast],
  );

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-dark">معلومات الفاتورة</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="رقم فاتورة المورد"
            placeholder="رقم الفاتورة حسب المورد"
            {...register("supplierInvoiceNumber")}
            error={errors.supplierInvoiceNumber?.message}
          />
          <Input
            label="تاريخ الشراء"
            type="date"
            {...register("purchaseDate")}
            error={errors.purchaseDate?.message}
          />
          <Select
            label="العملة"
            options={[
              { value: "IQD", label: "دينار عراقي" },
              { value: "USD", label: "دولار أمريكي" },
            ]}
            {...register("currency")}
            error={errors.currency?.message}
          />
          {currency === "USD" && (
            <Input
              label="سعر الصرف (دينار لكل دولار)"
              type="number"
              step="0.001"
              {...register("exchangeRateValue")}
              error={errors.exchangeRateValue?.message}
            />
          )}
          <Select
            label="المورد"
            placeholder="اختر المورد"
            options={suppliers.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.code})`,
            }))}
            {...register("supplierId")}
            error={errors.supplierId?.message}
          />
          <Select
            label="المخزن"
            placeholder="اختر المخزن"
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.name} (${w.code})`,
            }))}
            {...register("warehouseId")}
            error={errors.warehouseId?.message}
          />
        </div>

        {selectedSupplier && (
          <div className="mt-3 text-sm text-gray-500">
            حسابات المورد:{" "}
            {selectedSupplier.accounts
              .map((a) => `${a.currency}: ${formatCurrency(a.balance)}`)
              .join(" | ")}
          </div>
        )}

        <div className="mt-4">
          <Textarea
            label="ملاحظات"
            placeholder="ملاحظات إضافية..."
            {...register("notes")}
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark">مواد الفاتورة</h2>
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="h-4 w-4" />
            إضافة مادة
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-right font-medium text-gray-600">المادة</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">الكود</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">الكمية</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">سعر الشراء</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">تاريخ الإنتاج</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">تاريخ الانتهاء</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">الإجمالي</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => (
                <tr key={index} className="border-b border-border">
                  <td className="px-3 py-2">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">اختر مادة</option>
                      {products
                        .filter((p) => p.isActive)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {item.productCode || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItemTotal(index, {
                          quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-9 w-20 rounded-lg border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.purchasePrice}
                      onChange={(e) =>
                        updateItemTotal(index, {
                          purchasePrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-9 w-24 rounded-lg border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={item.productionDate}
                      onChange={(e) =>
                        updateItemTotal(index, {
                          productionDate: e.target.value,
                        })
                      }
                      className="h-9 w-32 rounded-lg border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) =>
                        updateItemTotal(index, {
                          expiryDate: e.target.value,
                        })
                      }
                      className="h-9 w-32 rounded-lg border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-dark">
                    {formatCurrency(item.totalPrice)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-left text-sm text-gray-500">
          إجمالي المواد:{" "}
          <span className="font-semibold text-dark">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>

      {/* Expenses */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark">المصاريف</h2>
          <Button type="button" variant="outline" size="sm" onClick={addExpense}>
            <Plus className="h-4 w-4" />
            إضافة مصروف
          </Button>
        </div>

        {expenses.length === 0 && (
          <p className="text-sm text-gray-400">لا توجد مصاريف مضافة</p>
        )}

        {expenses.map((exp, index) => (
          <div key={index} className="mb-2 flex items-center gap-3">
            <input
              placeholder="اسم المصروف"
              value={exp.name}
              onChange={(e) => updateExpense(index, "name", e.target.value)}
              className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="number"
              step="0.001"
              min="0"
              placeholder="المبلغ"
              value={exp.amount}
              onChange={(e) =>
                updateExpense(index, "amount", parseFloat(e.target.value) || 0)
              }
              className="h-9 w-32 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => removeExpense(index)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {totalExpenses > 0 && (
          <div className="mt-3 text-left text-sm text-gray-500">
            إجمالي المصاريف:{" "}
            <span className="font-semibold text-dark">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-dark">التسديد</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="طريقة الدفع"
            options={[
              { value: "CASH", label: "نقداً" },
              { value: "BANK", label: "بنك" },
              { value: "CREDIT", label: "على الحساب" },
            ]}
            {...register("paymentMethod")}
            error={errors.paymentMethod?.message}
          />
          <Input
            label="المبلغ المدفوع"
            type="number"
            step="0.001"
            min="0"
            {...register("paid")}
            error={errors.paid?.message}
          />
          {paymentMethod !== "CREDIT" && (
            <Select
              label="حساب التسديد"
              placeholder="اختر الحساب"
              options={filteredAccounts.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.type === "CASH" ? "صندوق" : "بنك"})`,
              }))}
              {...register("paymentAccountId")}
              error={errors.paymentAccountId?.message}
            />
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>إجمالي المواد</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>إجمالي المصاريف</span>
            <span>{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex justify-between text-lg font-bold text-dark">
              <span>إجمالي الكلفة</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </div>
          <div className="flex justify-between text-green-600">
            <span>المدفوع</span>
            <span>{formatCurrency(Number(paid || 0))}</span>
          </div>
          {remaining > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span>الباقي</span>
              <span>{formatCurrency(remaining)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={loading || !canCreate}>
          <Save className="h-4 w-4" />
          {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
        </Button>
      </div>
    </form>
  );
}
