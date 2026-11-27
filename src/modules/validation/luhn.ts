/**
 * Validates a normalized digit string using the Luhn (mod-10) checksum algorithm.
 * Note: Luhn validation is a format-level checksum only and does not prove that
 * a card number is genuine, active, or issued by a financial institution.
 */
export function isValidLuhn(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) {
    return false;
  }

  // Reject degenerate all-zero sequences which trivially pass mod-10.
  if (/^0+$/.test(digits)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const code = digits.charCodeAt(i) - 48;
    let digit = code;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Strips accepted credit card separators (spaces and hyphens) to digits only.
 */
export function normalizeCardDigits(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}
