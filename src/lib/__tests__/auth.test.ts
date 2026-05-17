import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";

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
});
