"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, X, Package, Warehouse } from "lucide-react";

interface ValuationProduct {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  categoryId: string | null;
  categoryName: string | null;
  quantity: number;
  availableQuantity: number;
  totalValue: number;
  averageCost: number;
}

interface ValuationWarehouse {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  quantity: number;
  availableQuantity: number;
  totalValue: number;
  averageCost: number;
}

interface ValuationData {
  totalQuantity: number;
  totalAvailableQuantity: number;
  totalValue: number;
  currency: string;
  overallAverageCost: number;
  itemCount: number;
  byWarehouse: ValuationWarehouse[];
  byProduct: ValuationProduct[];
}

function formatNumber(n: number): string {
  return n.toLocaleString("ar-IQ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type ViewMode = "product" | "warehouse";

export default function InventoryValuationPage() {
  const [authData, setAuthData] = useState<{ permissions?: string[]; displayRole?: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [qtyFilter, setQtyFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("product");

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "فشل تحميل بيانات الجلسة");
        setAuthData(d.data);
      })
      .catch((err) => {
        setAuthError(
          err instanceof Error ? err.message : "تعذر تحميل بيانات المستخدم",
        );
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const {
    data: valuation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["inventory-valuation"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/valuation");
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل تقييم المخزون");
      return json.data as ValuationData;
    },
    enabled: !isLoadingAuth && !!authData,
  });

  const products: ValuationProduct[] = (valuation?.byProduct || []).map((p) => ({
    ...p,
    id: p.productId,
  }));
  const warehouses: ValuationWarehouse[] = (valuation?.byWarehouse || []).map(
    (w) => ({
      ...w,
      id: w.warehouseId,
    }),
  );

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.productName.includes(search) ||
      p.productCode.includes(search);
    let matchesQty = true;
    if (qtyFilter === "positive") matchesQty = p.quantity > 0;
    else if (qtyFilter === "zero") matchesQty = p.quantity === 0;
    else if (qtyFilter === "negative") matchesQty = p.quantity < 0;
    return matchesSearch && matchesQty;
  });

  const filteredWarehouses = warehouses.filter((w) => {
    const matchesSearch =
      !search ||
      w.warehouseName.includes(search) ||
      w.warehouseCode.includes(search);
    let matchesQty = true;
    if (qtyFilter === "positive") matchesQty = w.quantity > 0;
    else if (qtyFilter === "zero") matchesQty = w.quantity === 0;
    else if (qtyFilter === "negative") matchesQty = w.quantity < 0;
    return matchesSearch && matchesQty;
  });

  const hasFilters = !!search || !!qtyFilter;
  const clearFilters = () => {
    setSearch("");
    setQtyFilter("");
  };

  const productColumns: Column<ValuationProduct>[] = [
    {
      key: "productCode",
      header: "كود المادة",
      render: (p) => (
        <span className="font-mono text-xs text-gray-500">{p.productCode}</span>
      ),
      sortable: true,
    },
    {
      key: "productName",
      header: "المادة",
      render: (p) => <span className="font-medium">{p.productName}</span>,
      sortable: true,
    },
    {
      key: "categoryName",
      header: "التصنيف",
      render: (p) => (
        <span className="text-xs text-gray-500">{p.categoryName || "-"}</span>
      ),
      sortable: true,
    },
    {
      key: "quantity",
      header: "الكمية",
      render: (p) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(p.quantity)}</span>
      ),
      sortable: true,
    },
    {
      key: "availableQuantity",
      header: "المتاح",
      render: (p) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(p.availableQuantity)}</span>
      ),
      sortable: true,
    },
    {
      key: "averageCost",
      header: "متوسط التكلفة",
      render: (p) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(p.averageCost)}</span>
      ),
      sortable: true,
    },
    {
      key: "totalValue",
      header: "القيمة الإجمالية",
      render: (p) => (
        <span dir="ltr" className="font-mono text-xs font-medium">{formatNumber(p.totalValue)}</span>
      ),
      sortable: true,
    },
  ];

  const warehouseColumns: Column<ValuationWarehouse>[] = [
    {
      key: "warehouseCode",
      header: "كود المخزن",
      render: (w) => (
        <span className="font-mono text-xs text-gray-500">{w.warehouseCode}</span>
      ),
      sortable: true,
    },
    {
      key: "warehouseName",
      header: "المخزن",
      render: (w) => <span className="font-medium">{w.warehouseName}</span>,
      sortable: true,
    },
    {
      key: "quantity",
      header: "الكمية",
      render: (w) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(w.quantity)}</span>
      ),
      sortable: true,
    },
    {
      key: "availableQuantity",
      header: "المتاح",
      render: (w) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(w.availableQuantity)}</span>
      ),
      sortable: true,
    },
    {
      key: "averageCost",
      header: "متوسط التكلفة",
      render: (w) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(w.averageCost)}</span>
      ),
      sortable: true,
    },
    {
      key: "totalValue",
      header: "القيمة الإجمالية",
      render: (w) => (
        <span dir="ltr" className="font-mono text-xs font-medium">{formatNumber(w.totalValue)}</span>
      ),
      sortable: true,
    },
  ];

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-600">{authError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقييم المخزون"
        description="عرض قيمة المخزون حسب المواد والمخازن"
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-medium text-red-600">
            {error instanceof Error ? error.message : "فشل تحميل البيانات"}
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : valuation ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "إجمالي المواد", value: valuation.itemCount, format: false },
              { label: "إجمالي الكمية", value: valuation.totalQuantity, format: true },
              { label: "الكمية المتاحة", value: valuation.totalAvailableQuantity, format: true },
              { label: "إجمالي القيمة", value: valuation.totalValue, format: true },
              { label: "متوسط التكلفة", value: valuation.overallAverageCost, format: true },
              { label: "العملة", value: valuation.currency, format: false },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-white p-4"
              >
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="mt-1 text-lg font-bold text-dark" dir="ltr">
                  {card.format ? formatNumber(card.value as number) : card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("product")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "product"
                    ? "border-primary bg-primary text-white"
                    : "border-border text-gray-600 hover:bg-muted",
                )}
              >
                <Package className="h-4 w-4" />
                حسب المادة
              </button>
              <button
                onClick={() => setViewMode("warehouse")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  viewMode === "warehouse"
                    ? "border-primary bg-primary text-white"
                    : "border-border text-gray-600 hover:bg-muted",
                )}
              >
                <Warehouse className="h-4 w-4" />
                حسب المخزن
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={qtyFilter}
              onChange={(e) => setQtyFilter(e.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-dark"
            >
              <option value="">كل الكميات</option>
              <option value="positive">كمية &gt; 0</option>
              <option value="zero">كمية = 0</option>
              <option value="negative">كمية &lt; 0</option>
            </select>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4" />
                مسح الفلاتر
              </Button>
            )}
          </div>

          {viewMode === "product" ? (
            <DataTable
              columns={productColumns}
              data={filteredProducts}
              searchPlaceholder=""
            />
          ) : (
            <DataTable
              columns={warehouseColumns}
              data={filteredWarehouses}
              searchPlaceholder=""
            />
          )}
        </>
      ) : null}
    </div>
  );
}
