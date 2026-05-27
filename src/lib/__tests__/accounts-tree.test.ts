import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, checkPermission, canAccessCompany } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  checkPermission: vi.fn(),
  canAccessCompany: vi.fn(),
}));

describe("accounts tree route company isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "u1",
      email: "test@grass.local",
      name: "Test",
      roles: ["محاسب"],
      permissions: ["accounts.tree"],
    });
    (checkPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it("rejects tree access when user cannot access requested company", async () => {
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const { GET } = await import("@/app/api/accounts/tree/route");
    const request = new Request(
      "http://localhost/api/accounts/tree?companyId=company-other",
    );
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(prisma.account.findMany).not.toHaveBeenCalled();
  });

  it("returns account tree when company access is allowed", async () => {
    (canAccessCompany as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "root",
        code: "1",
        name: "الأصول",
        type: "ASSET",
        level: 1,
        currency: "IQD",
        parentId: null,
      },
      {
        id: "cash",
        code: "1.1",
        name: "الصندوق",
        type: "ASSET",
        level: 2,
        currency: "IQD",
        parentId: "root",
      },
    ]);

    const { GET } = await import("@/app/api/accounts/tree/route");
    const request = new Request(
      "http://localhost/api/accounts/tree?companyId=company-1",
    );
    const response = await GET(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data[0].id).toBe("root");
    expect(json.data[0].children[0].id).toBe("cash");
  });
});
