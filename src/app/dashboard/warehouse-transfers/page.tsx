"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Eye } from "lucide-react";

interface TransferLine {
  id: string;
  quantity: number;
  unitCost: number;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  status: string;
  transferDate: string;
  notes: string | null;
  fromWarehouse: { name: string; code: string } | null;
  toWarehouse: { name: string; code: string } | null;
  lines: TransferLine[];
  createdBy: { name: string } | null;
  createdAt: string;
  updatedAt: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
    DRAFT: { label: "مسودة", variant: "warning" },
    POSTED: { label: "مرحّل", variant: "success" },
    CANCELLED: { label: "ملغى", variant: "danger" },
  };
  const s = map[status] || { label: status, variant: "default" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

function formatNumber(n: number): string {
  return n.toLocaleString("ar-IQ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function WarehouseTransfersPage() {
  const router = useRouter();
  const [authData, setAuthData] = useState<{ permissions?: string[] } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

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

  const permissions = authData?.permissions || [];
  const canCreate = permissions.includes("stockTransfers.create");

  const {
    data: transfers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["stock-transfers"],
    queryFn: async () => {
      const res = await fetch("/api/stock-transfers");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل التحويلات");
      return json.data as StockTransfer[];
    },
    enabled: !isLoadingAuth && !!authData,
  });

  const filtered = transfers.filter((t) => {
    const matchesSearch =
      !search ||
      t.transferNumber.includes(search) ||
      t.fromWarehouse?.name?.includes(search) ||
      t.toWarehouse?.name?.includes(search) ||
      t.notes?.includes(search);
    const matchesStatus = !statusFilter || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hasFilters = !!search || !!statusFilter;
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  const columns: Column<StockTransfer>[] = [
    {
      key: "transferNumber",
      header: "رقم التحويل",
      render: (t) => (
        <span className="font-mono text-xs text-gray-500">{t.transferNumber}</span>
      ),
      sortable: true,
    },
    {
      key: "transferDate",
      header: "التاريخ",
      render: (t) => {
        const d = new Date(t.transferDate);
        return (
          <span className="text-xs" dir="ltr">
            {d.toLocaleDateString("ar-IQ")}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "fromWarehouse",
      header: "مخزن المصدر",
      render: (t) => (
        <span className="text-sm">{t.fromWarehouse?.name || "-"}</span>
      ),
      sortable: true,
    },
    {
      key: "toWarehouse",
      header: "مخزن الوجهة",
      render: (t) => (
        <span className="text-sm">{t.toWarehouse?.name || "-"}</span>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: "الحالة",
      render: (t) => statusBadge(t.status),
      sortable: true,
    },
    {
      key: "lineCount",
      header: "البنود",
      render: (t) => (
        <span className="text-xs">{t.lines.length}</span>
      ),
      sortable: true,
    },
    {
      key: "totalQty",
      header: "إجمالي الكمية",
      render: (t) => {
        const total = t.lines.reduce((sum, l) => sum + l.quantity, 0);
        return <span dir="ltr" className="font-mono text-xs">{formatNumber(total)}</span>;
      },
      sortable: true,
    },
    {
      key: "notes",
      header: "ملاحظات",
      render: (t) => (
        <span className="text-xs text-gray-500">{t.notes || "-"}</span>
      ),
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
        title="تحويلات المخزن"
        description="إدارة تحويل المواد بين المخازن"
        actionLabel={canCreate ? "تحويل مخزن جديد" : undefined}
        onAction={canCreate ? () => router.push("/dashboard/warehouse-transfers/new") : undefined}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث برقم التحويل أو المخزن..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-dark"
        >
          <option value="">كل الحالات</option>
          <option value="DRAFT">مسودة</option>
          <option value="POSTED">مرحّل</option>
          <option value="CANCELLED">ملغى</option>
        </select>
        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="h-4 w-4" />
            مسح الفلاتر
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        searchPlaceholder=""
        actions={(item: StockTransfer) => (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => router.push(`/dashboard/warehouse-transfers/${item.id}`)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-primary"
              title="عرض التفاصيل"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        )}
      />
    </div>
  );
}
