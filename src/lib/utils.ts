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

export async function safeJson<T = unknown>(
  response: Response,
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!response.ok) {
    try {
      const body = await response.json();
      return {
        success: false,
        error: body.error || `فشل الطلب (${response.status})`,
      };
    } catch {
      return { success: false, error: `فشل الطلب (${response.status})` };
    }
  }
  try {
    const body = await response.json();
    return body;
  } catch {
    return { success: false, error: "استجابة غير متوقعة من الخادم" };
  }
}

export function parseNumericInput(value: string): string {
  if (!value) return value;
  // Step 1: Convert Arabic/Persian digits to English
  let result = convertArabicNumbers(value);
  // Step 2: Replace Arabic decimal point (٫ U+066B) with .
  result = result.replace(/٫/g, ".");
  // Step 3: Replace English comma with . (decimal separator)
  const commaCount = (result.match(/,/g) || []).length;
  if (commaCount === 1) {
    // Single comma = likely decimal separator
    result = result.replace(",", ".");
  } else if (commaCount > 1) {
    // Multiple commas = likely thousands separators, remove them
    result = result.replace(/,/g, "");
  }
  // Step 4: Remove any non-numeric characters except digits, dot, and minus
  result = result.replace(/[^\d.\-]/g, "");
  return result;
}
