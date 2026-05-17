import { describe, it, expect, vi, beforeEach } from "vitest";
import { canAccessCompany, requireDbPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TokenPayload } from "@/lib/auth";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    role: {
      findMany: vi.fn(),
    },
  },
}));

describe("canAccessCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser: TokenPayload = {
    userId: "user-123",
    email: "test@grass.com",
    name: "Test User",
    roles: ["user"],
    permissions: [],
  } as TokenPayload;

  it("allows access when user companyId matches requested company", async () => {
    const companyId = "comp-abc";
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      companyId: companyId,
    });
    (
      prisma.role.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);

    const result = await canAccessCompany(mockUser, companyId);
    expect(result).toBe(true);
  });

  it("denies access when user companyId differs from requested company", async () => {
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      companyId: "comp-other",
    });
    (
      prisma.role.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);

    const result = await canAccessCompany(mockUser, "comp-abc");
    expect(result).toBe(false);
  });

  it("denies access when user has no companyId and is not global admin", async () => {
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      companyId: null,
    });
    (
      prisma.role.findMany as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue([]);

    const result = await canAccessCompany(mockUser, "comp-abc");
    expect(result).toBe(false);
  });

  it("allows access for global admin regardless of companyId", async () => {
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "user-123",
      isActive: true,
      companyId: null,
      roles: [
        {
          role: {
            permissions: [{ permission: { key: "settings.manage" } }],
          },
        },
      ],
    });

    const result = await canAccessCompany(mockUser, "comp-abc");
    expect(result).toBe(true);
  });

  it("denies access when user DB record does not exist", async () => {
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    const result = await canAccessCompany(mockUser, "comp-abc");
    expect(result).toBe(false);
  });
});

describe("requireDbPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when DB shows user has permission", async () => {
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "user-123",
      isActive: true,
      roles: [
        {
          role: {
            permissions: [{ permission: { key: "journals.post" } }],
          },
        },
      ],
    });

    const result = await requireDbPermission("user-123", "journals.post");
    expect(result).toBe(true);
  });

  it("returns false when DB shows user lacks permission", async () => {
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "user-123",
      isActive: true,
      roles: [
        {
          role: {
            permissions: [{ permission: { key: "journals.create" } }],
          },
        },
      ],
    });

    const result = await requireDbPermission("user-123", "journals.post");
    expect(result).toBe(false);
  });

  it("returns false when user is inactive in DB", async () => {
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null);

    const result = await requireDbPermission("user-123", "journals.post");
    expect(result).toBe(false);
  });

  it("returns false when DB query throws", async () => {
    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("DB error"));

    const result = await requireDbPermission("user-123", "journals.post");
    expect(result).toBe(false);
  });

  it("ignores stale JWT permissions and checks DB only", async () => {
    // JWT payload claims the user has "journals.post", but DB says otherwise
    const staleJwtUser: TokenPayload = {
      userId: "user-456",
      email: "stale@grass.com",
      name: "Stale User",
      roles: ["admin"],
      permissions: ["journals.post"],
    } as TokenPayload;

    (
      prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "user-456",
      isActive: true,
      roles: [
        {
          role: {
            permissions: [{ permission: { key: "journals.create" } }],
          },
        },
      ],
    });

    // requireDbPermission should query DB, not trust JWT
    const result = await requireDbPermission(staleJwtUser.userId, "journals.post");
    expect(result).toBe(false);
  });
});
