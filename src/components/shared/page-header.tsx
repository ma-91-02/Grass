import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function PageHeader({ title, description, actionLabel, onAction }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-dark">{title}</h1>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
