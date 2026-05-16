"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((data) => setRoles(data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">الأدوار والصلاحيات</h1>
        <p className="text-sm text-gray-500">
          إدارة أدوار المستخدمين والصلاحيات
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا يوجد أدوار
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-dark">{role.name}</h3>
                  {role.isSystem && <Badge variant="info">نظام</Badge>}
                </div>
                {role.description && (
                  <p className="text-sm text-gray-500 mb-3">
                    {role.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((perm) => (
                    <Badge key={perm} variant="default" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
