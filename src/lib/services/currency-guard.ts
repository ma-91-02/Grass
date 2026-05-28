export class CurrencyGuard {
  static validateJournalCurrency(
    journalCurrency: string,
    lines: { accountId: string; debit: number; credit: number }[],
    accountCurrencies: Map<string, string>,
  ): { allowed: boolean; errors: string[] } {
    const errors: string[] = [];
    let seenCurrency: string | null = null;

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
      if (seenCurrency && accountCurrency !== seenCurrency) {
        errors.push(
          `تعارض عملات بين الحسابات: ${seenCurrency} و ${accountCurrency}`,
        );
      }
      seenCurrency = accountCurrency;
    }

    return { allowed: errors.length === 0, errors };
  }
}
