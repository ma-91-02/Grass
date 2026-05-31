"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { CreateProjectDialog } from "@/components/internal-projects/create-project-dialog";
import type { TokenPayload } from "@/lib/auth";

interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  managerUserId: string | null;
  manager?: { name: string } | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "PLANNED", label: "مخطط" },
  { value: "ACTIVE", label: "نشط" },
  { value: "PAUSED", label: "متوقف" },
  { value: "COMPLETED", label: "مكتمل" },
  { value: "CANCELLED", label: "ملغي" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "LOW", label: "منخفضة" },
  { value: "MEDIUM", label: "متوسطة" },
  { value: "HIGH", label: "عالية" },
  { value: "URGENT", label: "عاجلة" },
];

const STATUS_BADGE: Record<string, string> = {
  PLANNED: "default",
  ACTIVE: "info",
  PAUSED: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "default",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "مخطط",
  ACTIVE: "نشط",
  PAUSED: "متوقف",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};

export default function InternalProjectsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [cancellingProject, setCancellingProject] = useState<Project | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || "فشل تحميل بيانات الجلسة");
        setUser(d.data);
      })
      .catch(() => {})
      .finally(() => setIsLoadingAuth(false));
  }, []);

  const permissions = user?.permissions || [];
  const canView = permissions.includes(PERMISSIONS.PROJECTS_VIEW);
  const canCreate = permissions.includes(PERMISSIONS.PROJECTS_CREATE);
  const canEdit = permissions.includes(PERMISSIONS.PROJECTS_EDIT);
  const canDelete = permissions.includes(PERMISSIONS.PROJECTS_DELETE);

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["internal-projects"],
    enabled: !!user && canView,
    queryFn: async () => {
      const res = await fetch("/api/internal-projects");
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل المشاريع");
      return json.data as Project[];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (project: Project) => {
      const res = await fetch(`/api/internal-projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل إلغاء المشروع");
      return json.data;
    },
    onSuccess: () => {
      toast("تم إلغاء المشروع بنجاح", "success");
      setCancellingProject(null);
      qc.invalidateQueries({ queryKey: ["internal-projects"] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.code.includes(search) ||
        p.name.includes(search);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      const matchesPriority = !priorityFilter || p.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, search, statusFilter, priorityFilter]);

  if (isLoadingAuth) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        لا تملك صلاحية عرض المشاريع الداخلية
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">المشاريع الداخلية</h1>
          <p className="text-sm text-gray-500">
            إدارة المشاريع الداخلية للشركة
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingProject(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            مشروع جديد
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث بالكود أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            placeholder="الحالة"
          />
        </div>
        <div className="w-40">
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={PRIORITY_OPTIONS}
            placeholder="الأولوية"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-600">
            {error instanceof Error ? error.message : "حدث خطأ أثناء التحميل"}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => qc.invalidateQueries({ queryKey: ["internal-projects"] })}
          >
            إعادة المحاولة
          </Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا توجد مشاريع داخلية
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right p-4 text-sm font-medium text-gray-500">الكود</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">الاسم</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">الحالة</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">الأولوية</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">تاريخ الاستحقاق</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">المدير</th>
                    <th className="text-center p-4 text-sm font-medium text-gray-500">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <td className="p-4 text-sm font-medium text-dark">
                        {project.code}
                      </td>
                      <td className="p-4 text-sm text-dark">{project.name}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            (STATUS_BADGE[project.status] as "default" | "success" | "warning" | "danger" | "info") || "default"
                          }
                        >
                          {STATUS_LABEL[project.status] || project.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            (PRIORITY_BADGE[project.priority] as "default" | "success" | "warning" | "danger" | "info") || "default"
                          }
                        >
                          {PRIORITY_LABEL[project.priority] || project.priority}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {project.dueDate ? formatDate(project.dueDate) : "-"}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {project.manager?.name || "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/internal-projects/${project.id}`,
                              )
                            }
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-primary"
                            title="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingProject(project);
                                setDialogOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && project.status !== "CANCELLED" && (
                            <button
                              onClick={() => setCancellingProject(project)}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                              title="إلغاء"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingProject(null);
        }}
        project={editingProject}
      />

      <ConfirmDialog
        open={!!cancellingProject}
        onClose={() => setCancellingProject(null)}
        onConfirm={() =>
          cancellingProject && cancelMutation.mutate(cancellingProject)
        }
        title="إلغاء المشروع"
        message={`هل أنت متأكد من إلغاء المشروع "${cancellingProject?.name || ""}"؟`}
        confirmLabel="إلغاء"
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
