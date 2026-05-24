"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Boxes, Package, AlertTriangle, Ban } from "lucide-react";

interface StockBalance {
  id: string;
  productId: string;
  productName: string | null;
  productCode: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  quantityOnHand: number;
  availableQuantity: number;
  averageCost: number;
  totalValue: number;
  currency: string;
}

type StockStatus = "all" | "in_stock" | "low_stock" | "out_of_stock" | "negative";

function getStockStatus(qty: number): {
  label: string;
  color: string;
  variant: "default" | "success" | "warning" | "danger" | "info";
} {
  if (qty < 0) return { label: "سالب", color: "bg-red-100 text-red-700", variant: "danger" };
  if (qty === 0) return { label: "نفاد", color: "bg-amber-100 text-amber-700", variant: "warning" };
  if (qty <= 10) return { label: "منخفض", color: "bg-yellow-100 text-yellow-700", variant: "warning" };
  return { label: "متوفر", color: "bg-green-100 text-green-700", variant: "success" };
}

const statusFilterOptions: { value: StockStatus; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "in_stock", label: "متوفر" },
  { value: "low_stock", label: "منخفض (≤10)" },
  { value: "out_of_stock", label: "نفاد (0)" },
  { value: "negative", label: "سالب (<0)" },
];

export default function StockBalancesPage() {
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatus>("all");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const cid = d.data?.companyId || null;
        if (!cid) {
          setAuthError("لم يتم العثور على شركة مرتبطة بالمستخدم");
        }
        setUserCompanyId(cid);
      })
      .catch(() => {
        setAuthError("تعذر تحميل بيانات الشركة");
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const {
    data: balances = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["stock-balances", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/stock-balances?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الأرصدة");
      return json.data as StockBalance[];
    },
    enabled: !!userCompanyId,
  });

  const warehouses = useMemo(
    () =>
      [...new Set(
        balances.map((b) => b.warehouseName).filter((w): w is string => !!w),
      )],
    [balances],
  );

  const filtered = useMemo(() => {
    return balances.filter((b) => {
      const matchesSearch =
        !search ||
        (b.productName?.includes(search) ?? false) ||
        (b.productCode?.includes(search) ?? false);
      const matchesWarehouse =
        !warehouseFilter || b.warehouseName === warehouseFilter;

      let matchesStatus = true;
      if (statusFilter === "negative") matchesStatus = b.quantityOnHand < 0;
      else if (statusFilter === "out_of_stock")
        matchesStatus = b.quantityOnHand === 0;
      else if (statusFilter === "low_stock")
        matchesStatus = b.quantityOnHand > 0 && b.quantityOnHand <= 10;
      else if (statusFilter === "in_stock")
        matchesStatus = b.quantityOnHand > 10;

      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [balances, search, warehouseFilter, statusFilter]);

  const summary = useMemo(() => {
    const totalProducts = new Set(filtered.map((b) => b.productId)).size;
    const totalQty = filtered.reduce((s, b) => s + b.quantityOnHand, 0);
    const outOfStock = filtered.filter((b) => b.quantityOnHand === 0).length;
    const negative = filtered.filter((b) => b.quantityOnHand < 0).length;
    return { totalProducts, totalQty, outOfStock, negative };
  }, [filtered]);

  const hasFilters = search || warehouseFilter || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setWarehouseFilter("");
    setStatusFilter("all");
  };

  const columns: Column<StockBalance>[] = [
    {
      key: "productName",
      header: "المادة",
      render: (b) => (
        <div>
          <p className="font-medium">{b.productName || "—"}</p>
          <p className="text-xs text-gray-500">{b.productCode || "—"}</p>
        </div>
      ),
    },
    {
      key: "warehouseName",
      header: "المخزن",
      render: (b) => <span>{b.warehouseName || "—"}</span>,
    },
    {
      key: "quantityOnHand",
      header: "الكمية",
      render: (b) => {
        const status = getStockStatus(b.quantityOnHand);
        return (
          <div className="flex items-center gap-2">
            <span
              className={`font-mono font-medium ${
                b.quantityOnHand < 0
                  ? "text-red-600"
                  : b.quantityOnHand === 0
                    ? "text-amber-600"
                    : ""
              }`}
            >
              {b.quantityOnHand.toLocaleString()}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        );
      },
    },
    {
      key: "availableQuantity",
      header: "المتاح",
      render: (b) => (
        <span className="font-mono">{b.availableQuantity.toLocaleString()}</span>
      ),
    },
    {
      key: "averageCost",
      header: "متوسط التكلفة",
      render: (b) => (
        <span>
          {b.averageCost.toLocaleString()} {b.currency}
        </span>
      ),
    },
    {
      key: "totalValue",
      header: "القيمة الإجمالية",
      render: (b) => (
        <span className="font-medium">
          {b.totalValue.toLocaleString()} {b.currency}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="أرصدة المخزن"
        description="عرض الكميات والتكاليف لكل مادة في كل مخزن"
      />

      {isLoadingAuth && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      )}

      {authError && !isLoadingAuth && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
          {authError}
        </div>
      )}

      {!isLoadingAuth && !authError && (
        <>
          {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المواد</p>
              <p className="text-2xl font-bold">{summary.totalProducts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-50 p-3">
              <Boxes className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الكمية</p>
              <p className="text-2xl font-bold">
                {summary.totalQty.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-amber-50 p-3">
              <Ban className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نفاد المخزون</p>
              <p className="text-2xl font-bold">{summary.outOfStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-red-50 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">كميات سالبة</p>
              <p className="text-2xl font-bold">{summary.negative}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="mb-2 block text-sm">بحث</Label>
              <div className="relative">
                <Boxes className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="اسم المادة أو الكود..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <div className="min-w-[180px]">
              <Label className="mb-2 block text-sm">المخزن</Label>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">جميع المخازن</option>
                {warehouses.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px]">
              <Label className="mb-2 block text-sm">حالة المخزون</Label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StockStatus)
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                {statusFilterOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mb-0.5 text-sm text-primary hover:underline"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
          <div className="mt-3 text-sm text-gray-500">
            {filtered.length} سجل من أصل {balances.length}
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
      />
        </>
      )}
    </div>
  );
}
