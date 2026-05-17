import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "البريد الإلكتروني مطلوب")
    .email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  user: AuthUserResponse;
  token: string;
}

export interface SessionResponse {
  user: {
    userId: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
}
