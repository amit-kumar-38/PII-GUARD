import {
  PSEUDONYM_PREFIXES,
  type PiiCategory,
  type PiiDetection,
  type PseudonymSession,
} from '../../types/pii.ts';

/**
 * Creates a fresh in-memory pseudonymization session.
 * Never persisted to localStorage, IndexedDB, cookies, or external storage.
 */
export function createPseudonymSession(): PseudonymSession {
  return {
    maps: {
      EMAIL: new Map<string, string>(),
      PHONE: new Map<string, string>(),
      IP: new Map<string, string>(),
      PAN: new Map<string, string>(),
      AADHAAR: new Map<string, string>(),
      CREDIT_CARD: new Map<string, string>(),
    },
    counters: {
      EMAIL: 0,
      PHONE: 0,
      IP: 0,
      PAN: 0,
      AADHAAR: 0,
      CREDIT_CARD: 0,
    },
  };
}

/**
 * Deterministically maps a normalized PII entity to its session placeholder
 * (e.g., EMAIL_001, PHONE_001, CARD_001).
 */
export function getOrAssignPseudonym(
  session: PseudonymSession,
  detection: PiiDetection,
): string {
  const category: PiiCategory = detection.category;
  const map = session.maps[category];
  const existing = map.get(detection.normalizedValue);
  if (existing !== undefined) {
    return existing;
  }

  session.counters[category] += 1;
  const num = String(session.counters[category]).padStart(3, '0');
  const placeholder = `${PSEUDONYM_PREFIXES[category]}_${num}`;
  map.set(detection.normalizedValue, placeholder);
  return placeholder;
}
