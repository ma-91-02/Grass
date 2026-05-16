import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0
  return num.toLocaleString("ar-IQ", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = new Date(date)
  return d.toLocaleDateString("ar-IQ", { year: "numeric", month: "numeric", day: "numeric" })
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-")
}

export function generateCode(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(5, "0")}`
}
