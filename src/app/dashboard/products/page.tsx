"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProductForm } from "@/components/forms/product-form";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { type CustomerType } from "@/types";
import type { TokenPayload } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  Edit,
  Ban,
  CheckCircle,
  Trash2,
} from "lucide-react";

interface ProductPrice {
  id: string;
  customerType: CustomerType;
  price: number;
  currency: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  packaging: string;
  piecesPerCarton: number;
  unit: string;
  purchasePrice: number;
  purchaseCurrency: string;
  isActive: boolean;
  prices: ProductPrice[];
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [hardDeleteItem, setHardDeleteItem] = useState<Product | null>(null);
  const [toggleItem, setToggleItem] = useState<Product | null>(null);
  const [user, setUser] = useState<TokenPayload | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.data))
      .catch(() => {});
  }, []);

  const userPermissions = user?.permissions || [];
  const canViewPurchasePrice = userPermissions.includes(
    PERMISSIONS.PRODUCTS_VIEW_PURCHASE_PRICE,
  );
  const canCreate = userPermissions.includes(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = userPermissions.includes(PERMISSIONS.PRODUCTS_EDIT);
  const canDelete = userPermissions.includes(PERMISSIONS.PRODUCTS_DELETE);

  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المواد");
      return json.data as Product[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      const json = await res.json();
      return json.data as Category[];
    },
  });

  const filtered = products.filter(
    (p) =>
      p.name.includes(search) ||
      p.code.includes(search) ||
      p.barcode?.includes(search) ||
      p.categoryName?.includes(search),
  );

  const createMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل إنشاء المادة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast("تم إنشاء المادة بنجاح", "success");
      setDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: unknown }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحديث المادة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast("تم تحديث المادة بنجاح", "success");
      setEditItem(null);
      setDialogOpen(false);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تغيير الحالة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast("تم تغيير الحالة بنجاح", "success");
      setToggleItem(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل حذف المادة");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast("تم حذف المادة نهائياً", "success");
      setHardDeleteItem(null);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const openAdd = () => {
    setEditItem(null);
    setDialogOpen(true);
  };
  const openEdit = (item: Product) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleSubmit = useCallback(
    async (data: unknown) => {
      if (editItem) updateMutation.mutate({ id: editItem.id, data });
      else createMutation.mutate(data);
    },
    [editItem, updateMutation, createMutation],
  );

  const isLoading =
    createMutation.isPending || updateMutation.isPending;

  const columns = [
    {
      key: "code",
      header: "الكود",
      render: (p: Product) => (
        <span className="font-mono text-xs text-gray-500">{p.code}</span>
      ),
      sortable: true,
    },
    {
      key: "name",
      header: "الاسم",
      render: (p: Product) => <span className="font-medium">{p.name}</span>,
      sortable: true,
    },
    {
      key: "barcode",
      header: "الباركود",
      render: (p: Product) => (
        <span dir="ltr" className="text-xs text-gray-500">
          {p.barcode || "-"}
        </span>
      ),
    },
    {
      key: "categoryName",
      header: "المجموعة",
      render: (p: Product) => <span>{p.categoryName || "-"}</span>,
    },
    {
      key: "packaging",
      header: "التعبئة",
      render: (p: Product) => <span>{p.packaging}</span>,
    },
    {
      key: "piecesPerCarton",
      header: "قطع/كارتون",
      render: (p: Product) => (
        <span>{p.packaging === "كارتون" ? p.piecesPerCarton : "-"}</span>
      ),
    },
    ...(canViewPurchasePrice
      ? [
          {
            key: "purchasePrice" as string,
            header: "سعر الشراء",
            render: (p: Product) => (
              <span>
                {formatCurrency(p.purchasePrice)} {p.purchaseCurrency}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "isActive",
      header: "الحالة",
      render: (p: Product) => (
        <Badge variant={p.isActive ? "success" : "danger"}>
          {p.isActive ? "نشط" : "معطل"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="المواد"
        description="إدارة المواد والمنتجات"
        actionLabel={canCreate ? "مادة جديدة" : undefined}
        onAction={canCreate ? openAdd : undefined}
      />

      <DataTable
        columns={
          columns as import("@/components/shared/data-table").Column<Product>[]
        }
        data={filtered}
        loading={productsLoading}
        error={productsError instanceof Error ? productsError.message : null}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم أو الكود أو الباركود..."
        actions={(item: Product) => (
          <div className="flex items-center justify-center gap-1">
            {canEdit && (
              <button
                onClick={() => openEdit(item)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                title="تعديل"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setToggleItem(item)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-amber-600"
                title={item.isActive ? "تعطيل" : "تفعيل"}
              >
                {item.isActive ? (
                  <Ban className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setHardDeleteItem(item)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                title="حذف نهائي"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditItem(null);
        }}
        title={editItem ? "تعديل مادة" : "إضافة مادة جديدة"}
        className="max-w-2xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditItem(null);
              }}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" form="product-form" disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </>
        }
      >
        <ProductForm
          defaultValues={
            editItem
              ? {
                  name: editItem.name,
                  code: editItem.code,
                  barcode: editItem.barcode || "",
                  categoryId: editItem.categoryId || "",
                  packaging:
                    (editItem.packaging as "قطعة" | "كارتون") || "قطعة",
                  piecesPerCarton: editItem.piecesPerCarton,
                  purchasePrice: editItem.purchasePrice,
                  purchaseCurrency:
                    (editItem.purchaseCurrency as "USD" | "IQD") || "IQD",
                  prices: editItem.prices.map((p) => ({
                    customerType: p.customerType,
                    price: p.price,
                    currency: (p.currency as "USD" | "IQD") || "IQD",
                  })),
                }
              : undefined
          }
          onSubmit={handleSubmit}
          loading={isLoading}
          categories={categories}
          onCategoriesChange={(updated) => {
            qc.setQueryData(["categories"], updated);
          }}
          userPermissions={userPermissions}
        />
      </Dialog>

      <ConfirmDialog
        open={!!toggleItem}
        onClose={() => setToggleItem(null)}
        onConfirm={() =>
          toggleItem &&
          toggleMutation.mutate({
            id: toggleItem.id,
            isActive: !toggleItem.isActive,
          })
        }
        title={toggleItem?.isActive ? "تعطيل مادة" : "تفعيل مادة"}
        message={`هل أنت متأكد من ${toggleItem?.isActive ? "تعطيل" : "تفعيل"} المادة "${toggleItem?.name}"؟`}
        confirmLabel={toggleItem?.isActive ? "تعطيل" : "تفعيل"}
        loading={toggleMutation.isPending}
      />

      <ConfirmDialog
        open={!!hardDeleteItem}
        onClose={() => setHardDeleteItem(null)}
        onConfirm={() => hardDeleteItem && hardDeleteMutation.mutate(hardDeleteItem.id)}
        title="حذف مادة نهائياً"
        message={`هل أنت متأكد من حذف المادة "${hardDeleteItem?.name}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائي"
        loading={hardDeleteMutation.isPending}
      />
    </div>
  );
}
