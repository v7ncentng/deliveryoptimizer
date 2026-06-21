import { describe, it, expect } from "vitest";
import {
  formatUsPhoneNumber,
  isComplete10DigitUsPhone,
  toE164UsPhone,
} from "@/lib/utils/phone";

describe("formatUsPhoneNumber", () => {
  it("formats a plain 10-digit number", () => {
    expect(formatUsPhoneNumber("4155551234")).toBe("415-555-1234");
  });

  it("strips a pasted +1 country code before formatting", () => {
    expect(formatUsPhoneNumber("+14155551234")).toBe("415-555-1234");
  });

  it("strips a leading 1 dialing prefix without a +", () => {
    expect(formatUsPhoneNumber("14155551234")).toBe("415-555-1234");
  });

  it("does not strip a leading 1 while still typing a partial number", () => {
    expect(formatUsPhoneNumber("1")).toBe("1");
    expect(formatUsPhoneNumber("141")).toBe("141");
  });
});

describe("isComplete10DigitUsPhone / toE164UsPhone", () => {
  it("round-trips a formatted number to E.164", () => {
    const formatted = formatUsPhoneNumber("+14155551234");
    expect(isComplete10DigitUsPhone(formatted)).toBe(true);
    expect(toE164UsPhone(formatted)).toBe("+14155551234");
  });
});
