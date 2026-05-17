import type { JournalLineInput } from "./ledger-validator";

export class CurrencyGuard {
  static validateJournalCurrency(
    journalCurrency: string,
    lines: JournalLineInput[],
    accountCurrencies: Map<string, string>,
  ): { allowed: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const line of lines) {
      const accountCurrency = accountCurrencies.get(line.accountId);
      if (!accountCurrency) {
        errors.push(`الحساب ${line.accountId} غير موجود`);
        continue;
      }
      if (accountCurrency !== journalCurrency) {
        errors.push(
          `عملة الحساب (${accountCurrency}) لا تطابق عملة القيد (${journalCurrency})`,
        );
      }
    }

    return { allowed: errors.length === 0, errors };
  }

  static isIsolatedCurrencyPair(currency1: string, currency2: string): boolean {
    // IQD and USD must not be mixed in one journal
    if (
      (currency1 === "IQD" && currency2 === "USD") ||
      (currency1 === "USD" && currency2 === "IQD")
    ) {
      return false;
    }
    return true;
  }
}
