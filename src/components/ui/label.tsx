import { cn } from "@/lib/utils";

interface LabelProps {
  children: string;
  className?: string;
  htmlFor?: string;
  required?: boolean;
}

export function Label({ children, className, htmlFor, required }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-sm font-medium text-dark mb-1", className)}
    >
      {children}
      {required && <span className="mr-1 text-red-500">*</span>}
    </label>
  );
}
