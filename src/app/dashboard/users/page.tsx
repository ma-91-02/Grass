"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface User {
  id: string
  name: string
  email: string
  isActive: boolean
  phone: string | null
  roles: string[]
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(
    (u) =>
      u.name.includes(search) ||
      u.email.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">المستخدمين</h1>
          <p className="text-sm text-gray-500">إدارة حسابات المستخدمين</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          مستخدم جديد
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
            لا يوجد مستخدمين
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الاسم</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">البريد</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الدور</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">الحالة</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">تاريخ الإنشاء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4 text-dark font-medium">{user.name}</td>
                    <td className="p-4 text-gray-600" dir="ltr">{user.email}</td>
                    <td className="p-4">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="info" className="ml-1">{role}</Badge>
                      ))}
                    </td>
                    <td className="p-4">
                      <Badge variant={user.isActive ? "success" : "danger"}>
                        {user.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-600">{new Date(user.createdAt).toLocaleDateString("ar-IQ")}</td>
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
