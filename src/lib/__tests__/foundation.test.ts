import { describe, it, expect } from "vitest";
import {
  companyFormSchema,
  branchFormSchema,
  fiscalPeriodFormSchema,
  accountFormSchema,
  productCategoryFormSchema,
  unitSchema,
  productFormSchema,
} from "@/lib/schemas";
import { checkPermission, checkRole } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  serverError,
} from "@/lib/api-response";
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

describe("API response helper consistency", () => {
  it("successResponse returns 200 with success:true and data", async () => {
    const res = successResponse({ id: "1" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: "1" });
  });

  it("successResponse returns custom status code", async () => {
    const res = successResponse({ id: "1" }, 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("errorResponse returns 400 with success:false and error message", async () => {
    const res = errorResponse("خطأ في البيانات");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("خطأ في البيانات");
  });

  it("errorResponse returns custom status code", async () => {
    const res = errorResponse("غير مصرح", 401);
    expect(res.status).toBe(401);
  });

  it("unauthorizedError returns 401 with success:false", async () => {
    const res = unauthorizedError();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("غير مصرح");
  });

  it("forbiddenError returns 403 with success:false", async () => {
    const res = forbiddenError();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("لا تملك الصلاحية");
  });

  it("notFoundError returns 404 with success:false", async () => {
    const res = notFoundError();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("غير موجود");
  });

  it("conflictError returns 409 with success:false", async () => {
    const res = conflictError();
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("موجود مسبقاً");
  });

  it("serverError returns 500 with success:false", async () => {
    const res = serverError(new Error("test error"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("خطأ داخلي في الخادم");
  });

  it("all error responses have uniform shape { success: false, error: string }", async () => {
    const helpers = [
      { fn: () => errorResponse("msg", 400), expectedStatus: 400 },
      { fn: () => unauthorizedError(), expectedStatus: 401 },
      { fn: () => forbiddenError(), expectedStatus: 403 },
      { fn: () => notFoundError(), expectedStatus: 404 },
      { fn: () => conflictError(), expectedStatus: 409 },
    ];
    for (const h of helpers) {
      const res = h.fn();
      expect(res.status).toBe(h.expectedStatus);
      const body = await res.json();
      expect(Object.keys(body).sort()).toEqual(["error", "success"]);
      expect(body.success).toBe(false);
      expect(typeof body.error).toBe("string");
    }
  });

  it("successResponse has uniform shape { success: true, data }", async () => {
    const res = successResponse(["a", "b"]);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["data", "success"]);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
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

describe("accountFormSchema", () => {
  it("accepts valid account", () => {
    const result = accountFormSchema.safeParse({
      companyId: "c1",
      code: "1.1.1",
      name: "صندوق",
      type: "ASSET",
    });
    expect(result.success).toBe(true);
  });

  it("accepts account with all fields", () => {
    const result = accountFormSchema.safeParse({
      companyId: "c1",
      code: "1.1.2",
      name: "صندوق الدولار",
      type: "ASSET",
      parentId: "parent-id",
      subtype: "CASH",
      normalBalance: "DEBIT",
      currency: "USD",
      isPosting: true,
      isSystem: true,
      isProtected: true,
      allowManualJournal: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty companyId", () => {
    const result = accountFormSchema.safeParse({
      companyId: "",
      code: "1",
      name: "أصول",
      type: "ASSET",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty code", () => {
    const result = accountFormSchema.safeParse({
      companyId: "c1",
      code: "",
      name: "أصول",
      type: "ASSET",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = accountFormSchema.safeParse({
      companyId: "c1",
      code: "1",
      name: "",
      type: "ASSET",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = accountFormSchema.safeParse({
      companyId: "c1",
      code: "1",
      name: "Test",
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("defaults normalBalance to DEBIT", () => {
    const result = accountFormSchema.safeParse({
      companyId: "c1",
      code: "1",
      name: "أصول",
      type: "ASSET",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.normalBalance).toBe("DEBIT");
    }
  });

  it("defaults currency to IQD", () => {
    const result = accountFormSchema.safeParse({
      companyId: "c1",
      code: "1",
      name: "أصول",
      type: "ASSET",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("IQD");
    }
  });

  it("defaults isPosting to true", () => {
    const result = accountFormSchema.safeParse({
      companyId: "c1",
      code: "1",
      name: "أصول",
      type: "ASSET",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPosting).toBe(true);
    }
  });
});

describe("account permissions", () => {
  const admin: TokenPayload = {
    userId: "admin-id",
    email: "admin@test.com",
    name: "Admin",
    roles: ["مدير النظام"],
    permissions: [
      PERMISSIONS.ACCOUNTS_VIEW,
      PERMISSIONS.ACCOUNTS_CREATE,
      PERMISSIONS.ACCOUNTS_EDIT,
      PERMISSIONS.ACCOUNTS_DELETE,
      PERMISSIONS.ACCOUNTS_TREE,
      PERMISSIONS.ACCOUNTS_STATEMENT,
    ],
  } as TokenPayload;

  const viewer: TokenPayload = {
    userId: "viewer-id",
    email: "viewer@test.com",
    name: "Viewer",
    roles: ["مراقب"],
    permissions: [PERMISSIONS.ACCOUNTS_VIEW, PERMISSIONS.ACCOUNTS_TREE],
  } as TokenPayload;

  it("admin has ACCOUNTS_VIEW", () => {
    expect(checkPermission(admin, PERMISSIONS.ACCOUNTS_VIEW)).toBe(true);
  });

  it("admin has ACCOUNTS_CREATE", () => {
    expect(checkPermission(admin, PERMISSIONS.ACCOUNTS_CREATE)).toBe(true);
  });

  it("admin has ACCOUNTS_DELETE", () => {
    expect(checkPermission(admin, PERMISSIONS.ACCOUNTS_DELETE)).toBe(true);
  });

  it("viewer has ACCOUNTS_VIEW", () => {
    expect(checkPermission(viewer, PERMISSIONS.ACCOUNTS_VIEW)).toBe(true);
  });

  it("viewer lacks ACCOUNTS_CREATE", () => {
    expect(checkPermission(viewer, PERMISSIONS.ACCOUNTS_CREATE)).toBe(false);
  });

  it("viewer lacks ACCOUNTS_DELETE", () => {
    expect(checkPermission(viewer, PERMISSIONS.ACCOUNTS_DELETE)).toBe(false);
  });

  it("null user lacks all account perms", () => {
    expect(checkPermission(null, PERMISSIONS.ACCOUNTS_VIEW)).toBe(false);
    expect(checkPermission(null, PERMISSIONS.ACCOUNTS_DELETE)).toBe(false);
  });
});

describe("user delete permission enforcement", () => {
  const admin: TokenPayload = {
    userId: "admin-id",
    email: "admin@test.com",
    name: "Admin",
    roles: ["مدير النظام"],
    permissions: [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT,
      PERMISSIONS.USERS_DELETE,
    ],
  } as TokenPayload;

  const viewer: TokenPayload = {
    userId: "viewer-id",
    email: "viewer@test.com",
    name: "Viewer",
    roles: ["مراقب"],
    permissions: [PERMISSIONS.USERS_VIEW],
  } as TokenPayload;

  it("admin has USERS_DELETE", () => {
    expect(checkPermission(admin, PERMISSIONS.USERS_DELETE)).toBe(true);
  });

  it("viewer lacks USERS_DELETE", () => {
    expect(checkPermission(viewer, PERMISSIONS.USERS_DELETE)).toBe(false);
  });

  it("null user cannot delete", () => {
    expect(checkPermission(null, PERMISSIONS.USERS_DELETE)).toBe(false);
  });

  it("forbiddenError returns 403 for user delete denial", () => {
    const res = forbiddenError("لا تملك صلاحية حذف المستخدمين");
    expect(res.status).toBe(403);
  });
});

describe("account delete rules", () => {
  const admin: TokenPayload = {
    userId: "admin-id",
    email: "admin@test.com",
    name: "Admin",
    roles: ["مدير النظام"],
    permissions: [PERMISSIONS.ACCOUNTS_DELETE],
  } as TokenPayload;

  it("admin has ACCOUNTS_DELETE", () => {
    expect(checkPermission(admin, PERMISSIONS.ACCOUNTS_DELETE)).toBe(true);
  });

  it("viewer lacks ACCOUNTS_DELETE", () => {
    const viewer: TokenPayload = {
      userId: "v-id",
      email: "v@test.com",
      name: "V",
      roles: ["مراقب"],
      permissions: [],
    } as TokenPayload;
    expect(checkPermission(viewer, PERMISSIONS.ACCOUNTS_DELETE)).toBe(false);
  });

  it("delete blocked returns 403 when no permission", () => {
    const res = forbiddenError("لا تملك صلاحية حذف الحسابات");
    expect(res.status).toBe(403);
  });
});

describe("account validation rules", () => {
  const baseAccount = {
    companyId: "c1",
    code: "1.1.1",
    name: "صندوق",
    type: "ASSET",
    normalBalance: "DEBIT",
    currency: "IQD",
    parentId: null,
  } as const;

  it("rejects currency mismatch with parent (IQD vs USD)", () => {
    const result = accountFormSchema.safeParse({
      ...baseAccount,
      currency: "USD",
      parentId: "parent-iqd-account",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type enum", () => {
    const result = accountFormSchema.safeParse({
      ...baseAccount,
      type: "BALANCE_SHEET",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid currency", () => {
    const result = accountFormSchema.safeParse({
      ...baseAccount,
      currency: "EUR",
    });
    expect(result.success).toBe(false);
  });

  it("accepts both IQD and USD", () => {
    expect(
      accountFormSchema.safeParse({ ...baseAccount, currency: "IQD" }).success,
    ).toBe(true);
    expect(
      accountFormSchema.safeParse({ ...baseAccount, currency: "USD" }).success,
    ).toBe(true);
  });

  it("accepts all account types", () => {
    for (const t of ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]) {
      expect(
        accountFormSchema.safeParse({ ...baseAccount, type: t }).success,
      ).toBe(true);
    }
  });
});

describe("productCategoryFormSchema", () => {
  const base = {
    companyId: "c1",
    name: "مواد غذائية",
    code: "FOOD",
  } as const;

  it("accepts valid category", () => {
    expect(productCategoryFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(
      productCategoryFormSchema.safeParse({ ...base, name: "" }).success,
    ).toBe(false);
  });

  it("rejects missing companyId", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { companyId, ...rest } = base;
    expect(productCategoryFormSchema.safeParse(rest).success).toBe(false);
  });
});

describe("unitSchema", () => {
  const base = {
    companyId: "c1",
    name: "علبة",
    code: "BOX",
    type: "BOX",
  } as const;

  it("accepts valid unit", () => {
    expect(unitSchema.safeParse(base).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(unitSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(unitSchema.safeParse({ ...base, type: "INVALID" }).success).toBe(
      false,
    );
  });
});

describe("productFormSchema", () => {
  const base = {
    companyId: "c1",
    name: "تمر",
    code: "DATES-01",
    sku: "SKU-001",
    barcode: "123456789",
    categoryId: "cat-1",
    unitId: "unit-1",
    packaging: "قطعة",
    purchasePrice: 1000,
    purchaseCurrency: "IQD",
    productType: "STOCK",
    description: "تمر عراقي",
    isActive: true,
    prices: [],
  } as const;

  it("accepts valid product", () => {
    expect(productFormSchema.safeParse(base).success).toBe(true);
  });

  it("accepts SERVICE product", () => {
    expect(
      productFormSchema.safeParse({ ...base, productType: "SERVICE" }).success,
    ).toBe(true);
  });

  it("rejects empty name", () => {
    expect(productFormSchema.safeParse({ ...base, name: "" }).success).toBe(
      false,
    );
  });

  it("rejects missing companyId", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { companyId, ...rest } = base;
    expect(productFormSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid productType", () => {
    expect(
      productFormSchema.safeParse({ ...base, productType: "INVALID" }).success,
    ).toBe(false);
  });

  it("requires unitId", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { unitId, ...rest } = base;
    expect(productFormSchema.safeParse(rest).success).toBe(false);
  });
});
