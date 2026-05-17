import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  slugify,
  generateCode,
  convertArabicNumbers,
  parseNumericInput,
} from "../utils";

describe("formatCurrency", () => {
  it("formats a number with Arabic locale", () => {
    const result = formatCurrency(1234567.89);
    expect(result).toContain("٬");
    expect(result).toBeTruthy();
  });

  it("returns ٠ for null", () => {
    expect(formatCurrency(null)).toBe("٠");
  });

  it("returns ٠ for undefined", () => {
    expect(formatCurrency(undefined)).toBe("٠");
  });

  it("handles string input", () => {
    const result = formatCurrency("5000");
    expect(result).not.toBe("");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("٠");
  });
});

describe("formatDate", () => {
  it("formats a Date object", () => {
    const date = new Date(2024, 0, 15);
    const result = formatDate(date);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("parses ISO string", () => {
    const result = formatDate("2024-06-15");
    expect(result).toBeTruthy();
  });
});

describe("slugify", () => {
  it("converts text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! @World#")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("collapses multiple spaces", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("handles Arabic text", () => {
    const result = slugify("مرحبا بالعالم");
    expect(result).not.toContain(" ");
  });
});

describe("generateCode", () => {
  it("generates zero-padded code", () => {
    expect(generateCode("INV", 1)).toBe("INV-00001");
  });

  it("handles larger numbers", () => {
    expect(generateCode("PO", 999)).toBe("PO-00999");
  });

  it("handles very large numbers", () => {
    expect(generateCode("ITEM", 12345)).toBe("ITEM-12345");
  });

  it("handles empty prefix", () => {
    expect(generateCode("", 5)).toBe("-00005");
  });
});

describe("convertArabicNumbers", () => {
  it("converts Arabic Eastern digits", () => {
    expect(convertArabicNumbers("١٢٣")).toBe("123");
  });

  it("converts Arabic Western digits", () => {
    expect(convertArabicNumbers("۱۲۳")).toBe("123");
  });

  it("handles mixed text", () => {
    expect(convertArabicNumbers("رقم ٤٥")).toBe("رقم 45");
  });

  it("returns empty string unchanged", () => {
    expect(convertArabicNumbers("")).toBe("");
  });

  it("leaves English digits unchanged", () => {
    expect(convertArabicNumbers("hello123")).toBe("hello123");
  });
});

describe("parseNumericInput", () => {
  it("converts Arabic digits", () => {
    expect(parseNumericInput("٤٢")).toBe("42");
  });

  it("handles Arabic decimal separator", () => {
    expect(parseNumericInput("٤٢٫٥")).toBe("42.5");
  });

  it("handles comma as decimal separator", () => {
    expect(parseNumericInput("42,5")).toBe("42.5");
  });

  it("removes thousands separators", () => {
    expect(parseNumericInput("1,234,567")).toBe("1234567");
  });

  it("returns empty string unchanged", () => {
    expect(parseNumericInput("")).toBe("");
  });
});
