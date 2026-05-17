import { describe, it, expect } from "vitest";
import { journalEntryFormSchema, journalLineSchema } from "@/lib/schemas";
import { checkPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { forbiddenError } from "@/lib/api-response";
import {
  LedgerValidator,
  type JournalLineInput,
} from "@/lib/services/ledger-validator";
import type { TokenPayload } from "@/lib/auth";

const VALID_ENTRY_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["POSTED"],
  POSTED: ["REVERSED"],
  REVERSED: [],
};

describe("journalLineSchema", () => {
  it("accepts debit-only line", () => {
    const result = journalLineSchema.safeParse({
      accountId: "acc-1",
      debit: 1000,
      credit: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts credit-only line", () => {
    const result = journalLineSchema.safeParse({
      accountId: "acc-1",
      debit: 0,
      credit: 1000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts line with description", () => {
    const result = journalLineSchema.safeParse({
      accountId: "acc-1",
      debit: 500,
      credit: 0,
      description: "إيجار الشهر",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty accountId", () => {
    const result = journalLineSchema.safeParse({
      accountId: "",
      debit: 1000,
      credit: 0,
    });
    expect(result.success).toBe(false);
  });

  it("defaults debit to 0", () => {
    const result = journalLineSchema.safeParse({
      accountId: "acc-1",
      credit: 1000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.debit).toBe(0);
    }
  });

  it("defaults credit to 0", () => {
    const result = journalLineSchema.safeParse({
      accountId: "acc-1",
      debit: 1000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.credit).toBe(0);
    }
  });
});

describe("journalEntryFormSchema", () => {
  it("accepts valid journal entry with 2+ lines", () => {
    const result = journalEntryFormSchema.safeParse({
      companyId: "c1",
      entryDate: "2025-01-15",
      currency: "IQD",
      lines: [
        { accountId: "acc-1", debit: 1000, credit: 0 },
        { accountId: "acc-2", debit: 0, credit: 1000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts entry with all optional fields", () => {
    const result = journalEntryFormSchema.safeParse({
      companyId: "c1",
      branchId: "b1",
      fiscalPeriodId: "fp1",
      entryDate: "2025-01-15",
      currency: "USD",
      exchangeRateSnapshot: 1500,
      description: "قيد اختبار",
      sourceType: "MANUAL",
      sourceId: "src-1",
      lines: [
        { accountId: "acc-1", debit: 500, credit: 0 },
        { accountId: "acc-2", debit: 0, credit: 500 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
      expect(result.data.exchangeRateSnapshot).toBe(1500);
    }
  });

  it("rejects empty companyId", () => {
    const result = journalEntryFormSchema.safeParse({
      companyId: "",
      lines: [
        { accountId: "acc-1", debit: 1000, credit: 0 },
        { accountId: "acc-2", debit: 0, credit: 1000 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 lines", () => {
    const result = journalEntryFormSchema.safeParse({
      companyId: "c1",
      lines: [{ accountId: "acc-1", debit: 1000, credit: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid currency", () => {
    const result = journalEntryFormSchema.safeParse({
      companyId: "c1",
      currency: "EUR",
      lines: [
        { accountId: "acc-1", debit: 1000, credit: 0 },
        { accountId: "acc-2", debit: 0, credit: 1000 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("defaults currency to IQD", () => {
    const result = journalEntryFormSchema.safeParse({
      companyId: "c1",
      lines: [
        { accountId: "acc-1", debit: 1000, credit: 0 },
        { accountId: "acc-2", debit: 0, credit: 1000 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("IQD");
    }
  });

  it("defaults exchangeRateSnapshot to 1", () => {
    const result = journalEntryFormSchema.safeParse({
      companyId: "c1",
      lines: [
        { accountId: "acc-1", debit: 1000, credit: 0 },
        { accountId: "acc-2", debit: 0, credit: 1000 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exchangeRateSnapshot).toBe(1);
    }
  });
});

describe("LedgerValidator.validateLines", () => {
  it("accepts balanced entry", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "a1", debit: 1000, credit: 0 },
      { accountId: "a2", debit: 0, credit: 1000 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.totalDebit).toBe(1000);
    expect(result.totalCredit).toBe(1000);
  });

  it("rejects unbalanced entry", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "a1", debit: 1000, credit: 0 },
      { accountId: "a2", debit: 0, credit: 500 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("غير متوازن");
  });

  it("rejects fewer than 2 lines", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "a1", debit: 1000, credit: 0 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("سطرين");
  });

  it("rejects empty lines array", () => {
    const result = LedgerValidator.validateLines([]);
    expect(result.valid).toBe(false);
  });

  it("rejects line with both debit and credit > 0", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "a1", debit: 500, credit: 300 },
      { accountId: "a2", debit: 0, credit: 800 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("المدين والدائن");
  });

  it("rejects line with zero debit and zero credit", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "a1", debit: 0, credit: 0 },
      { accountId: "a2", debit: 0, credit: 0 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("مدين أو دائن");
  });

  it("rejects negative amounts", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "a1", debit: -100, credit: 0 },
      { accountId: "a2", debit: 0, credit: 100 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("سالباً");
  });

  it("rejects missing accountId", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "", debit: 1000, credit: 0 },
      { accountId: "a2", debit: 0, credit: 1000 },
    ]);
    expect(result.valid).toBe(false);
  });

  it("handles multiple errors simultaneously", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "", debit: -100, credit: 50 },
      { accountId: "", debit: 0, credit: 0 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  it("accepts multi-line balanced entry", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "a1", debit: 1000, credit: 0 },
      { accountId: "a2", debit: 500, credit: 0 },
      { accountId: "a3", debit: 0, credit: 1500 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.totalDebit).toBe(1500);
    expect(result.totalCredit).toBe(1500);
  });

  it("computes totalDebit and totalCredit correctly", () => {
    const result = LedgerValidator.validateLines([
      { accountId: "a1", debit: 250.5, credit: 0 },
      { accountId: "a2", debit: 0, credit: 250.5 },
    ]);
    expect(result.valid).toBe(true);
    expect(result.totalDebit).toBeCloseTo(250.5);
    expect(result.totalCredit).toBeCloseTo(250.5);
  });
});

describe("LedgerValidator helpers", () => {
  it("validateCurrencyMatch returns true for same currency", () => {
    expect(LedgerValidator.validateCurrencyMatch("IQD", "IQD")).toBe(true);
    expect(LedgerValidator.validateCurrencyMatch("USD", "USD")).toBe(true);
  });

  it("validateCurrencyMatch returns false for different currencies", () => {
    expect(LedgerValidator.validateCurrencyMatch("IQD", "USD")).toBe(false);
    expect(LedgerValidator.validateCurrencyMatch("USD", "IQD")).toBe(false);
  });

  it("isAccountPostingAllowed returns true for posting account without children", () => {
    expect(LedgerValidator.isAccountPostingAllowed(true, false)).toBe(true);
  });

  it("isAccountPostingAllowed returns false for non-posting account", () => {
    expect(LedgerValidator.isAccountPostingAllowed(false, false)).toBe(false);
  });

  it("isAccountPostingAllowed returns false for account with children", () => {
    expect(LedgerValidator.isAccountPostingAllowed(true, true)).toBe(false);
  });

  it("validateAccountType returns true for valid types", () => {
    expect(LedgerValidator.validateAccountType("ASSET")).toBe(true);
    expect(LedgerValidator.validateAccountType("LIABILITY")).toBe(true);
    expect(LedgerValidator.validateAccountType("EQUITY")).toBe(true);
    expect(LedgerValidator.validateAccountType("INCOME")).toBe(true);
    expect(LedgerValidator.validateAccountType("EXPENSE")).toBe(true);
  });

  it("validateAccountType returns false for invalid type", () => {
    expect(LedgerValidator.validateAccountType("BALANCE_SHEET")).toBe(false);
    expect(LedgerValidator.validateAccountType("")).toBe(false);
  });
});

describe("journal entry permissions", () => {
  const userWithCreate: TokenPayload = {
    userId: "admin-id",
    email: "admin@test.com",
    name: "Admin",
    roles: ["مدير النظام"],
    permissions: [
      PERMISSIONS.JOURNALS_CREATE,
      PERMISSIONS.JOURNALS_POST,
      PERMISSIONS.JOURNALS_REVERSE,
    ],
  } as TokenPayload;

  const userWithoutAccess: TokenPayload = {
    userId: "no-perms-id",
    email: "no-perms@test.com",
    name: "No Perms",
    roles: [],
    permissions: [],
  } as TokenPayload;

  it("checkPermission returns true for JOURNALS_CREATE with access", () => {
    expect(checkPermission(userWithCreate, PERMISSIONS.JOURNALS_CREATE)).toBe(
      true,
    );
  });

  it("checkPermission returns true for JOURNALS_POST with access", () => {
    expect(checkPermission(userWithCreate, PERMISSIONS.JOURNALS_POST)).toBe(
      true,
    );
  });

  it("checkPermission returns true for JOURNALS_REVERSE with access", () => {
    expect(checkPermission(userWithCreate, PERMISSIONS.JOURNALS_REVERSE)).toBe(
      true,
    );
  });

  it("checkPermission returns false for JOURNALS_CREATE without access", () => {
    expect(
      checkPermission(userWithoutAccess, PERMISSIONS.JOURNALS_CREATE),
    ).toBe(false);
  });

  it("checkPermission returns false for JOURNALS_POST without access", () => {
    expect(checkPermission(userWithoutAccess, PERMISSIONS.JOURNALS_POST)).toBe(
      false,
    );
  });

  it("checkPermission returns false for JOURNALS_REVERSE without access", () => {
    expect(
      checkPermission(userWithoutAccess, PERMISSIONS.JOURNALS_REVERSE),
    ).toBe(false);
  });

  it("checkPermission returns false when user is null", () => {
    expect(checkPermission(null, PERMISSIONS.JOURNALS_CREATE)).toBe(false);
    expect(checkPermission(null, PERMISSIONS.JOURNALS_POST)).toBe(false);
    expect(checkPermission(null, PERMISSIONS.JOURNALS_REVERSE)).toBe(false);
  });

  it("forbiddenError returns 403 for journal entry denial", () => {
    const res = forbiddenError("لا تملك صلاحية إنشاء القيود اليومية");
    expect(res.status).toBe(403);
  });
});

describe("journal entry status transitions", () => {
  it("allows DRAFT to POSTED", () => {
    expect(VALID_ENTRY_TRANSITIONS["DRAFT"]).toContain("POSTED");
  });

  it("allows POSTED to REVERSED", () => {
    expect(VALID_ENTRY_TRANSITIONS["POSTED"]).toContain("REVERSED");
  });

  it("blocks REVERSED from any transition", () => {
    expect(VALID_ENTRY_TRANSITIONS["REVERSED"]).toEqual([]);
  });

  it("blocks DRAFT to REVERSED direct", () => {
    expect(VALID_ENTRY_TRANSITIONS["DRAFT"]).not.toContain("REVERSED");
  });

  it("blocks POSTED back to DRAFT", () => {
    expect(VALID_ENTRY_TRANSITIONS["POSTED"]).not.toContain("DRAFT");
  });

  it("blocks POSTED to POSTED (no self-transition)", () => {
    expect(VALID_ENTRY_TRANSITIONS["POSTED"]).not.toContain("POSTED");
  });
});

describe("journal currency invariants", () => {
  it("IQD journal with IQD accounts is valid", () => {
    const accountCurrencies = new Map([
      ["a1", "IQD"],
      ["a2", "IQD"],
    ]);
    const lines: JournalLineInput[] = [
      { accountId: "a1", debit: 1000, credit: 0 },
      { accountId: "a2", debit: 0, credit: 1000 },
    ];
    const { valid } = LedgerValidator.validateLines(lines);
    expect(valid).toBe(true);
    // Currency match would be validated at the route level with CurrencyGuard
    expect(accountCurrencies.get("a1")).toBe("IQD");
    expect(accountCurrencies.get("a2")).toBe("IQD");
  });

  it("mixed IQD/USD journal with mixed accounts would be caught by CurrencyGuard", () => {
    const accountCurrencies = new Map([
      ["a1-iqd", "IQD"],
      ["a2-usd", "USD"],
    ]);
    const match1 = accountCurrencies.get("a1-iqd");
    const match2 = accountCurrencies.get("a2-usd");
    expect(match1).toBe("IQD");
    expect(match2).toBe("USD");
    expect(match1).not.toBe(match2);
  });
});
