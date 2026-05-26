"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";

interface IssueItem {
  id: string;
  type: string;
  severity: string;
  entity: string;
  entityId: string;
  productId?: string;
  productName?: string;
  warehouseId?: string | null;
  warehouseName?: string;
  details: Record<string, unknown>;
}

interface IssuesData {
  summary: {
    totalCheckedBalances: number;
    totalCheckedMovements: number;
    totalIssues: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
  };
  issues: IssueItem[];
}

interface ReconItem {
  id: string;
  productId: string;
  productName?: string;
  warehouseId: string;
  warehouseName?: string;
  balanceQty: number;
  balanceValue?: number;
  movementQty: number;
  difference?: number;
  issue?: string;
}

interface ReconData {
  summary: {
    totalChecked: number;
    matchedCount: number;
    mismatchCount: number;
    missingBalanceCount: number;
  };
  matched: ReconItem[];
  mismatches: ReconItem[];
  missingBalances: ReconItem[];
}

interface StockCardMovement {
  id: string;
  movementDate: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  currency: string;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  notes: string | null;
  warehouseName: string | null;
  warehouseCode: string | null;
  runningQuantity: number;
  runningValue: number;
  averageCostAfter: number;
}

interface StockCardData {
  product: { id: string; name: string; code: string } | null;
  movements: StockCardMovement[];
  finalBalance: {
    quantityOnHand: number;
    reservedQuantity: number;
    averageCost: number;
    totalValue: number;
    currency: string;
  } | null;
}

type IssueTab = "issues" | "reconciliation" | "stock-card";

