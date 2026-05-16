"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Eye,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onToggleStatus?: (item: T) => void;
  onView?: (item: T) => void;
  editLabel?: string;
  deleteLabel?: string;
  toggleLabel?: string;
  viewLabel?: string;
  actions?: (item: T) => React.ReactNode;
  extraActions?: {
    label: string;
    onClick: (item: T) => void;
    icon?: React.ReactNode;
  }[];
}

export function DataTable<T extends { id: string; isActive?: boolean }>({
  columns,
  data,
  loading,
  error,
  search,
  onSearchChange,
  searchPlaceholder = "بحث...",
  onEdit,
  onDelete,
  onToggleStatus,
  onView,
  editLabel = "تعديل",
  deleteLabel = "حذف",
  toggleLabel,
  viewLabel = "عرض",
  actions,
  extraActions,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...data];
  if (sortKey) {
    sorted.sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bVal = String((b as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onSearchChange && (
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={search || ""}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setPage(0);
            }}
            className="pr-10"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-right text-sm font-medium text-gray-600",
                      col.sortable &&
                        "cursor-pointer select-none hover:text-dark",
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortKey === col.key && (
                        <span className="text-xs">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                {(onEdit ||
                  onDelete ||
                  onToggleStatus ||
                  onView ||
                  actions ||
                  extraActions) && (
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 w-32">
                    إجراءات
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      columns.length +
                      (onEdit ||
                      onDelete ||
                      onToggleStatus ||
                      onView ||
                      actions ||
                      extraActions
                        ? 1
                        : 0)
                    }
                    className="px-4 py-16 text-center text-gray-500"
                  >
                    لا توجد بيانات
                  </td>
                </tr>
              ) : (
                paged.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-dark">
                        {col.render(item)}
                      </td>
                    ))}
                    {(onEdit ||
                      onDelete ||
                      onToggleStatus ||
                      onView ||
                      actions ||
                      extraActions) && (
                      <td className="px-4 py-3">
                        {actions ? (
                          <div className="flex items-center justify-center gap-1">
                            {actions(item)}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            {onView && (
                              <button
                                onClick={() => onView(item)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-primary"
                                title={viewLabel}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            {onEdit && (
                              <button
                                onClick={() => onEdit(item)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-blue-600"
                                title={editLabel}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                            {onToggleStatus && (
                              <button
                                onClick={() => onToggleStatus(item)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-amber-600"
                                title={
                                  toggleLabel ||
                                  (item.isActive ? "تعطيل" : "تفعيل")
                                }
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={() => onDelete(item)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-red-600"
                                title={deleteLabel}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            {extraActions?.map((action, i) => (
                              <button
                                key={i}
                                onClick={() => action.onClick(item)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-muted hover:text-primary"
                                title={action.label}
                              >
                                {action.icon || (
                                  <span className="text-xs">
                                    {action.label}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            الصفحة {page + 1} من {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
