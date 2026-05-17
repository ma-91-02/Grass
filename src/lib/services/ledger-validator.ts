export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  totalDebit: number;
  totalCredit: number;
}

export class LedgerValidator {
  private static readonly ALLOWED_ACCOUNT_TYPES = [
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "INCOME",
    "EXPENSE",
  ];

  static validateLines(lines: JournalLineInput[]): ValidationResult {
    const errors: string[] = [];

    if (!lines || lines.length < 2) {
      errors.push("يجب أن يحتوي القيد على سطرين على الأقل");
      return { valid: false, errors, totalDebit: 0, totalCredit: 0 };
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;

      if (debit < 0 || credit < 0) {
        errors.push(`السطر ${i + 1}: لا يمكن أن يكون المبلغ سالباً`);
      }

      if (debit === 0 && credit === 0) {
        errors.push(`السطر ${i + 1}: يجب إدخال مدين أو دائن`);
      }

      if (debit > 0 && credit > 0) {
        errors.push(
          `السطر ${i + 1}: لا يمكن أن يكون المدين والدائن موجبين معاً`,
        );
      }

      if (!line.accountId) {
        errors.push(`السطر ${i + 1}: الحساب مطلوب`);
      }

      totalDebit += debit;
      totalCredit += credit;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      errors.push(
        `غير متوازن: مجموع المدين (${totalDebit.toFixed(3)}) != مجموع الدائن (${totalCredit.toFixed(3)})`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      totalDebit,
      totalCredit,
    };
  }

  static validateCurrencyMatch(
    lineCurrency: string,
    accountCurrency: string,
  ): boolean {
    return lineCurrency === accountCurrency;
  }

  static isAccountPostingAllowed(
    isPosting: boolean,
    hasChildren: boolean,
  ): boolean {
    if (hasChildren) return false;
    return isPosting;
  }

  static validateAccountType(type: string): boolean {
    return this.ALLOWED_ACCOUNT_TYPES.includes(type);
  }
}
