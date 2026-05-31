"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Calendar,
  User,
  FileText,
  ListTodo,
  Users,
  Clock,
} from "lucide-react";
import { CreateTaskDialog } from "@/components/internal-projects/create-task-dialog";
import { TaskStatusDropdown } from "@/components/internal-projects/task-status-dropdown";
import { AssignmentSection } from "@/components/internal-projects/assignment-section";
import { WorkLogSection } from "@/components/internal-projects/work-log-section";
import type { TokenPayload } from "@/lib/auth";

interface Manager {
  id: string;
  name: string;
}

interface ProjectDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  managerUserId: string | null;
  manager: Manager | null;
  createdAt: string;
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
  createdAt: string;
}

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
  PLANNED: "مخطط",
  ACTIVE: "نشط",
  PAUSED: "متوقف",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
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

type Tab = "tasks" | "assignments" | "worklogs";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const id = params.id as string;

  const [user, setUser] = useState<TokenPayload | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

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
  const canViewProject = permissions.includes(PERMISSIONS.PROJECTS_VIEW);
  const canEditProject = permissions.includes(PERMISSIONS.PROJECTS_EDIT);
  const canCreateTask = permissions.includes(PERMISSIONS.TASKS_CREATE);
  const canEditTask = permissions.includes(PERMISSIONS.TASKS_EDIT);
  const canDeleteTask = permissions.includes(PERMISSIONS.TASKS_DELETE);
  const canChangeStatus = permissions.includes(PERMISSIONS.TASKS_STATUS);
  const canViewAssignments = permissions.includes(PERMISSIONS.ASSIGNMENTS_VIEW);
  const canCreateAssignment = permissions.includes(PERMISSIONS.ASSIGNMENTS_CREATE);
  const canDeleteAssignment = permissions.includes(PERMISSIONS.ASSIGNMENTS_DELETE);
  const canViewWorkLogs = permissions.includes(PERMISSIONS.WORKLOGS_VIEW);
  const canCreateWorkLog = permissions.includes(PERMISSIONS.WORKLOGS_CREATE);

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["internal-project", id],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch(`/api/internal-projects/${id}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل المشروع");
      return json.data as ProjectDetail;
    },
  });

  const {
    data: tasks = [],
    isLoading: tasksLoading,
  } = useQuery({
    queryKey: ["project-tasks", id],
    enabled: !!user && canViewProject,
    queryFn: async () => {
      const res = await fetch(`/api/internal-projects/${id}/tasks`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل تحميل المهام");
      return json.data as Task[];
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (task: Task) => {
      const res = await fetch(
        `/api/internal-projects/${id}/tasks/${task.id}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "فشل حذف المهمة");
      return json.data;
    },
    onSuccess: () => {
      toast("تم حذف المهمة بنجاح", "success");
      setDeletingTask(null);
      qc.invalidateQueries({ queryKey: ["project-tasks", id] });
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const parentTasks = useMemo(
    () => tasks.filter((t) => t.status !== "DONE" && t.status !== "BLOCKED"),
    [tasks],
  );

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "tasks", label: "المهام", icon: <ListTodo className="h-4 w-4" /> },
    { key: "assignments", label: "التعيينات", icon: <Users className="h-4 w-4" /> },
    { key: "worklogs", label: "سجلات العمل", icon: <Clock className="h-4 w-4" /> },
  ];

  if (isLoadingAuth || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/internal-projects")}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-dark">تفاصيل المشروع</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
          {error instanceof Error ? error.message : "فشل تحميل المشروع"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/internal-projects")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-dark">{project.name}</h1>
            <Badge
              variant={
                (STATUS_BADGE[project.status] as "default" | "success" | "warning" | "danger" | "info") || "default"
              }
            >
              {STATUS_LABEL[project.status] || project.status}
            </Badge>
            <Badge
              variant={
                (PRIORITY_BADGE[project.priority] as "default" | "success" | "warning" | "danger" | "info") || "default"
              }
            >
              {PRIORITY_LABEL[project.priority] || project.priority}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{project.code}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ملخص المشروع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">الكود</p>
                <p className="font-medium">{project.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الاسم</p>
                <p className="font-medium">{project.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <Badge
                  variant={
                    (STATUS_BADGE[project.status] as "default" | "success" | "warning" | "danger" | "info") || "default"
                  }
                >
                  {STATUS_LABEL[project.status] || project.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">الأولوية</p>
                <Badge
                  variant={
                    (PRIORITY_BADGE[project.priority] as "default" | "success" | "warning" | "danger" | "info") || "default"
                  }
                >
                  {PRIORITY_LABEL[project.priority] || project.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">المدير المسؤول</p>
                <p className="font-medium">
                  {project.manager?.name || "غير محدد"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">تاريخ البداية</p>
                <p className="font-medium">
                  {project.startDate ? formatDate(project.startDate) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">تاريخ الاستحقاق</p>
                <p className="font-medium">
                  {project.dueDate ? formatDate(project.dueDate) : "-"}
                </p>
              </div>
            </div>
            {project.description && (
              <div>
                <p className="text-sm text-gray-500">الوصف</p>
                <p className="mt-1 text-sm">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إحصائيات سريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">إجمالي المهام</span>
              <span className="font-medium">{tasks.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">مهام قيد التنفيذ</span>
              <span className="font-medium">
                {tasks.filter((t) => t.status === "IN_PROGRESS").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">مهام منجزة</span>
              <span className="font-medium text-green-600">
                {tasks.filter((t) => t.status === "DONE").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">مهام معلقة</span>
              <span className="font-medium text-yellow-600">
                {tasks.filter((t) => t.status === "TODO" || t.status === "BLOCKED").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-primary text-white"
                      : "text-gray-500 hover:bg-muted hover:text-dark"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === "tasks" && canCreateTask && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingTask(null);
                  setTaskDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                مهمة جديدة
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "tasks" && (
            <div className="space-y-3">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  لا توجد مهام
                </p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-border">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30"
                      onClick={() => toggleTask(task.id)}
                    >
                      <button className="text-gray-400">
                        {expandedTasks.has(task.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronLeft className="h-4 w-4" />
                        )}
                      </button>
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-sm font-medium text-dark min-w-[80px]">
                          {task.code}
                        </span>
                        <span className="text-sm text-dark flex-1">
                          {task.title}
                        </span>
                        <Badge
                          variant={
                            (STATUS_BADGE[task.status] as "default" | "success" | "warning" | "danger" | "info") || "default"
                          }
                        >
                          {STATUS_LABEL[task.status] || task.status}
                        </Badge>
                        <Badge
                          variant={
                            (PRIORITY_BADGE[task.priority] as "default" | "success" | "warning" | "danger" | "info") || "default"
                          }
                        >
                          {PRIORITY_LABEL[task.priority] || task.priority}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-gray-400">
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.assignee && (
                          <span className="text-xs text-gray-500">
                            {task.assignee.name}
                          </span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canChangeStatus && (
                          <TaskStatusDropdown
                            projectId={id}
                            taskId={task.id}
                            currentStatus={task.status}
                          />
                        )}
                        {canEditTask && (
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setTaskDialogOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-muted hover:text-blue-600"
                            title="تعديل"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDeleteTask && task.status === "TODO" && (
                          <button
                            onClick={() => setDeletingTask(task)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-muted hover:text-red-600"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {expandedTasks.has(task.id) && (
                      <div className="border-t border-border px-4 py-3 space-y-4">
                        <div>
                          <h4 className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            التعيينات
                          </h4>
                          <AssignmentSection
                            projectId={id}
                            taskId={task.id}
                            canCreate={canCreateAssignment}
                            canDelete={canDeleteAssignment}
                          />
                        </div>
                        <div>
                          <h4 className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            سجلات العمل
                          </h4>
                          <WorkLogSection
                            projectId={id}
                            taskId={task.id}
                            canCreate={canCreateWorkLog}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  لا توجد مهام لإظهار التعيينات
                </p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-border px-4 py-3">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-medium text-dark">
                        {task.code}
                      </span>
                      <span className="text-sm text-gray-500">
                        {task.title}
                      </span>
                    </div>
                    <AssignmentSection
                      projectId={id}
                      taskId={task.id}
                      canCreate={canCreateAssignment}
                      canDelete={canDeleteAssignment}
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "worklogs" && (
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  لا توجد مهام لإظهار سجلات العمل
                </p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-border px-4 py-3"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-medium text-dark">
                        {task.code}
                      </span>
                      <span className="text-sm text-gray-500">
                        {task.title}
                      </span>
                    </div>
                    <WorkLogSection
                      projectId={id}
                      taskId={task.id}
                      canCreate={canCreateWorkLog}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTaskDialog
        open={taskDialogOpen}
        onClose={() => {
          setTaskDialogOpen(false);
          setEditingTask(null);
        }}
        projectId={id}
        task={editingTask}
        parentTasks={parentTasks}
      />

      <ConfirmDialog
        open={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        onConfirm={() =>
          deletingTask && deleteTaskMutation.mutate(deletingTask)
        }
        title="حذف المهمة"
        message={`هل أنت متأكد من حذف المهمة "${deletingTask?.title || ""}"؟`}
        confirmLabel="حذف"
        loading={deleteTaskMutation.isPending}
      />
    </div>
  );
}
