"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Warehouse {
  id: string
  name: string
  code: string
  address: string | null
  isActive: boolean
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((data) => setWarehouses(data.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = warehouses.filter(
    (w) => w.name.includes(search) || w.code.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">المخازن</h1>
          <p className="text-sm text-gray-500">إدارة المخازن والمستودعات</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          مخزن جديد
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث..."
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
            لا يوجد مخازن
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
                  <th className="text-right p-4 text-sm font-medium text-gray-500">العنوان</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4 text-gray-600 font-mono text-sm">{w.code}</td>
                    <td className="p-4 text-dark font-medium">{w.name}</td>
                    <td className="p-4 text-gray-600">{w.address || "-"}</td>
                    <td className="p-4">
                      <Badge variant={w.isActive ? "success" : "danger"}>
                        {w.isActive ? "نشط" : "غير نشط"}
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
