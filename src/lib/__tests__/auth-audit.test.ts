import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { recordAuthAudit } from "@/lib/auth/audit";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("auth audit baseline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("records failed login audit without a userId", async () => {
    const result = await recordAuthAudit({
      email: "missing@grass.local",
      action: "LOGIN_FAILED",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      details: {
        reason: "INVALID_CREDENTIALS",
      },
    });

    expect(result).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "LOGIN_FAILED",
        entity: "AUTH",
        entityId: null,
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        details: expect.objectContaining({
          email: "missing@grass.local",
          success: false,
          reason: "INVALID_CREDENTIALS",
        }),
      }),
    });

    const data = (prisma.auditLog.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0].data;
    expect(data).not.toHaveProperty("userId");
  });

  it("records successful login audit with a real userId", async () => {
    const result = await recordAuthAudit({
      userId: "user-1",
      email: "owner@grass.local",
      action: "LOGIN_SUCCESS",
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });

    expect(result).toBe(true);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "LOGIN_SUCCESS",
        entity: "AUTH",
        entityId: "user-1",
        details: expect.objectContaining({
          email: "owner@grass.local",
          success: true,
        }),
      }),
    });
  });

  it("does not throw when auth audit storage fails", async () => {
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("audit failed"),
    );

    await expect(
      recordAuthAudit({
        email: "missing@grass.local",
        action: "LOGIN_FAILED",
      }),
    ).resolves.toBe(false);
  });
});
