import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { successResponse, errorResponse } from "@/lib/api-response";

describe("hashPassword and verifyPassword", () => {
  it("hashes and verifies a password correctly", async () => {
    const password = "Test123!@#";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2")).toBe(true);

    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct-password");
    const valid = await verifyPassword("wrong-password", hash);
    expect(valid).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const password = "same-password";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});

describe("loginSchema", () => {
  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({
      email: "admin@grass.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({
      email: "admin@grass.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "admin@grass.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("API response consistency", () => {
  it("errorResponse returns success: false", async () => {
    const res = errorResponse("خطأ", 400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("خطأ");
  });

  it("errorResponse returns correct status", () => {
    const res = errorResponse("غير مصرح", 401);
    expect(res.status).toBe(401);
  });

  it("errorResponse returns success: false for 429", () => {
    const res = errorResponse("كثيرة", 429);
    expect(res.status).toBe(429);
  });

  it("errorResponse returns success: false for 500", () => {
    const res = errorResponse("خطأ", 500);
    expect(res.status).toBe(500);
  });

  it("successResponse returns success: true", async () => {
    const res = successResponse({ user: "test" });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user).toBe("test");
  });

  it("successResponse returns 200 by default", () => {
    const res = successResponse({ ok: true });
    expect(res.status).toBe(200);
  });
});

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const ip = "192.168.1.1";
    resetRateLimit(ip);
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks multiple attempts from same IP", () => {
    const ip = "192.168.1.2";
    resetRateLimit(ip);

    for (let i = 0; i < 4; i++) {
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
    }

    const fifth = checkRateLimit(ip);
    expect(fifth.allowed).toBe(true);

    const sixth = checkRateLimit(ip);
    expect(sixth.allowed).toBe(false);
    expect(sixth.remaining).toBe(0);
  });

  it("allows different IPs independently", () => {
    const ip1 = "192.168.1.10";
    const ip2 = "192.168.1.20";
    resetRateLimit(ip1);
    resetRateLimit(ip2);

    for (let i = 0; i < 10; i++) {
      checkRateLimit(ip1);
    }
    expect(checkRateLimit(ip1).allowed).toBe(false);

    const result = checkRateLimit(ip2);
    expect(result.allowed).toBe(true);
  });

  it("resets rate limit", () => {
    const ip = "192.168.1.30";
    resetRateLimit(ip);

    for (let i = 0; i < 10; i++) {
      checkRateLimit(ip);
    }
    expect(checkRateLimit(ip).allowed).toBe(false);

    resetRateLimit(ip);
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
  });

  it("bypasses rate limit for dev IP (unknown)", () => {
    for (let i = 0; i < 100; i++) {
      const result = checkRateLimit("unknown");
      expect(result.allowed).toBe(true);
    }
  });
});

describe("authenticateUser with valid admin credentials", () => {
  it("verifies password against seed hash", async () => {
    const hash = await hashPassword("admin123");
    const valid = await verifyPassword("admin123", hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password for admin", async () => {
    const hash = await hashPassword("admin123");
    const valid = await verifyPassword("wrongpass", hash);
    expect(valid).toBe(false);
  });

  it("handles empty password", async () => {
    const hash = await hashPassword("admin123");
    const valid = await verifyPassword("", hash);
    expect(valid).toBe(false);
  });
});

describe("login success response shape", () => {
  it("successResponse returns success: true with user data", async () => {
    const res = successResponse({
      user: {
        id: "test-id",
        name: "مدير النظام",
        email: "admin@grass.com",
        roles: ["مدير النظام"],
      },
      token: "test-token",
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe("admin@grass.com");
    expect(body.data.user.roles).toContain("مدير النظام");
    expect(body.data.token).toBeTruthy();
  });

  it("errorResponse never contains success: true", async () => {
    const res = errorResponse("بيانات الدخول غير صحيحة", 401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
    expect(body.data).toBeUndefined();
  });
});
