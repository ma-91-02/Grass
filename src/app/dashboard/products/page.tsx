"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CUSTOMER_TYPE_LABELS, type CustomerType } from "@/types"

interface ProductPrice {
  id: string
  customerType: CustomerType
  price: number
}

interface Product {
  id: string
  name: string
  code: string
  barcode: string | null
  categoryName: string | null
  unit: string
  purchasePrice: number
  isActive: boolean
  prices: ProductPrice[]
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter(
    (p) =>
      p.name.includes(search) ||
      p.code.includes(search) ||
      p.barcode?.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">المواد</h1>
          <p className="text-sm text-gray-500">إدارة المواد والمنتجات</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          مادة جديدة
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث بالاسم أو الكود أو الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا يوجد مواد
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الكود</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الاسم</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">المجموعة</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الوحدة</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4 text-gray-600 font-mono text-sm">{product.code}</td>
                    <td className="p-4 text-dark font-medium">{product.name}</td>
                    <td className="p-4 text-gray-600">{product.categoryName || "-"}</td>
                    <td className="p-4 text-gray-600">{product.unit}</td>
                    <td className="p-4">
                      <Badge variant={product.isActive ? "success" : "danger"}>
                        {product.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
