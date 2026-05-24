"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";

interface StockMovement {
  id: string;
  movementDate: string;
  quantity: number;
  unitCost: number;
  currency: string;
  movementType: string;
  status: string;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  notes: string | null;
  product: {
    name: string;
    code: string;
    productType: string;
  };
  warehouse: {
    name: string;
    code: string;
  } | null;
}

const movementTypeLabels: Record<string, string> = {
  OPENING_BALANCE: "رصيد افتتاحي",
  IN: "وارد",
  OUT: "صادر",
  ADJUSTMENT_IN: "تسوية زيادة",
  ADJUSTMENT_OUT: "تسوية نقص",
  TRANSFER_OUT: "تحويل خارج",
  TRANSFER_IN: "تحويل وارد",
  RETURN_IN: "مرتجع مشتريات",
};

const movementTypeColors: Record<string, string> = {
  OPENING_BALANCE: "bg-purple-100 text-purple-700",
  IN: "bg-green-100 text-green-700",
  OUT: "bg-red-100 text-red-700",
  ADJUSTMENT_IN: "bg-yellow-100 text-yellow-700",
  ADJUSTMENT_OUT: "bg-orange-100 text-orange-700",
  TRANSFER_OUT: "bg-blue-100 text-blue-700",
  TRANSFER_IN: "bg-cyan-100 text-cyan-700",
  RETURN_IN: "bg-pink-100 text-pink-700",
};

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "مسودة", color: "bg-gray-100 text-gray-700" },
    POSTED: { label: "مرحّل", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "ملغى", color: "bg-red-100 text-red-700" },
  };
  const s = map[status] || { label: status, color: "bg-gray-100" };
  return <Badge className={s.color}>{s.label}</Badge>;
};

export default function StockMovementsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserCompanyId(d.data?.companyId || null))
      .catch(() => {});
  }, []);

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/warehouses?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error("فشل تحميل المخازن");
      return json.data as { id: string; name: string; code: string }[];
    },
    enabled: !!userCompanyId,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-movements", userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/stock-movements?${params.toString()}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل حركات المخزن");
      return json.data as StockMovement[];
    },
    enabled: !!userCompanyId,
  });

  const movements = data || [];

  const filtered = movements.filter((m) => {
    const matchesSearch =
      !search ||
      m.product?.name?.includes(search) ||
      m.product?.code?.includes(search) ||
      m.referenceId?.includes(search) ||
      m.reason?.includes(search);
    const matchesWarehouse =
      !warehouseFilter || m.warehouse?.name === warehouseFilter;
    const matchesStatus = !statusFilter || m.status === statusFilter;
    const matchesType = !typeFilter || m.movementType === typeFilter;
    return matchesSearch && matchesWarehouse && matchesStatus && matchesType;
  });

  const columns: Column<StockMovement>[] = [
    {
      key: "movementDate",
      header: "التاريخ",
      render: (m) => (
        <span>
          {new Date(m.movementDate).toLocaleDateString("ar-IQ")}
        </span>
      ),
    },
    {
      key: "product",
      header: "المادة",
      render: (m) => (
        <div>
          <p className="font-medium">{m.product?.name || "—"}</p>
          <p className="text-xs text-gray-500">{m.product?.code || ""}</p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "المخزن",
      render: (m) => (
        <span>{m.warehouse?.name || "—"}</span>
      ),
    },
    {
      key: "movementType",
      header: "النوع",
      render: (m) => (
        <Badge
          className={
            movementTypeColors[m.movementType] || "bg-gray-100 text-gray-700"
          }
        >
          {movementTypeLabels[m.movementType] || m.movementType}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "الكمية",
      render: (m) => (
        <span className="font-mono">{m.quantity.toLocaleString()}</span>
      ),
    },
    {
      key: "unitCost",
      header: "التكلفة",
      render: (m) => (
        <span className="font-mono">
          {m.unitCost > 0
            ? `${Number(m.unitCost).toLocaleString()} ${m.currency}`
            : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (m) => statusBadge(m.status),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="حركات المخزن"
        description="عرض حركات المواد في المخازن"
        actionLabel="تسوية جديدة"
        onAction={() => router.push("/dashboard/stock-movements/new")}
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <Label className="mb-2 block text-sm">بحث</Label>
              <Input
                placeholder="اسم المادة أو الكود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="min-w-[180px]">
              <Label className="mb-2 block text-sm">المخزن</Label>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">الكل</option>
                {(warehouses || []).map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[150px]">
              <Label className="mb-2 block text-sm">النوع</Label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">الكل</option>
                {Object.entries(movementTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        extraActions={[
          {
            label: "عرض التفاصيل",
            onClick: (m) =>
              router.push(`/dashboard/stock-movements/${m.id}`),
            icon: <Eye className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  );
}
