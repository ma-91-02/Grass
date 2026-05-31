"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { Search, Eye, Loader2 } from "lucide-react";
import type { TokenPayload } from "@/lib/auth";

interface Manager {
  name: string;
}

interface Project {
  id: string;
  code: string;
  name: string;
  manager: Manager | null;
}

interface Task {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee?: { name: string } | null;
  parentTaskId: string | null;
  projectId: string;
  projectName: string;
  projectCode: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "TODO", label: "للتنفيذ" },
  { value: "IN_PROGRESS", label: "قيد التنفيذ" },
  { value: "REVIEW", label: "مراجعة" },
  { value: "DONE", label: "منجز" },
  { value: "BLOCKED", label: "معطل" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "LOW", label: "منخفضة" },
  { value: "MEDIUM", label: "متوسطة" },
  { value: "HIGH", label: "عالية" },
  { value: "URGENT", label: "عاجلة" },
];

const STATUS_BADGE: Record<string, string> = {
  TODO: "default",
  IN_PROGRESS: "info",
  REVIEW: "warning",
  DONE: "success",
  BLOCKED: "danger",
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "default",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "للتنفيذ",
  IN_PROGRESS: "قيد التنفيذ",
  REVIEW: "مراجعة",
  DONE: "منجز",
  BLOCKED: "معطل",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "منخفضة",
  MEDIUM: "متوسطة",
  HIGH: "عالية",
  URGENT: "عاجلة",
};

export default function MyTasksPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

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
  const currentUserId = user?.userId;

  const {
    data: projects = [],
    isLoading: projectsLoading,
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

  const projectTasksQueries = useQuery({
    queryKey: ["my-tasks", projects.map((p) => p.id).join(",")],
    enabled: projects.length > 0 && !!currentUserId,
    queryFn: async () => {
      const tasksPromises = projects.map(async (project) => {
        try {
          const res = await fetch(
            `/api/internal-projects/${project.id}/tasks`,
          );
          const json = await res.json();
          if (!json.success) return [];
          const projectTasks = (json.data as Task[]).map((task) => ({
            ...task,
            projectId: project.id,
            projectName: project.name,
            projectCode: project.code,
          }));
          return projectTasks;
        } catch {
          return [];
        }
      });
      const nested = await Promise.all(tasksPromises);
      return nested.flat();
    },
  });

  const myTasks = useMemo(() => {
    if (!projectTasksQueries.data || !currentUserId) return [];
    return projectTasksQueries.data;
  }, [projectTasksQueries.data, currentUserId]);

  const isLoading =
    isLoadingAuth || projectsLoading || projectTasksQueries.isLoading;

  const projectOptions = useMemo(
    () => [
      { value: "", label: "كل المشاريع" },
      ...projects.map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects],
  );

  const filteredTasks = useMemo(() => {
    return myTasks.filter((task) => {
      const matchesSearch =
        !search.trim() ||
        task.code.includes(search) ||
        task.title.includes(search);
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesPriority =
        !priorityFilter || task.priority === priorityFilter;
      const matchesProject =
        !projectFilter || task.projectId === projectFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });
  }, [myTasks, search, statusFilter, priorityFilter, projectFilter]);

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
      <div>
        <h1 className="text-2xl font-bold text-dark">مهامي</h1>
        <p className="text-sm text-gray-500">
          جميع المهام المسندة إليك عبر المشاريع
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="بحث بالكود أو العنوان..."
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
        <div className="w-48">
          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            options={projectOptions}
            placeholder="المشروع"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : projectTasksQueries.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          حدث خطأ أثناء تحميل المهام
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            لا توجد مهام مسندة إليك
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right p-4 text-sm font-medium text-gray-500">
                      المشروع
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">
                      الكود
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">
                      العنوان
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">
                      الحالة
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">
                      الأولوية
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">
                      تاريخ الاستحقاق
                    </th>
                    <th className="text-center p-4 text-sm font-medium text-gray-500">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={`${task.projectId}-${task.id}`}
                      className="border-b border-border hover:bg-muted/50"
                    >
                      <td className="p-4 text-sm text-gray-600">
                        <span className="font-medium text-dark">
                          {task.projectName}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-medium text-dark">
                        {task.code}
                      </td>
                      <td className="p-4 text-sm text-dark">{task.title}</td>
                      <td className="p-4">
                        <Badge
                          variant={
                            (STATUS_BADGE[task.status] as "default" | "success" | "warning" | "danger" | "info") || "default"
                          }
                        >
                          {STATUS_LABEL[task.status] || task.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            (PRIORITY_BADGE[task.priority] as "default" | "success" | "warning" | "danger" | "info") || "default"
                          }
                        >
                          {PRIORITY_LABEL[task.priority] || task.priority}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {task.dueDate ? formatDate(task.dueDate) : "-"}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/internal-projects/${task.projectId}`,
                            )
                          }
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-primary"
                          title="عرض المشروع"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
