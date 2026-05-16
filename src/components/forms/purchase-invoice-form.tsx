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
import { useState, useCallback, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, Search, AlertCircle } from "lucide-react";
import { formatCurrency, safeJson, parseNumericInput } from "@/lib/utils";
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
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountData[]>(
    [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState<number | null>(
    null,
  );

  const canCreate = userPermissions.includes(PERMISSIONS.PURCHASES_CREATE);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<PurchaseInvoiceFormData>({
    resolver: zodResolver(
      purchaseInvoiceFormSchema,
    ) as unknown as import("react-hook-form").Resolver<PurchaseInvoiceFormData>,
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
      setLoadingData(true);
      setLoadError(null);
      try {
        const [
          suppliersRes,
          warehousesRes,
          productsRes,
          accountsRes,
          exchangeRateRes,
        ] = await Promise.all([
          fetch("/api/suppliers"),
          fetch("/api/warehouses"),
          fetch("/api/products"),
          fetch("/api/payment-accounts"),
          fetch("/api/exchange-rates"),
        ]);

        const [
          suppliersJson,
          warehousesJson,
          productsJson,
          accountsJson,
          exchangeRateJson,
        ] = await Promise.all([
          safeJson<SupplierData[]>(suppliersRes),
          safeJson<WarehouseData[]>(warehousesRes),
          safeJson<ProductData[]>(productsRes),
          safeJson<PaymentAccountData[]>(accountsRes),
          safeJson(exchangeRateRes),
        ]);

        if (suppliersJson.success && suppliersJson.data) {
          setSuppliers(suppliersJson.data.filter((s) => s.isActive));
        }
        if (warehousesJson.success && warehousesJson.data) {
          setWarehouses(warehousesJson.data.filter((w) => w.isActive));
        }
        if (productsJson.success && productsJson.data) {
          setProducts(productsJson.data);
        }
        if (accountsJson.success && accountsJson.data) {
          setPaymentAccounts(accountsJson.data.filter((a) => a.isActive));
        }

        const rates = exchangeRateJson.data as
          | { usdToIqd: number }[]
          | undefined;
        if (rates && rates.length > 0) {
          setValue("exchangeRateValue", Number(rates[0].usdToIqd));
        }
      } catch {
        setLoadError("فشل تحميل البيانات. تحقق من الاتصال بالخادم.");
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [setValue]);

  const filteredAccounts = useMemo(
    () => paymentAccounts.filter((a) => a.currency === currency),
    [paymentAccounts, currency],
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        if (!p.isActive) return false;
        if (!productSearch) return true;
        const q = productSearch.toLowerCase();
        return (
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.barcode || "").toLowerCase().includes(q)
        );
      }),
    [products, productSearch],
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
      const product = filteredProducts.find((p) => p.id === productId);
      if (product) {
        updateItemTotal(index, {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          purchasePrice: Number(product.purchasePrice),
        });
        setShowProductDropdown(null);
        setProductSearch("");
      }
    },
    [filteredProducts, updateItemTotal],
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
    (index: number, field: keyof ExpenseItem, value: string) => {
      setExpenses((prev) => {
        const updated = [...prev];
        const numValue =
          field === "amount" ? Number(parseNumericInput(value)) || 0 : value;
        updated[index] = { ...updated[index], [field]: numValue };
        return updated;
      });
    },
    [],
  );

  const removeExpense = useCallback((index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleNumericChange = useCallback(
    (index: number, field: "quantity" | "purchasePrice", rawValue: string) => {
      const val = Number(parseNumericInput(rawValue)) || 0;
      updateItemTotal(index, {
        [field]: val,
      });
    },
    [updateItemTotal],
  );

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0,
  );
  const totalCost = subtotal + totalExpenses;
  const remaining = totalCost - Number(paid || 0);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const noSuppliers = !loadingData && suppliers.length === 0;
  const noWarehouses = !loadingData && warehouses.length === 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const isDropdown = target.closest("[data-product-dropdown]");
      if (!isDropdown) {
        setShowProductDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onSubmit = useCallback(
    async (formData: PurchaseInvoiceFormData) => {
      if (!canCreate) {
        toast("لا تملك صلاحية إنشاء فاتورة مشتريات", "error");
        return;
      }

      if (!formData.supplierId) {
        toast("الرجاء اختيار المورد", "error");
        return;
      }

      if (!formData.warehouseId) {
        toast("الرجاء اختيار المخزن", "error");
        return;
      }

      if (lineItems.some((item) => !item.productId)) {
        toast("الرجاء اختيار المادة لجميع البنود", "error");
        return;
      }

      if (
        formData.paymentMethod !== "CREDIT" &&
        Number(formData.paid) > 0 &&
        !formData.paymentAccountId
      ) {
        toast("الرجاء اختيار حساب التسديد", "error");
        return;
      }

      setSubmitting(true);
      const payload = {
        ...formData,
        paid: Number(parseNumericInput(String(formData.paid || 0))),
        exchangeRateValue: Number(
          parseNumericInput(String(formData.exchangeRateValue || 0)),
        ),
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
      const json = await safeJson(res);
      setSubmitting(false);

      if (json.success) {
        toast("تم إنشاء فاتورة المشتريات بنجاح", "success");
        onSuccess?.();
      } else {
        toast(json.error || "فشل إنشاء فاتورة المشتريات", "error");
      }
    },
    [canCreate, lineItems, expenses, onSuccess, toast],
  );

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <p className="text-sm text-red-600">{loadError}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* القسم 1: بيانات الفاتورة */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-dark">بيانات الفاتورة</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              type="text"
              inputMode="decimal"
              placeholder="مثال: 1320 أو 1,320"
              {...register("exchangeRateValue")}
              error={errors.exchangeRateValue?.message}
              onChange={(e) => {
                const parsed = parseNumericInput(e.target.value);
                e.target.value = parsed;
                register("exchangeRateValue").onChange(e);
              }}
            />
          )}
        </div>
      </div>

      {/* القسم 2: المورد والمخزن */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-dark">المورد والمخزن</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            {noSuppliers ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                لا يوجد موردون نشطون. الرجاء إضافة مورد أولاً.
              </div>
            ) : (
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
            )}
            {selectedSupplier && (
              <div className="mt-1.5 text-xs text-gray-500">
                الحسابات:{" "}
                {selectedSupplier.accounts
                  .map(
                    (a) =>
                      `${a.currency === "IQD" ? "د.ع" : "$"} ${formatCurrency(a.balance)}`,
                  )
                  .join(" | ")}
              </div>
            )}
          </div>
          <div>
            {noWarehouses ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                لا يوجد مخازن نشطة. الرجاء إضافة مخزن أولاً.
              </div>
            ) : (
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
            )}
          </div>
        </div>
        <div className="mt-4">
          <Textarea
            label="ملاحظات"
            placeholder="ملاحظات إضافية..."
            {...register("notes")}
          />
        </div>
      </div>

      {/* القسم 3: المواد */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-dark">مواد الفاتورة</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
          >
            <Plus className="h-4 w-4" />
            إضافة مادة
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-700">
            لا توجد مواد. الرجاء إضافة مواد أولاً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-600">
                    الكود
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-600">
                    المادة
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-600">
                    الكمية
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-600">
                    سعر الشراء
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-600">
                    تاريخ الإنتاج
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-600">
                    تاريخ الانتهاء
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-600">
                    الإجمالي
                  </th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-border">
                    <td className="px-3 py-2">
                      <div className="relative" data-product-dropdown>
                        <div
                          className="flex h-9 w-32 cursor-pointer items-center rounded-lg border border-border bg-white px-2 text-sm focus-within:ring-2 focus-within:ring-primary"
                          onClick={() =>
                            setShowProductDropdown(
                              showProductDropdown === index ? null : index,
                            )
                          }
                        >
                          <Search className="ml-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                          <span
                            className={
                              item.productCode
                                ? "font-mono text-dark"
                                : "text-gray-400"
                            }
                          >
                            {item.productCode || "اختر كود..."}
                          </span>
                        </div>

                        {showProductDropdown === index && (
                          <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-white shadow-lg">
                            <div className="border-b border-border p-2">
                              <input
                                type="text"
                                className="h-8 w-full rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="بحث بالكود أو الاسم أو الباركود..."
                                value={productSearch}
                                onChange={(e) =>
                                  setProductSearch(e.target.value)
                                }
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredProducts.length === 0 ? (
                                <div className="p-3 text-center text-sm text-gray-400">
                                  لا توجد نتائج
                                </div>
                              ) : (
                                filteredProducts.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-right text-sm hover:bg-muted ${item.productId === p.id ? "bg-primary/10" : ""}`}
                                    onClick={() =>
                                      handleProductSelect(index, p.id)
                                    }
                                  >
                                    <span className="font-mono text-xs text-gray-500 w-20 truncate">
                                      {p.code}
                                    </span>
                                    <span className="flex-1 truncate">
                                      {p.name}
                                    </span>
                                    {p.barcode && (
                                      <span className="text-xs text-gray-400">
                                        {p.barcode}
                                      </span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 min-w-[100px]">
                      {item.productName || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) =>
                          handleNumericChange(index, "quantity", e.target.value)
                        }
                        className="h-9 w-16 rounded-lg border border-border bg-white px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        min="1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.purchasePrice}
                        onChange={(e) =>
                          handleNumericChange(
                            index,
                            "purchasePrice",
                            e.target.value,
                          )
                        }
                        className="h-9 w-24 rounded-lg border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        min="0"
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
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-dark">
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
        )}

        <div className="mt-3 text-left text-sm text-gray-500">
          إجمالي المواد:{" "}
          <span className="font-semibold text-dark">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>

      {/* القسم 4: المصاريف */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-dark">المصاريف</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addExpense}
          >
            <Plus className="h-4 w-4" />
            إضافة مصروف
          </Button>
        </div>

        {expenses.length === 0 && (
          <p className="text-sm text-gray-400">
            لا توجد مصاريف مضافة. يمكنك إضافة مصاريف الشحن والنقل وغيرها.
          </p>
        )}

        <div className="space-y-2">
          {expenses.map((exp, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                placeholder="اسم المصروف"
                value={exp.name}
                onChange={(e) => updateExpense(index, "name", e.target.value)}
                className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="المبلغ"
                value={exp.amount}
                onChange={(e) => updateExpense(index, "amount", e.target.value)}
                className="h-9 w-28 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => removeExpense(index)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {totalExpenses > 0 && (
          <div className="mt-3 text-left text-sm text-gray-500">
            إجمالي المصاريف:{" "}
            <span className="font-semibold text-dark">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        )}
      </div>

      {/* القسم 5: الدفع والإجماليات */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-base font-bold text-dark">طريقة الدفع</h2>
          <div className="space-y-4">
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
              type="text"
              inputMode="decimal"
              placeholder="0"
              {...register("paid")}
              error={errors.paid?.message}
              onChange={(e) => {
                const parsed = parseNumericInput(e.target.value);
                e.target.value = parsed;
                register("paid").onChange(e);
              }}
            />
            {paymentMethod !== "CREDIT" && (
              <div>
                {filteredAccounts.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    لا يوجد حسابات تسديد من عملة{" "}
                    {currency === "IQD" ? "دينار" : "دولار"}.
                  </div>
                ) : (
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
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-base font-bold text-dark">
            إجماليات الفاتورة
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>إجمالي المواد</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>إجمالي المصاريف</span>
              <span>{formatCurrency(totalExpenses)}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg font-bold text-dark">
              <span>إجمالي الكلفة</span>
              <span>
                {formatCurrency(totalCost)}{" "}
                <span className="text-xs font-normal text-gray-500">
                  {currency === "USD" ? "$" : "د.ع"}
                </span>
              </span>
            </div>
            <div className="flex justify-between text-green-700 font-medium">
              <span>المدفوع</span>
              <span>{formatCurrency(Number(paid || 0))}</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-red-700 font-bold">
                <span>الباقي</span>
                <span>{formatCurrency(remaining)}</span>
              </div>
            )}
            {remaining < 0 && (
              <div className="flex justify-between text-amber-700 font-medium">
                <span>زيادة الدفع</span>
                <span>{formatCurrency(Math.abs(remaining))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* زر الحفظ - ثابت وواضح */}
      <div className="sticky bottom-0 z-10 rounded-xl border border-border bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-bold text-dark">
              {formatCurrency(totalCost)}
            </span>{" "}
            {currency === "USD" ? "$" : "د.ع"}
            {" — "}
            <span>{lineItems.length} مواد</span>
            {expenses.length > 0 && <span> | {expenses.length} مصاريف</span>}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || !canCreate || noSuppliers || noWarehouses}
          >
            <Save className="h-5 w-5" />
            {submitting ? "جاري الحفظ..." : "حفظ الفاتورة"}
          </Button>
        </div>
      </div>
    </form>
  );
}
