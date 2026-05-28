import { describe, it, expect } from "vitest";
import { CurrencyGuard } from "@/lib/services/currency-guard";

describe("CurrencyGuard", () => {
  describe("validateJournalCurrency", () => {
    it("allows when all account currencies match journal currency", () => {
      const accountCurrencies = new Map([
        ["cash-id", "IQD"],
        ["ap-id", "IQD"],
        ["inventory-id", "IQD"],
      ]);
      const lines = [
        { accountId: "cash-id", debit: 100, credit: 0 },
        { accountId: "ap-id", debit: 0, credit: 100 },
      ];
      const result = CurrencyGuard.validateJournalCurrency("IQD", lines, accountCurrencies);
      expect(result.allowed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects when account currency differs from journal currency", () => {
      const accountCurrencies = new Map([
        ["cash-id", "USD"],
        ["ap-id", "IQD"],
      ]);
      const lines = [
        { accountId: "cash-id", debit: 100, credit: 0 },
        { accountId: "ap-id", debit: 0, credit: 100 },
      ];
      const result = CurrencyGuard.validateJournalCurrency("IQD", lines, accountCurrencies);
      expect(result.allowed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("rejects when account not found in map", () => {
      const accountCurrencies = new Map([["cash-id", "IQD"]]);
      const lines = [
        { accountId: "unknown-id", debit: 100, credit: 0 },
      ];
      const result = CurrencyGuard.validateJournalCurrency("IQD", lines, accountCurrencies);
      expect(result.allowed).toBe(false);
    });

    it("allows when journal is USD and all accounts are USD", () => {
      const accountCurrencies = new Map([
        ["cash-usd", "USD"],
        ["ar-usd", "USD"],
        ["revenue", "USD"],
      ]);
      const lines = [
        { accountId: "cash-usd", debit: 50, credit: 0 },
        { accountId: "ar-usd", debit: 50, credit: 0 },
        { accountId: "revenue", debit: 0, credit: 100 },
      ];
      const result = CurrencyGuard.validateJournalCurrency("USD", lines, accountCurrencies);
      expect(result.allowed).toBe(true);
    });

    it("handles empty lines", () => {
      const accountCurrencies = new Map<string, string>();
      const result = CurrencyGuard.validateJournalCurrency("IQD", [], accountCurrencies);
      expect(result.allowed).toBe(true);
    });
  });
});
