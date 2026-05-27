import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PeriodGuard } from "@/lib/services/period-guard";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fiscalPeriod: {
      findFirst: vi.fn(),
    },
  },
}));

describe("PeriodGuard.checkPeriodOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows posting only when matching period is OPEN", async () => {
    (
      prisma.fiscalPeriod.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "fp-open",
      name: "2026",
      status: "OPEN",
    });

    const result = await PeriodGuard.checkPeriodOpen(
      "company-1",
      new Date("2026-05-28"),
      "branch-1",
    );

    expect(result.allowed).toBe(true);
  });

  it("blocks posting when matching period is ARCHIVED", async () => {
    (
      prisma.fiscalPeriod.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "fp-archived",
      name: "2025",
      status: "ARCHIVED",
    });

    const result = await PeriodGuard.checkPeriodOpen(
      "company-1",
      new Date("2025-12-31"),
      "branch-1",
    );

    expect(result.allowed).toBe(false);
    expect(result.error).toContain("مؤرشفة");
  });
});
