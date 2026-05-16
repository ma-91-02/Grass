"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  entity: string
  entityId: string | null
  details: unknown
  createdAt: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/audit-logs")
      .then((res) => res.json())
      .then((data) => setLogs(data.data))
      .finally(() => setLoading(false))
  }, [])

  const actionLabels: Record<string, string> = {
    CREATE: "إنشاء",
    UPDATE: "تحديث",
    DELETE: "حذف",
    LOGIN: "تسجيل دخول",
    LOGOUT: "تسجيل خروج",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">سجل النشاطات</h1>
        <p className="text-sm text-gray-500">سجل جميع العمليات في النظام</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا يوجد نشاطات
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-4 text-sm font-medium text-gray-500">المستخدم</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الإجراء</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الكيان</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4 text-dark font-medium">{log.userName}</td>
                    <td className="p-4">
                      <span className="rounded bg-muted px-2 py-0.5 text-sm">
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{log.entity}</td>
                    <td className="p-4 text-gray-600">
                      {new Date(log.createdAt).toLocaleDateString("ar-IQ", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}
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
