"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  status: string;
  adjustmentType: string;
  adjustmentDate: string;
  reason: string | null;
  notes: string | null;
  warehouse: {
    name: string;
    code: string;
  } | null;
  lines: {
    id: string;
    product: { name: string; code: string } | null;
    quantity: number;
  }[];
  createdBy: { name: string } | null;
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
    POSTED: { label: "مرحّل", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "ملغى", color: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, color: "bg-gray-100" };
  return <Badge className={s.color}>{s.label}</Badge>;
};

const typeBadge = (type: string) => {
  const label = type === "IN" ? "تسوية زيادة" : type === "OUT" ? "تسوية نقص" : type;
  const color =
    type === "IN"
      ? "bg-green-100 text-green-700"
      : type === "OUT"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-700";
  return <Badge className={color}>{label}</Badge>;
};

export default function StockAdjustmentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
    data: adjustments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["stock-adjustments", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/stock-adjustments?${params.toString()}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل التسويات");
      return json.data as StockAdjustment[];
    },
    enabled: !!userCompanyId,
  });

  const warehouses = useMemo(
    () =>
      [...new Set(
        adjustments.map((a) => a.warehouse?.name).filter((w): w is string => !!w),
      )],
    [adjustments],
  );

  const filtered = useMemo(() => {
    return adjustments.filter((a) => {
      const matchesSearch =
        !search ||
        a.adjustmentNumber?.includes(search) ||
        a.warehouse?.name?.includes(search) ||
        a.reason?.includes(search) ||
        a.notes?.includes(search);
      const matchesWarehouse =
        !warehouseFilter || a.warehouse?.name === warehouseFilter;
      const matchesStatus = !statusFilter || a.status === statusFilter;
      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [adjustments, search, warehouseFilter, statusFilter]);

  const hasFilters = search || warehouseFilter || statusFilter;

  const clearFilters = () => {
    setSearch("");
    setWarehouseFilter("");
    setStatusFilter("");
  };

  const columns: Column<StockAdjustment>[] = [
    {
      key: "adjustmentNumber",
      header: "رقم التسوية",
      render: (a) => (
        <span className="font-medium">{a.adjustmentNumber}</span>
      ),
    },
    {
      key: "adjustmentDate",
      header: "التاريخ",
      render: (a) => (
        <span>{new Date(a.adjustmentDate).toLocaleDateString("ar-IQ")}</span>
      ),
    },
    {
      key: "warehouse",
      header: "المخزن",
      render: (a) => <span>{a.warehouse?.name || "—"}</span>,
    },
    {
      key: "adjustmentType",
      header: "النوع",
      render: (a) => typeBadge(a.adjustmentType),
    },
    {
      key: "status",
      header: "الحالة",
      render: (a) => statusBadge(a.status),
    },
    {
      key: "lines",
      header: "البنود",
      render: (a) => <span>{a.lines.length}</span>,
    },
    {
      key: "reason",
      header: "السبب",
      render: (a) => (
        <span className="text-sm">{a.reason || a.notes || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="تسويات المخزن"
        description="عرض تسويات المخزن (زيادة ونقص)"
        actionLabel="تسوية جديدة"
        onAction={() => router.push("/dashboard/stock-adjustments/new")}
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
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label className="mb-2 block text-sm">بحث</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="رقم التسوية أو المخزن..."
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
                <div className="min-w-[130px]">
                  <Label className="mb-2 block text-sm">الحالة</Label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">الكل</option>
                    <option value="DRAFT">مسودة</option>
                    <option value="POSTED">مرحّل</option>
                    <option value="CANCELLED">ملغى</option>
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
                {filtered.length} سجل من أصل {adjustments.length}
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
