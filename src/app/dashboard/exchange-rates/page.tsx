"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface ExchangeRate {
  id: string
  usdToIqd: number
  date: string
  note: string | null
}

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/exchange-rates")
      .then((res) => res.json())
      .then((data) => setRates(data.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">سعر الصرف</h1>
          <p className="text-sm text-gray-500">إدارة أسعار صرف الدولار مقابل الدينار</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          إضافة سعر صرف
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : rates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا يوجد أسعار صرف
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-4 text-sm font-medium text-gray-500">التاريخ</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">سعر الصرف</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">ملاحظة</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4 text-gray-600">
                      {new Date(rate.date).toLocaleDateString("ar-IQ")}
                    </td>
                    <td className="p-4 text-dark font-medium">
                      1 USD = {formatCurrency(rate.usdToIqd)} IQD
                    </td>
                    <td className="p-4 text-gray-600">{rate.note || "-"}</td>
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
