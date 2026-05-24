"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CustomerType } from "@/types";
import { CUSTOMER_TYPE_LABELS } from "@/types";

interface ProductPrice {
  id: string;
  productId: string;
  customerType: CustomerType;
  price: number;
  currency: string;
}

interface ProductDetail {
  id: string;
  name: string;
  code: string;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unitId: string | null;
  unitName: string | null;
  packaging: string;
  piecesPerCarton: number;
  productType: string | null;
  description: string | null;
  isActive: boolean;
  purchasePrice?: number;
  purchaseCurrency?: string;
  prices: ProductPrice[];
}

interface StockBalance {
  id: string;
  warehouseId: string;
  warehouseName: string | null;
  warehouseCode: string | null;
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  averageCost: number;
  totalValue: number;
  currency: string;
}

interface StockMovement {
  id: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  movementDate: string;
  status: string;
  warehouse: { name: string; code: string } | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingAuth(true);
    setAuthError(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "فشل تحميل بيانات الجلسة");
        if (!d.data?.companyId)
          throw new Error("لم يتم العثور على شركة مرتبطة بالمستخدم");
        setUserCompanyId(d.data.companyId);
      })
      .catch((err) => {
        setAuthError(
          err instanceof Error ? err.message : "تعذر تحميل بيانات الشركة",
        );
      })
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل المادة");
      return json.data as ProductDetail;
    },
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["stock-balances", id, userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams({ productId: id });
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/stock-balances?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الأرصدة");
      return json.data as StockBalance[];
    },
    enabled: !!userCompanyId,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements", id, userCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams({ productId: id });
      if (userCompanyId) params.append("companyId", userCompanyId);
      const res = await fetch(`/api/stock-movements?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "فشل تحميل الحركات");
      return json.data as StockMovement[];
    },
    enabled: !!userCompanyId,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/products")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل المادة</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل المادة"}
        </div>
      </div>
    );
  }

  const totalQtyOnHand = balances.reduce((s, b) => s + b.quantityOnHand, 0);
  const totalAvailable = balances.reduce((s, b) => s + b.availableQuantity, 0);
  const totalValue = balances.reduce((s, b) => s + b.totalValue, 0);
  const balancesCurrency = balances[0]?.currency || "IQD";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/products")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-gray-400" />
            <h1 className="text-2xl font-bold text-dark">{product.name}</h1>
            <Badge variant={product.isActive ? "success" : "danger"}>
              {product.isActive ? "نشط" : "معطل"}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">كود: {product.code}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>معلومات المادة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{product.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الكود</p>
                <p className="font-mono text-sm font-medium">{product.code}</p>
              </div>
              {product.barcode && (
                <div>
                  <p className="text-sm text-gray-500">الباركود</p>
                  <p className="font-mono text-sm font-medium" dir="ltr">
                    {product.barcode}
                  </p>
                </div>
              )}
              {product.sku && (
                <div>
                  <p className="text-sm text-gray-500">SKU</p>
                  <p className="font-mono text-sm font-medium">{product.sku}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">المجموعة</p>
                <p className="font-medium">{product.categoryName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الوحدة</p>
                <p className="font-medium">{product.unitName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">التعبئة</p>
                <p className="font-medium">{product.packaging}</p>
              </div>
              {product.packaging === "كارتون" && (
                <div>
                  <p className="text-sm text-gray-500">قطع/كارتون</p>
                  <p className="font-medium">
                    {product.piecesPerCarton.toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">النوع</p>
                <p className="font-medium">
                  {product.productType === "STOCK" ? "مخزني" : "خدمي"}
                </p>
              </div>
            </div>
            {product.description && (
              <div>
                <p className="text-sm text-gray-500">الوصف</p>
                <p className="font-medium">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بيانات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">رقم المعرف</span>
              <span className="font-mono text-sm">{product.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {product.purchasePrice !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>سعر الشراء</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(product.purchasePrice)} {product.purchaseCurrency}
            </p>
          </CardContent>
        </Card>
      )}

      {product.prices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>أسعار البيع</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium text-gray-500">نوع العميل</th>
                  <th className="pb-2 font-medium text-gray-500">السعر</th>
                  <th className="pb-2 font-medium text-gray-500">العملة</th>
                </tr>
              </thead>
              <tbody>
                {product.prices.map((pr) => (
                  <tr key={pr.id} className="border-b border-border/50">
                    <td className="py-2">
                      {CUSTOMER_TYPE_LABELS[pr.customerType] || pr.customerType}
                    </td>
                    <td className="py-2 font-medium">
                      {formatCurrency(pr.price)}
                    </td>
                    <td className="py-2">{pr.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>رصيد المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          {authError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
              {authError}
            </div>
          ) : isLoadingAuth ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : balances.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
              لا يوجد رصيد لهذه المادة
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs text-blue-600">إجمالي الكمية</p>
                  <p className="text-lg font-bold text-blue-700">
                    {totalQtyOnHand.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-xs text-green-600">المتاح</p>
                  <p className="text-lg font-bold text-green-700">
                    {totalAvailable.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs text-amber-600">القيمة</p>
                  <p className="text-lg font-bold text-amber-700">
                    {formatCurrency(totalValue)} {balancesCurrency}
                  </p>
                </div>
              </div>
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 font-medium text-gray-500">المخزن</th>
                    <th className="pb-2 font-medium text-gray-500">الكمية</th>
                    <th className="pb-2 font-medium text-gray-500">المحجوز</th>
                    <th className="pb-2 font-medium text-gray-500">المتاح</th>
                    <th className="pb-2 font-medium text-gray-500">
                      متوسط التكلفة
                    </th>
                    <th className="pb-2 font-medium text-gray-500">
                      القيمة الإجمالية
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.id} className="border-b border-border/50">
                      <td className="py-2 font-medium">
                        {b.warehouseName || b.warehouseCode || "—"}
                      </td>
                      <td className="py-2">
                        {b.quantityOnHand.toLocaleString()}
                      </td>
                      <td className="py-2">
                        {b.reservedQuantity.toLocaleString()}
                      </td>
                      <td className="py-2">
                        <span
                          className={
                            b.availableQuantity <= 0
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {b.availableQuantity.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2">
                        {b.averageCost > 0
                          ? `${formatCurrency(b.averageCost)} ${b.currency}`
                          : "—"}
                      </td>
                      <td className="py-2 font-medium">
                        {b.totalValue > 0
                          ? `${formatCurrency(b.totalValue)} ${b.currency}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>حركات المخزون</CardTitle>
        </CardHeader>
        <CardContent>
          {authError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
              {authError}
            </div>
          ) : isLoadingAuth ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : movements.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
              لا توجد حركات مخزون لهذه المادة
            </div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 font-medium text-gray-500">التاريخ</th>
                  <th className="pb-2 font-medium text-gray-500">النوع</th>
                  <th className="pb-2 font-medium text-gray-500">المخزن</th>
                  <th className="pb-2 font-medium text-gray-500">الكمية</th>
                  <th className="pb-2 font-medium text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="py-2">
                      {new Date(m.movementDate).toLocaleDateString("ar-IQ")}
                    </td>
                    <td className="py-2">
                      <Badge
                        className={
                          movementTypeColors[m.movementType] ||
                          "bg-gray-100 text-gray-700"
                        }
                      >
                        {movementTypeLabels[m.movementType] || m.movementType}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {m.warehouse?.name || "—"}
                    </td>
                    <td className="py-2 font-medium">{m.quantity.toLocaleString()}</td>
                    <td className="py-2">{statusBadge(m.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