function formatNumber(n: number): string {
  return n.toLocaleString("ar-IQ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const severityColors: Record<string, "danger" | "warning" | "info"> = {
  critical: "danger",
  warning: "warning",
  info: "info",
};

const severityLabels: Record<string, string> = {
  critical: "حرج",
  warning: "تحذير",
  info: "معلومات",
};

const typeLabels: Record<string, string> = {
  NEGATIVE_QUANTITY: "رصيد سالب",
  RESERVED_EXCEEDS_ONHAND: "حجز يتجاوز الرصيد",
  NEGATIVE_AVERAGE_COST: "متوسط تكلفة سالب",
  NEGATIVE_TOTAL_VALUE: "قيمة إجمالية سالبة",
  MOVEMENT_MISSING_COMPANY: "حركة بدون شركة",
  MOVEMENT_MISSING_WAREHOUSE: "حركة بدون مخزن",
  MOVEMENT_WITHOUT_BALANCE: "حركة بدون رصيد",
};

const movementTypeLabels: Record<string, string> = {
  OPENING_BALANCE: "رصيد افتتاحي",
  IN: "إدخال",
  OUT: "إخراج",
  ADJUSTMENT_IN: "تسوية إضافة",
  ADJUSTMENT_OUT: "تسوية خصم",
  TRANSFER_IN: "تحويل وارد",
  TRANSFER_OUT: "تحويل صادر",
};

export default function InventoryAuditPage() {
  const [authData, setAuthData] = useState<{ permissions?: string[]; displayRole?: string } | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tab, setTab] = useState<IssueTab>("issues");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [reconFilter, setReconFilter] = useState<string>("");

  const [stockProductId, setStockProductId] = useState("");
  const [stockProductSearch, setStockProductSearch] = useState("");

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
    data: issuesData,
    isLoading: issuesLoading,
    error: issuesError,
  } = useQuery({
    queryKey: ["inventory-audit-issues"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/audit/issues");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل مشاكل المخزون");
      return json.data as IssuesData;
    },
    enabled: !isLoadingAuth && !!authData && tab === "issues",
  });

  const {
    data: reconData,
    isLoading: reconLoading,
    error: reconError,
  } = useQuery({
    queryKey: ["inventory-audit-reconciliation"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/audit/reconciliation");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل تسوية المخزون");
      return json.data as ReconData;
    },
    enabled: !isLoadingAuth && !!authData && tab === "reconciliation",
  });

  const {
    data: stockCardData,
    isLoading: stockCardLoading,
    error: stockCardError,
  } = useQuery({
    queryKey: ["inventory-audit-stock-card", stockProductId],
    queryFn: async () => {
      const params = new URLSearchParams({ productId: stockProductId });
      const res = await fetch(`/api/inventory/audit/stock-card?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل بطاقة المخزن");
      return json.data as StockCardData;
    },
    enabled: !isLoadingAuth && !!authData && tab === "stock-card" && !!stockProductId,
  });

  const {
    data: productsList,
  } = useQuery({
    queryKey: ["products-search", stockProductSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stockProductSearch) params.set("search", stockProductSearch);
      params.set("limit", "20");
      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();
      if (!json.success) return [];
      return json.data as { id: string; name: string; code: string }[];
    },
    enabled: !isLoadingAuth && !!authData && tab === "stock-card",
  });

  const issues: IssueItem[] = (issuesData?.issues || []).map((i) => ({
    ...i,
    id: i.entityId,
  }));

  const filteredIssues = issues.filter((i) => {
    const matchesSearch =
      !search ||
      i.productName?.includes(search) ||
      i.warehouseName?.includes(search) ||
      typeLabels[i.type]?.includes(search) ||
      i.type.includes(search);
    const matchesSeverity = !severityFilter || i.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const matched: ReconItem[] = (reconData?.matched || []).map((i, idx) => ({
    ...(i as ReconItem),
    id: `${i.productId}-${i.warehouseId}-matched-${idx}`,
  }));
  const mismatches: ReconItem[] = (reconData?.mismatches || []).map((i, idx) => ({
    ...(i as ReconItem),
    id: `${i.productId}-${i.warehouseId}-mismatch-${idx}`,
  }));
  const missingBalances: ReconItem[] = (reconData?.missingBalances || []).map(
    (i, idx) => ({
      ...(i as ReconItem),
      id: `${i.productId}-${i.warehouseId}-missing-${idx}`,
    }),
  );

  const hasFilters = !!search || !!severityFilter || !!reconFilter;
  const clearFilters = () => {
    setSearch("");
    setSeverityFilter("");
    setReconFilter("");
  };

  const issueColumns: Column<IssueItem>[] = [
    {
      key: "type",
      header: "نوع المشكلة",
      render: (i) => (
        <span className="text-xs font-medium">{typeLabels[i.type] || i.type}</span>
      ),
      sortable: true,
    },
    {
      key: "severity",
      header: "الخطورة",
      render: (i) => (
        <Badge variant={severityColors[i.severity] || "default"}>
          {severityLabels[i.severity] || i.severity}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: "productName",
      header: "المادة",
      render: (i) => (
        <span className="text-sm">{i.productName || "-"}</span>
      ),
      sortable: true,
    },
    {
      key: "warehouseName",
      header: "المخزن",
      render: (i) => (
        <span className="text-sm">{i.warehouseName || "-"}</span>
      ),
      sortable: true,
    },
    {
      key: "details",
      header: "التفاصيل",
      render: (i) => (
        <span className="text-xs text-gray-500">
          {(i.details?.message as string) || ""}
        </span>
      ),
    },
  ];

  const reconColumns: Column<ReconItem>[] = [
    {
      key: "productName",
      header: "المادة",
      render: (r) => <span className="text-sm font-medium">{r.productName || "-"}</span>,
      sortable: true,
    },
    {
      key: "warehouseName",
      header: "المخزن",
      render: (r) => <span className="text-sm">{r.warehouseName || "-"}</span>,
      sortable: true,
    },
    {
      key: "balanceQty",
      header: "الرصيد",
      render: (r) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(r.balanceQty)}</span>
      ),
      sortable: true,
    },
    {
      key: "movementQty",
      header: "الحركات",
      render: (r) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(r.movementQty)}</span>
      ),
      sortable: true,
    },
    {
      key: "difference",
      header: "الفرق",
      render: (r) => {
        if (r.difference === undefined) return <span className="text-xs text-gray-400">-</span>;
        const isZero = r.difference === 0;
        return (
          <span
            dir="ltr"
            className={cn(
              "font-mono text-xs font-medium",
              isZero ? "text-green-600" : "text-red-600",
            )}
          >
            {formatNumber(r.difference)}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "issue",
      header: "ملاحظة",
      render: (r) => (
        <span className="text-xs text-gray-500">{r.issue || "-"}</span>
      ),
    },
  ];

  const stockCardColumns: Column<StockCardMovement>[] = [
    {
      key: "movementDate",
      header: "التاريخ",
      render: (m) => {
        const d = new Date(m.movementDate);
        return (
          <span className="text-xs" dir="ltr">
            {d.toLocaleDateString("ar-IQ")}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "movementType",
      header: "النوع",
      render: (m) => (
        <Badge variant="default">{movementTypeLabels[m.movementType] || m.movementType}</Badge>
      ),
      sortable: true,
    },
    {
      key: "warehouseName",
      header: "المخزن",
      render: (m) => (
        <span className="text-xs">{m.warehouseName || "-"}</span>
      ),
      sortable: true,
    },
    {
      key: "quantity",
      header: "الكمية",
      render: (m) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(m.quantity)}</span>
      ),
      sortable: true,
    },
    {
      key: "unitCost",
      header: "تكلفة الوحدة",
      render: (m) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(m.unitCost)}</span>
      ),
      sortable: true,
    },
    {
      key: "runningQuantity",
      header: "الرصيد بعد",
      render: (m) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(m.runningQuantity)}</span>
      ),
      sortable: true,
    },
    {
      key: "averageCostAfter",
      header: "متوسط التكلفة بعد",
      render: (m) => (
        <span dir="ltr" className="font-mono text-xs">{formatNumber(m.averageCostAfter)}</span>
      ),
      sortable: true,
    },
    {
      key: "referenceType",
      header: "المرجع",
      render: (m) => (
        <span className="text-xs text-gray-500">
          {m.referenceType ? `${m.referenceType} #${m.referenceId?.slice(0, 8) || ""}` : "-"}
        </span>
      ),
    },
    {
      key: "notes",
      header: "ملاحظات",
      render: (m) => (
        <span className="text-xs text-gray-500">{m.notes || "-"}</span>
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
        title="تدقيق المخزون"
        description="مراجعة فروقات ومشاكل المخزون"
      />

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab("issues")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "issues"
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-muted",
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          المشاكل
        </button>
        <button
          onClick={() => setTab("reconciliation")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "reconciliation"
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-muted",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          التسوية
        </button>
        <button
          onClick={() => setTab("stock-card")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "stock-card"
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-muted",
          )}
        >
          <Package className="h-4 w-4" />
          بطاقة المخزن
        </button>
      </div>

      {/* Issues Tab */}
      {tab === "issues" && (
        <>
          {issuesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <p className="font-medium text-red-600">
                {issuesError instanceof Error ? issuesError.message : "فشل تحميل المشاكل"}
              </p>
            </div>
          ) : issuesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : issuesData ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "إجمالي الأرصدة المدققة", value: issuesData.summary.totalCheckedBalances },
                  { label: "إجمالي الحركات المدققة", value: issuesData.summary.totalCheckedMovements },
                  { label: "إجمالي المشاكل", value: issuesData.summary.totalIssues },
                  { label: "عدد الحرجة", value: issuesData.summary.criticalCount },
                  { label: "عدد التحذيرات", value: issuesData.summary.warningCount },
                  { label: "عدد المعلومات", value: issuesData.summary.infoCount },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-border bg-white p-4"
                  >
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="mt-1 text-lg font-bold text-dark" dir="ltr">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="بحث بالمادة أو المخزن..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-dark"
                >
                  <option value="">كل الخطورة</option>
                  <option value="critical">حرج</option>
                  <option value="warning">تحذير</option>
                  <option value="info">معلومات</option>
                </select>
                {hasFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                    مسح الفلاتر
                  </Button>
                )}
              </div>

              <DataTable
                columns={issueColumns}
                data={filteredIssues}
                searchPlaceholder=""
              />
            </>
          ) : null}
        </>
      )}

      {/* Reconciliation Tab */}
      {tab === "reconciliation" && (
        <>
          {reconError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <p className="font-medium text-red-600">
                {reconError instanceof Error ? reconError.message : "فشل تحميل التسوية"}
              </p>
            </div>
          ) : reconLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : reconData ? (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "إجمالي المدقق", value: reconData.summary.totalChecked },
                  { label: "متطابق", value: reconData.summary.matchedCount },
                  { label: "غير متطابق", value: reconData.summary.mismatchCount },
                  { label: "بدون رصيد", value: reconData.summary.missingBalanceCount },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl border border-border bg-white p-4"
                  >
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="mt-1 text-lg font-bold text-dark" dir="ltr">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="بحث بالمادة أو المخزن..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <select
                  value={reconFilter}
                  onChange={(e) => setReconFilter(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-dark"
                >
                  <option value="">كل السجلات</option>
                  <option value="matched">متطابق فقط</option>
                  <option value="mismatch">غير متطابق فقط</option>
                  <option value="missing">بدون رصيد فقط</option>
                </select>
                {hasFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                    مسح الفلاتر
                  </Button>
                )}
              </div>

              {/* Matched Section */}
              {(!reconFilter || reconFilter === "matched") && matched.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-700">
                      متطابق ({matched.length})
                    </h3>
                  </div>
                  <DataTable
                    columns={reconColumns}
                    data={matched}
                    searchPlaceholder=""
                  />
                </div>
              )}

              {/* Mismatches Section */}
              {(!reconFilter || reconFilter === "mismatch") && mismatches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-medium text-amber-700">
                      غير متطابق ({mismatches.length})
                    </h3>
                  </div>
                  <DataTable
                    columns={reconColumns}
                    data={mismatches}
                    searchPlaceholder=""
                  />
                </div>
              )}

              {/* Missing Balances Section */}
              {(!reconFilter || reconFilter === "missing") && missingBalances.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h3 className="font-medium text-red-700">
                      حركات بدون رصيد ({missingBalances.length})
                    </h3>
                  </div>
                  <DataTable
                    columns={reconColumns}
                    data={missingBalances}
                    searchPlaceholder=""
                  />
                </div>
              )}

              {matched.length === 0 && mismatches.length === 0 && missingBalances.length === 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                  <p className="text-gray-500">لا توجد بيانات تسوية</p>
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {/* Stock Card Tab */}
      {tab === "stock-card" && (
        <div className="space-y-6">
          {/* Product selector */}
          <div className="rounded-xl border border-border bg-white p-4">
            <h3 className="mb-4 text-sm font-medium text-dark">
              اختر المادة لعرض بطاقة المخزن
            </h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative flex-1">
                <label className="mb-1 block text-xs text-gray-500">
                  ابحث عن مادة
                </label>
                <Input
                  placeholder="اسم أو كود المادة..."
                  value={stockProductSearch}
                  onChange={(e) => setStockProductSearch(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">
                  المادة
                </label>
                <select
                  value={stockProductId}
                  onChange={(e) => setStockProductId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-dark"
                >
                  <option value="">-- اختر مادة --</option>
                  {(productsList || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!stockProductId && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-gray-400" />
              <p className="text-gray-500">اختر مادة لعرض بطاقة المخزن</p>
            </div>
          )}

          {stockCardError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <p className="font-medium text-red-600">
                {stockCardError instanceof Error ? stockCardError.message : "فشل تحميل بطاقة المخزن"}
              </p>
            </div>
          )}

          {stockCardLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {stockCardData && stockProductId && (
            <>
              {/* Final Balance Cards */}
              {stockCardData.finalBalance && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "المادة", value: `${stockCardData.product?.name || ""} (${stockCardData.product?.code || ""})` },
                    { label: "الرصيد", value: formatNumber(stockCardData.finalBalance.quantityOnHand) },
                    { label: "المحجوز", value: formatNumber(stockCardData.finalBalance.reservedQuantity) },
                    { label: "متوسط التكلفة", value: formatNumber(stockCardData.finalBalance.averageCost) },
                    { label: "القيمة الإجمالية", value: formatNumber(stockCardData.finalBalance.totalValue) },
                    { label: "العملة", value: stockCardData.finalBalance.currency },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="rounded-xl border border-border bg-white p-4"
                    >
                      <p className="text-xs text-gray-500">{card.label}</p>
                      <p className="mt-1 text-lg font-bold text-dark" dir="ltr">
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Movements Table */}
              <DataTable
                columns={stockCardColumns}
                data={stockCardData.movements || []}
                searchPlaceholder=""
              />

              {(!stockCardData.movements || stockCardData.movements.length === 0) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                  <p className="text-gray-500">لا توجد حركات لهذه المادة</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
