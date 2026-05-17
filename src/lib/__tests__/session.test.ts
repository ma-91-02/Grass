import { describe, it, expect } from "vitest";
import { createToken, verifyToken, isTokenExpired } from "@/lib/auth/session";
import type { TokenPayload } from "@/lib/auth/session";

const mockPayload: Omit<TokenPayload, "iat" | "exp"> = {
  userId: "test-user-id",
  email: "test@grass.com",
  name: "Test User",
  roles: ["admin"],
  permissions: ["users.view", "users.edit"],
};

describe("createToken and verifyToken", () => {
  it("creates a valid JWT token", async () => {
    const token = await createToken(mockPayload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("verifies a valid token", async () => {
    const token = await createToken(mockPayload);
    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("test-user-id");
    expect(payload!.email).toBe("test@grass.com");
    expect(payload!.name).toBe("Test User");
    expect(payload!.roles).toEqual(["admin"]);
    expect(payload!.permissions).toEqual(["users.view", "users.edit"]);
  });

  it("returns null for invalid token", async () => {
    const payload = await verifyToken("invalid-token-string");
    expect(payload).toBeNull();
  });

  it("returns null for tampered token", async () => {
    const token = await createToken(mockPayload);
    const parts = token.split(".");
    parts[2] = "tampered-signature";
    const tampered = parts.join(".");
    const payload = await verifyToken(tampered);
    expect(payload).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("returns true for expired payload", () => {
    const expiredPayload = {
      ...mockPayload,
      iat: 0,
      exp: 1,
    } as unknown as TokenPayload;
    expect(isTokenExpired(expiredPayload)).toBe(true);
  });

  it("returns true when exp is missing", () => {
    const payload = { ...mockPayload } as unknown as TokenPayload;
    expect(isTokenExpired(payload)).toBe(true);
  });
});
