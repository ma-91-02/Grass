import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | null | undefined,
): string {
  const num = Number(amount) || 0;
  return num.toLocaleString("ar-IQ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export function generateCode(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(5, "0")}`;
}

const ARABIC_NUM_MAP: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

export function convertArabicNumbers(value: string): string {
  let result = value;
  for (const [arabic, english] of Object.entries(ARABIC_NUM_MAP)) {
    result = result.replace(new RegExp(arabic, "g"), english);
  }
  return result;
}

export function parseNumericInput(value: string): string {
  return convertArabicNumbers(value).replace(",", ".");
}
