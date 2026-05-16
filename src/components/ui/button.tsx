import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

const variantStyles = {
  primary: "bg-primary text-white hover:bg-primary-dark focus:ring-primary",
  secondary: "bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary",
  outline: "border border-border bg-white text-dark hover:bg-muted focus:ring-border",
  ghost: "text-dark hover:bg-muted focus:ring-border",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
}

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
