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
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";

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
  loading,
  categories,
  onCategoriesChange,
  userPermissions,
}: ProductFormProps) {
  const { toast } = useToast();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategoryLoading, setAddingCategoryLoading] = useState(false);

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
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(
      productFormSchema,
    ) as unknown as import("react-hook-form").Resolver<ProductFormData>,
    defaultValues: {
      name: "",
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
      onCategoriesChange?.([...categories, newCat]);
      setValue("categoryId", newCat.id);
      setNewCategoryName("");
      setAddingCategory(false);
      toast("تم إنشاء المجموعة بنجاح", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "فشل إنشاء المجموعة", "error");
    } finally {
      setAddingCategoryLoading(false);
    }
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="اسم المادة"
          error={errors.name?.message}
          {...register("name")}
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
        </div>

        <Select
          label="التعبئة"
          options={[
            { value: "قطعة", label: "قطعة" },
            { value: "كارتون", label: "كارتون" },
          ]}
          error={errors.packaging?.message}
          {...register("packaging")}
        />

        <Input
          label="عدد القطع في الكارتون"
          type="number"
          disabled={selectedPackaging !== "كارتون"}
          error={errors.piecesPerCarton?.message}
          {...register("piecesPerCarton")}
        />

        {canViewPurchasePrice && (
          <>
            <Input
              label="سعر الشراء"
              type="number"
              error={errors.purchasePrice?.message}
              {...register("purchasePrice")}
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
          </>
        )}
      </div>

      {canEditPrices && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-dark">
            أسعار البيع حسب نوع العميل
          </h3>
          <div className="space-y-3">
            {CUSTOMER_TYPES.map((type, idx) => (
              <div key={type} className="grid grid-cols-3 gap-3 items-end">
                <input
                  type="hidden"
                  {...register(`prices.${idx}.customerType`)}
                  value={type}
                />
                <div className="text-sm font-medium text-dark pt-2">
                  {CUSTOMER_TYPE_LABELS[type as CustomerType]}
                </div>
                <Input
                  label="السعر"
                  type="number"
                  {...register(`prices.${idx}.price`)}
                  error={errors.prices?.[idx]?.price?.message}
                />
                <Select
                  label="العملة"
                  options={[
                    { value: "USD", label: "USD" },
                    { value: "IQD", label: "IQD" },
                  ]}
                  {...register(`prices.${idx}.currency`)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
