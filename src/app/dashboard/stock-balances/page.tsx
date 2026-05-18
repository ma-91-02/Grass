"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Boxes } from "lucide-react";

interface StockBalance {
  id: string;
  productName: string | null;
  productCode: string | null;
  warehouseName: string | null;
  quantityOnHand: number;
  availableQuantity: number;
  averageCost: number;
  totalValue: number;
  currency: string;
}

export default function StockBalancesPage() {
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
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

  const warehouses = [
    ...new Set(
      balances.map((b) => b.warehouseName).filter((w): w is string => !!w),
    ),
  ];

  const filtered = balances.filter((b) => {
    const matchesSearch =
      !search ||
      (b.productName?.includes(search) ?? false) ||
      (b.productCode?.includes(search) ?? false);
    const matchesWarehouse =
      !warehouseFilter || b.warehouseName === warehouseFilter;
    return matchesSearch && matchesWarehouse;
  });

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
      render: (b) => <span>{b.quantityOnHand.toLocaleString()}</span>,
    },
    {
      key: "availableQuantity",
      header: "المتاح",
      render: (b) => <span>{b.availableQuantity.toLocaleString()}</span>,
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

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
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
            <div className="min-w-[200px]">
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
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
      />
    </div>
  );
}
