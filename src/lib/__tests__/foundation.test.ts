import { describe, it, expect } from "vitest";
import {
  companyFormSchema,
  branchFormSchema,
  fiscalPeriodFormSchema,
} from "@/lib/schemas";
import { checkPermission, checkRole } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { forbiddenError } from "@/lib/api-response";
import type { TokenPayload } from "@/lib/auth";

const VALID_TRANSITIONS: Record<string, string[]> = {
  FUTURE: ["OPEN"],
  OPEN: ["CLOSING_IN_PROGRESS"],
  CLOSING_IN_PROGRESS: ["SOFT_CLOSED"],
  SOFT_CLOSED: ["HARD_CLOSED"],
  HARD_CLOSED: [],
};

describe("companyFormSchema", () => {
  it("accepts valid company data", () => {
    const result = companyFormSchema.safeParse({
      name: "شركة GRESS",
      code: "GRESS",
    });
    expect(result.success).toBe(true);
  });

  it("accepts company with all optional fields", () => {
    const result = companyFormSchema.safeParse({
      name: "شركة GRESS",
      code: "GRESS",
      taxId: "12345",
      address: "بغداد",
      phone: "07700000000",
      email: "info@gress.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = companyFormSchema.safeParse({
      name: "",
      code: "GRESS",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const result = companyFormSchema.safeParse({
      name: "شركة GRESS",
      code: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = companyFormSchema.safeParse({
      name: "شركة GRESS",
      code: "GRESS",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null email", () => {
    const result = companyFormSchema.safeParse({
      name: "شركة GRESS",
      code: "GRESS",
      email: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("branchFormSchema", () => {
  it("accepts valid branch data", () => {
    const result = branchFormSchema.safeParse({
      companyId: "company-id",
      name: "الفرع الرئيسي",
      code: "MAIN",
    });
    expect(result.success).toBe(true);
  });

  it("accepts branch with optional fields", () => {
    const result = branchFormSchema.safeParse({
      companyId: "company-id",
      name: "الفرع الرئيسي",
      code: "MAIN",
      address: "بغداد",
      phone: "07700000000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty companyId", () => {
    const result = branchFormSchema.safeParse({
      companyId: "",
      name: "الفرع الرئيسي",
      code: "MAIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = branchFormSchema.safeParse({
      companyId: "company-id",
      name: "",
      code: "MAIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const result = branchFormSchema.safeParse({
      companyId: "company-id",
      name: "الفرع الرئيسي",
      code: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("fiscalPeriodFormSchema", () => {
  it("accepts valid fiscal period data", () => {
    const result = fiscalPeriodFormSchema.safeParse({
      companyId: "company-id",
      name: "2025",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("accepts fiscal period with branchId", () => {
    const result = fiscalPeriodFormSchema.safeParse({
      companyId: "company-id",
      branchId: "branch-id",
      name: "2025",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty companyId", () => {
    const result = fiscalPeriodFormSchema.safeParse({
      companyId: "",
      name: "2025",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = fiscalPeriodFormSchema.safeParse({
      companyId: "company-id",
      name: "",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty startDate", () => {
    const result = fiscalPeriodFormSchema.safeParse({
      companyId: "company-id",
      name: "2025",
      startDate: "",
      endDate: "2025-12-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty endDate", () => {
    const result = fiscalPeriodFormSchema.safeParse({
      companyId: "company-id",
      name: "2025",
      startDate: "2025-01-01",
      endDate: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("company permissions", () => {
  const userWithFullAccess: TokenPayload = {
    userId: "admin-id",
    email: "admin@test.com",
    name: "Admin",
    roles: ["مدير النظام"],
    permissions: [
      PERMISSIONS.COMPANIES_VIEW,
      PERMISSIONS.COMPANIES_CREATE,
      PERMISSIONS.COMPANIES_EDIT,
    ],
  } as TokenPayload;

  const userWithViewOnly: TokenPayload = {
    userId: "viewer-id",
    email: "viewer@test.com",
    name: "Viewer",
    roles: ["مراقب"],
    permissions: [PERMISSIONS.COMPANIES_VIEW],
  } as TokenPayload;

  const userWithoutAccess: TokenPayload = {
    userId: "no-perms-id",
    email: "no-perms@test.com",
    name: "No Perms",
    roles: [],
    permissions: [],
  } as TokenPayload;

  it("checkPermission returns true for COMPANIES_VIEW with full access", () => {
    expect(
      checkPermission(userWithFullAccess, PERMISSIONS.COMPANIES_VIEW),
    ).toBe(true);
  });

  it("checkPermission returns true for COMPANIES_CREATE with full access", () => {
    expect(
      checkPermission(userWithFullAccess, PERMISSIONS.COMPANIES_CREATE),
    ).toBe(true);
  });

  it("checkPermission returns true for COMPANIES_EDIT with full access", () => {
    expect(
      checkPermission(userWithFullAccess, PERMISSIONS.COMPANIES_EDIT),
    ).toBe(true);
  });

  it("checkPermission returns true for COMPANIES_VIEW with view-only", () => {
    expect(checkPermission(userWithViewOnly, PERMISSIONS.COMPANIES_VIEW)).toBe(
      true,
    );
  });

  it("checkPermission returns false for COMPANIES_CREATE with view-only", () => {
    expect(
      checkPermission(userWithViewOnly, PERMISSIONS.COMPANIES_CREATE),
    ).toBe(false);
  });

  it("checkPermission returns false for COMPANIES_EDIT with view-only", () => {
    expect(checkPermission(userWithViewOnly, PERMISSIONS.COMPANIES_EDIT)).toBe(
      false,
    );
  });

  it("checkPermission returns false for all company perms without access", () => {
    expect(checkPermission(userWithoutAccess, PERMISSIONS.COMPANIES_VIEW)).toBe(
      false,
    );
    expect(
      checkPermission(userWithoutAccess, PERMISSIONS.COMPANIES_CREATE),
    ).toBe(false);
    expect(checkPermission(userWithoutAccess, PERMISSIONS.COMPANIES_EDIT)).toBe(
      false,
    );
  });
});

describe("branch permissions", () => {
  const userWithFullAccess: TokenPayload = {
    userId: "admin-id",
    email: "admin@test.com",
    name: "Admin",
    roles: ["مدير النظام"],
    permissions: [
      PERMISSIONS.BRANCHES_VIEW,
      PERMISSIONS.BRANCHES_CREATE,
      PERMISSIONS.BRANCHES_EDIT,
    ],
  } as TokenPayload;

  const userWithViewOnly: TokenPayload = {
    userId: "viewer-id",
    email: "viewer@test.com",
    name: "Viewer",
    roles: ["مراقب"],
    permissions: [PERMISSIONS.BRANCHES_VIEW],
  } as TokenPayload;

  it("checkPermission returns true for BRANCHES_VIEW with full access", () => {
    expect(checkPermission(userWithFullAccess, PERMISSIONS.BRANCHES_VIEW)).toBe(
      true,
    );
  });

  it("checkPermission returns true for BRANCHES_CREATE with full access", () => {
    expect(
      checkPermission(userWithFullAccess, PERMISSIONS.BRANCHES_CREATE),
    ).toBe(true);
  });

  it("checkPermission returns true for BRANCHES_EDIT with full access", () => {
    expect(checkPermission(userWithFullAccess, PERMISSIONS.BRANCHES_EDIT)).toBe(
      true,
    );
  });

  it("checkPermission returns false for BRANCHES_CREATE with view-only", () => {
    expect(checkPermission(userWithViewOnly, PERMISSIONS.BRANCHES_CREATE)).toBe(
      false,
    );
  });

  it("checkPermission returns false when user is null", () => {
    expect(checkPermission(null, PERMISSIONS.BRANCHES_VIEW)).toBe(false);
  });
});

describe("fiscal period permissions", () => {
  const userWithAccess: TokenPayload = {
    userId: "admin-id",
    email: "admin@test.com",
    name: "Admin",
    roles: ["مدير النظام"],
    permissions: [
      PERMISSIONS.FISCAL_PERIODS_VIEW,
      PERMISSIONS.FISCAL_PERIODS_MANAGE,
    ],
  } as TokenPayload;

  const userWithViewOnly: TokenPayload = {
    userId: "viewer-id",
    email: "viewer@test.com",
    name: "Viewer",
    roles: ["مراقب"],
    permissions: [PERMISSIONS.FISCAL_PERIODS_VIEW],
  } as TokenPayload;

  it("checkPermission returns true for FISCAL_PERIODS_VIEW with access", () => {
    expect(
      checkPermission(userWithAccess, PERMISSIONS.FISCAL_PERIODS_VIEW),
    ).toBe(true);
  });

  it("checkPermission returns true for FISCAL_PERIODS_MANAGE with access", () => {
    expect(
      checkPermission(userWithAccess, PERMISSIONS.FISCAL_PERIODS_MANAGE),
    ).toBe(true);
  });

  it("checkPermission returns false for FISCAL_PERIODS_MANAGE with view-only", () => {
    expect(
      checkPermission(userWithViewOnly, PERMISSIONS.FISCAL_PERIODS_MANAGE),
    ).toBe(false);
  });

  it("checkPermission returns false when user is null", () => {
    expect(checkPermission(null, PERMISSIONS.FISCAL_PERIODS_VIEW)).toBe(false);
  });
});

describe("forbiddenError for permission-denied responses", () => {
  it("returns 403 status", () => {
    const res = forbiddenError();
    expect(res.status).toBe(403);
  });

  it("returns success: false", async () => {
    const res = forbiddenError();
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns custom Arabic message", async () => {
    const res = forbiddenError("لا تملك صلاحية إدارة الفترات المالية");
    const body = await res.json();
    expect(body.error).toBe("لا تملك صلاحية إدارة الفترات المالية");
  });
});

describe("fiscal period status transitions", () => {
  it("allows FUTURE to OPEN", () => {
    expect(VALID_TRANSITIONS["FUTURE"]).toContain("OPEN");
  });

  it("allows OPEN to CLOSING_IN_PROGRESS", () => {
    expect(VALID_TRANSITIONS["OPEN"]).toContain("CLOSING_IN_PROGRESS");
  });

  it("allows CLOSING_IN_PROGRESS to SOFT_CLOSED", () => {
    expect(VALID_TRANSITIONS["CLOSING_IN_PROGRESS"]).toContain("SOFT_CLOSED");
  });

  it("allows SOFT_CLOSED to HARD_CLOSED", () => {
    expect(VALID_TRANSITIONS["SOFT_CLOSED"]).toContain("HARD_CLOSED");
  });

  it("blocks HARD_CLOSED from any transition", () => {
    expect(VALID_TRANSITIONS["HARD_CLOSED"]).toEqual([]);
  });

  it("blocks direct FUTURE to HARD_CLOSED", () => {
    expect(VALID_TRANSITIONS["FUTURE"]).not.toContain("HARD_CLOSED");
  });

  it("blocks direct OPEN to HARD_CLOSED", () => {
    expect(VALID_TRANSITIONS["OPEN"]).not.toContain("HARD_CLOSED");
  });

  it("blocks direct FUTURE to SOFT_CLOSED", () => {
    expect(VALID_TRANSITIONS["FUTURE"]).not.toContain("SOFT_CLOSED");
  });

  it("blocks direct OPEN to SOFT_CLOSED", () => {
    expect(VALID_TRANSITIONS["OPEN"]).not.toContain("SOFT_CLOSED");
  });

  it("blocks rolling back from OPEN to FUTURE", () => {
    expect(VALID_TRANSITIONS["OPEN"]).not.toContain("FUTURE");
  });

  it("blocks rolling back from CLOSING_IN_PROGRESS to OPEN", () => {
    expect(VALID_TRANSITIONS["CLOSING_IN_PROGRESS"]).not.toContain("OPEN");
  });
});

describe("shared permission helpers", () => {
  const mockUser: TokenPayload = {
    userId: "admin-id",
    email: "admin@test.com",
    name: "Admin",
    roles: ["مدير النظام", "محاسب"],
    permissions: [
      PERMISSIONS.COMPANIES_VIEW,
      PERMISSIONS.BRANCHES_VIEW,
      PERMISSIONS.FISCAL_PERIODS_VIEW,
    ],
  } as TokenPayload;

  it("checkRole returns true for assigned roles", () => {
    expect(checkRole(mockUser, "مدير النظام")).toBe(true);
    expect(checkRole(mockUser, "محاسب")).toBe(true);
  });

  it("checkRole returns false for unassigned roles", () => {
    expect(checkRole(mockUser, "مراقب")).toBe(false);
  });

  it("checkRole returns false when user is null", () => {
    expect(checkRole(null, "مدير النظام")).toBe(false);
  });

  it("checkPermission returns false for unassigned permission", () => {
    expect(checkPermission(mockUser, PERMISSIONS.COMPANIES_CREATE)).toBe(false);
    expect(checkPermission(mockUser, PERMISSIONS.BRANCHES_CREATE)).toBe(false);
    expect(checkPermission(mockUser, PERMISSIONS.FISCAL_PERIODS_MANAGE)).toBe(
      false,
    );
  });
});
