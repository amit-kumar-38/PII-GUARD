import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface ValidatedPhoneInfo {
  normalizedE164: string;
  subtype: 'IN' | 'INTL';
  validationStatus: 'LIBRARY_VERIFIED' | 'VALID_FORMAT';
  validationNote: string;
}

/**
 * Validates a phone number candidate offline using locally bundled libphonenumber-js.
 * Does not claim that a matched number is an active or verified subscriber line.
 */
export function validatePhoneCandidate(candidate: string): ValidatedPhoneInfo | null {
  const digitsOnly = candidate.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return null;
  }

  // Reject 12-digit numbers without '+' prefix so Aadhaar-length sequences aren't misclassified as phones.
  const hasPlus = candidate.trim().startsWith('+');
  if (!hasPlus && digitsOnly.length === 12) {
    return null;
  }

  const hasPhoneFormatting = /[()\s-]/.test(candidate);

  if (hasPlus) {
    const parsed = parsePhoneNumberFromString(candidate);
    if (!parsed) {
      return null;
    }
    const isIndian = parsed.country === 'IN';
    if (parsed.isValid()) {
      return {
        normalizedE164: parsed.number,
        subtype: isIndian ? 'IN' : 'INTL',
        validationStatus: 'LIBRARY_VERIFIED',
        validationNote: `libphonenumber-js format check passed (${parsed.country ?? 'INTL'}; format only, not subscriber verification)`,
      };
    }
    // Accept well-formed synthetic international numbers (e.g., +1 (555) 234-5678) that pass length/possibility checks.
    if (parsed.isPossible() && hasPhoneFormatting) {
      return {
        normalizedE164: parsed.number,
        subtype: isIndian ? 'IN' : 'INTL',
        validationStatus: 'VALID_FORMAT',
        validationNote: `Possible international phone format (${parsed.country ?? 'INTL'}; synthetic/format match only)`,
      };
    }
    return null;
  }

  // Try Indian numbering plan first (handles 10-digit mobiles 6-9xxxxxxxxx, 0-prefixed 11-digit numbers, and IN landlines).
  const parsedIn = parsePhoneNumberFromString(candidate, 'IN');
  if (parsedIn && parsedIn.isValid()) {
    return {
      normalizedE164: parsedIn.number,
      subtype: 'IN',
      validationStatus: 'LIBRARY_VERIFIED',
      validationNote: 'libphonenumber-js IN format check passed (format only, not subscriber verification)',
    };
  }

  // For non-Indian domestic numbers without '+', require explicit phone formatting like (415) 555-0199 or 555-234-5678
  // so arbitrary 10-digit integers in logs are not falsely flagged as phones.
  if (hasPhoneFormatting) {
    const parsedUs = parsePhoneNumberFromString(candidate, 'US');
    if (parsedUs && (parsedUs.isValid() || parsedUs.isPossible())) {
      return {
        normalizedE164: parsedUs.number,
        subtype: 'INTL',
        validationStatus: parsedUs.isValid() ? 'LIBRARY_VERIFIED' : 'VALID_FORMAT',
        validationNote: 'Phone formatting and length check passed (format only, not subscriber verification)',
      };
    }
  }

  return null;
}
