"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { CUSTOMER_TYPE_LABELS, type CustomerType } from "@/types"

interface Customer {
  id: string
  name: string
  code: string
  phone: string | null
  customerType: CustomerType
  isActive: boolean
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => setCustomers(data.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter(
    (c) =>
      c.name.includes(search) ||
      c.code.includes(search) ||
      c.phone?.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">العملاء</h1>
          <p className="text-sm text-gray-500">إدارة بيانات العملاء</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          عميل جديد
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث بالاسم أو الكود أو الهاتف..."
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
            لا يوجد عملاء
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
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الهاتف</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">النوع</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4 text-gray-600 font-mono text-sm">{customer.code}</td>
                    <td className="p-4 text-dark font-medium">{customer.name}</td>
                    <td className="p-4 text-gray-600" dir="ltr">{customer.phone}</td>
                    <td className="p-4">
                      <Badge variant="info">{CUSTOMER_TYPE_LABELS[customer.customerType]}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={customer.isActive ? "success" : "danger"}>
                        {customer.isActive ? "نشط" : "غير نشط"}
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
