"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productFormSchema, type ProductFormData } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPES,
  type CustomerType,
} from "@/types";
import { PERMISSIONS } from "@/lib/permissions";
import { useMemo, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { parseNumericInput } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface ProductFormProps {
  defaultValues?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => Promise<void>;
  loading?: boolean;
  categories: Category[];
  onCategoriesChange?: (categories: Category[]) => void;
  userPermissions: string[];
}

export function ProductForm({
  defaultValues,
  onSubmit,
  categories,
  onCategoriesChange,
  userPermissions,
}: ProductFormProps) {
  const { toast } = useToast();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategoryLoading, setAddingCategoryLoading] = useState(false);
  const [deleteCategoryTarget, setDeleteCategoryTarget] =
    useState<Category | null>(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);

  const canViewPurchasePrice = userPermissions.includes(
    PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE,
  );
  const canEditPrices = userPermissions.includes(
    PERMISSIONS.PRODUCTS_EDIT_PRICE,
  );
  const canCreate = userPermissions.includes(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = userPermissions.includes(PERMISSIONS.PRODUCTS_EDIT);
  const isEditing = !!defaultValues?.name;
  const canSubmit = isEditing ? canEdit : canCreate;

  const defaultPrices = useMemo(() => {
    if (defaultValues?.prices && defaultValues.prices.length > 0) {
      return defaultValues.prices.map((p) => ({
        customerType: p.customerType,
        price: p.price,
        currency: p.currency || "IQD",
      }));
    }
    return CUSTOMER_TYPES.map((t) => ({
      customerType: t,
      price: 0,
      currency: "IQD" as const,
    }));
  }, [defaultValues]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(
      productFormSchema,
    ) as unknown as import("react-hook-form").Resolver<ProductFormData>,
    defaultValues: {
      name: "",
      code: "",
      barcode: "",
      categoryId: "",
      packaging: "قطعة",
      piecesPerCarton: 0,
      purchasePrice: 0,
      purchaseCurrency: "IQD",
      prices: defaultPrices,
      ...defaultValues,
    },
  });

  const selectedPackaging = useWatch({ control, name: "packaging" });
  const watchedPrices = useWatch({ control, name: "prices" });
  const watchedPiecesPerCarton = useWatch({ control, name: "piecesPerCarton" });
  const watchedPurchasePrice = useWatch({ control, name: "purchasePrice" });

  const cartonPrices = useMemo(() => {
    if (selectedPackaging !== "كارتون" || !watchedPiecesPerCarton) return null;
    const qty = Number(watchedPiecesPerCarton);
    if (qty <= 0) return null;
    const result: Record<string, number> = {};
    if (canViewPurchasePrice && watchedPurchasePrice) {
      result["سعر شراء"] = Number(watchedPurchasePrice) * qty;
    }
    watchedPrices?.forEach((p, i) => {
      const label = CUSTOMER_TYPE_LABELS[CUSTOMER_TYPES[i] as CustomerType];
      result[label] = Number(p.price) * qty;
    });
    return result;
  }, [
    selectedPackaging,
    watchedPiecesPerCarton,
    watchedPurchasePrice,
    watchedPrices,
    canViewPurchasePrice,
  ]);

  const handleFormSubmit = useCallback(
    async (data: ProductFormData) => {
      const converted: ProductFormData = {
        ...data,
        code: parseNumericInput(data.code),
        purchasePrice: Number(
          parseNumericInput(String(data.purchasePrice ?? 0)),
        ),
        piecesPerCarton: Number(
          parseNumericInput(String(data.piecesPerCarton ?? 0)),
        ),
        prices: data.prices?.map((p) => ({
          ...p,
          price: Number(parseNumericInput(String(p.price ?? 0))),
        })),
      };
      await onSubmit(converted);
    },
    [onSubmit],
  );

  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      toast("الرجاء إدخال اسم المجموعة", "error");
      return;
    }
    setAddingCategoryLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء المجموعة");
      const newCat = json.data as Category;
      const updated = [...categories, newCat];
      onCategoriesChange?.(updated);
      setValue("categoryId", newCat.id);
      setNewCategoryName("");
      setAddingCategory(false);
      toast("تم إنشاء المجموعة بنجاح", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل إنشاء المجموعة";
      toast(msg, "error");
    } finally {
      setAddingCategoryLoading(false);
    }
  }

  async function handleDeleteCategory(cat: Category) {
    setDeleteCategoryLoading(true);
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف المجموعة");
      const updated = categories.filter((c) => c.id !== cat.id);
      onCategoriesChange?.(updated);
      if (getValues("categoryId") === cat.id) {
        setValue("categoryId", "");
      }
      setDeleteCategoryTarget(null);
      toast("تم حذف المجموعة بنجاح", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "فشل حذف المجموعة";
      toast(msg, "error");
    } finally {
      setDeleteCategoryLoading(false);
    }
  }

  function onArabicInput(e: React.FormEvent<HTMLInputElement>) {
    const target = e.target as HTMLInputElement;
    target.value = parseNumericInput(target.value);
  }

  function onArabicInputCode(e: React.FormEvent<HTMLInputElement>) {
    const target = e.target as HTMLInputElement;
    target.value = parseNumericInput(target.value);
  }

  if (!canSubmit) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-600">
        {isEditing
          ? "لا تملك صلاحية تعديل المواد"
          : "لا تملك صلاحية إنشاء مواد"}
      </div>
    );
  }

  return (
    <form id="product-form" onSubmit={handleSubmit(handleFormSubmit)}>
      {/* القسم 1: البيانات الأساسية */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-dark border-b border-border pb-2">
          البيانات الأساسية
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="اسم المادة"
            error={errors.name?.message}
            {...register("name")}
            required
          />
          <Input
            label="كود المادة"
            error={errors.code?.message}
            {...register("code")}
            onInput={onArabicInputCode}
            required
          />
          <Input
            label="الباركود"
            error={errors.barcode?.message}
            {...register("barcode")}
            dir="ltr"
          />
          <div className="space-y-1">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  label="المجموعة"
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  placeholder="اختر مجموعة"
                  error={errors.categoryId?.message}
                  {...register("categoryId")}
                />
              </div>
              {!addingCategory ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mb-1"
                  onClick={() => setAddingCategory(true)}
                >
                  <Plus className="h-4 w-4" />
                  إضافة
                </Button>
              ) : null}
            </div>
            {addingCategory && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                <Input
                  placeholder="اسم المجموعة الجديدة"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="h-9 text-sm"
                  dir="rtl"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCategory}
                  disabled={addingCategoryLoading}
                >
                  {addingCategoryLoading ? "..." : "حفظ"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAddingCategory(false);
                    setNewCategoryName("");
                  }}
                >
                  إلغاء
                </Button>
              </div>
            )}
            {categories.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 pt-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1 text-sm"
                  >
                    <span>{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => setDeleteCategoryTarget(cat)}
                      className="rounded p-0.5 text-gray-400 hover:text-red-600"
                      title="حذف المجموعة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* القسم 2: التعبئة */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-dark border-b border-border pb-2">
          التعبئة
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="نوع التعبئة"
            options={[
              { value: "قطعة", label: "قطعة" },
              { value: "كارتون", label: "كارتون" },
            ]}
            error={errors.packaging?.message}
            {...register("packaging")}
          />
          <Input
            label="عدد القطع في الكارتون"
            inputMode="numeric"
            disabled={selectedPackaging !== "كارتون"}
            error={errors.piecesPerCarton?.message}
            {...register("piecesPerCarton")}
            onInput={onArabicInput}
          />
        </div>
        {cartonPrices && (
          <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              أسعار الكارتون المحسوبة (سعر القطعة × {watchedPiecesPerCarton})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              {Object.entries(cartonPrices).map(([label, total]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-blue-700">{label}:</span>
                  <span className="font-mono font-semibold text-blue-900" dir="ltr">
                    {total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* القسم 3: سعر الشراء */}
      {canViewPurchasePrice && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-dark border-b border-border pb-2">
            سعر الشراء
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="سعر الشراء (للقطعة)"
              inputMode="decimal"
              error={errors.purchasePrice?.message}
              {...register("purchasePrice")}
              onInput={onArabicInput}
            />
            <Select
              label="عملة الشراء"
              options={[
                { value: "USD", label: "USD" },
                { value: "IQD", label: "IQD" },
              ]}
              error={errors.purchaseCurrency?.message}
              {...register("purchaseCurrency")}
            />
          </div>
        </div>
      )}

      {/* القسم 4: أسعار البيع */}
      {canEditPrices && (
        <div className="mb-2">
          <h3 className="mb-3 text-sm font-semibold text-dark border-b border-border pb-2">
            أسعار البيع (سعر القطعة)
          </h3>
          <div className="space-y-3">
            {CUSTOMER_TYPES.map((type, idx) => (
              <div
                key={type}
                className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
              >
                <input
                  type="hidden"
                  {...register(`prices.${idx}.customerType`)}
                  value={type}
                />
                <div className="sm:w-24 shrink-0 text-sm font-medium text-dark">
                  {CUSTOMER_TYPE_LABELS[type as CustomerType]}
                </div>
                <div className="flex-1">
                  <Input
                    label="السعر"
                    inputMode="decimal"
                    {...register(`prices.${idx}.price`)}
                    error={errors.prices?.[idx]?.price?.message}
                    onInput={onArabicInput}
                  />
                </div>
                <div className="sm:w-28">
                  <Select
                    label="العملة"
                    options={[
                      { value: "USD", label: "USD" },
                      { value: "IQD", label: "IQD" },
                    ]}
                    {...register(`prices.${idx}.currency`)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteCategoryTarget}
        onClose={() => setDeleteCategoryTarget(null)}
        onConfirm={() =>
          deleteCategoryTarget && handleDeleteCategory(deleteCategoryTarget)
        }
        title="حذف مجموعة"
        message={`هل أنت متأكد من حذف المجموعة "${deleteCategoryTarget?.name}"؟`}
        confirmLabel="حذف"
        loading={deleteCategoryLoading}
      />
    </form>
  );
}
