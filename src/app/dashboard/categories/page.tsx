"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || "فشل تحميل التصنيفات");
        setCategories(data.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "فشل تحميل التصنيفات");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = categories.filter((c) => c.name.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">تصنيفات المواد</h1>
          <p className="text-sm text-gray-500">إدارة مجموعات المواد</p>
        </div>
        <Button disabled title="قريباً">
          <Plus className="h-4 w-4" />
          تصنيف جديد
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
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {search ? "لا توجد نتائج للبحث" : "لا يوجد تصنيفات"}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    الاسم
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    الوصف
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">
                    الحالة
                  </th>
                  <th className="text-center p-4 text-sm font-medium text-gray-500">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cat) => (
                  <tr
                    key={cat.id}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="p-4 text-dark font-medium">{cat.name}</td>
                    <td className="p-4 text-gray-600">
                      {cat.description || "-"}
                    </td>
                    <td className="p-4">
                      <Badge variant={cat.isActive ? "success" : "danger"}>
                        {cat.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/categories/${cat.id}`)
                          }
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-primary"
                          title="عرض التفاصيل"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
