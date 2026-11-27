import type { PiiDetection } from '../../types/pii.ts';
import { validatePhoneCandidate } from '../validation/phoneValidation.ts';

// Bounded candidate regex for international (+prefix) and domestic phone numbers.
// Separators are limited to spaces, hyphens, and parentheses (excluding dots to avoid IP/version collisions).
const PHONE_CANDIDATE_REGEX =
  /(?<!\d\.)(?<![\d\p{L}_-])(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,5}\)[\s-]?|\d{2,5}[\s-])?\d{3,5}(?:[\s-]?\d{3,5}){1,2}(?![\d\p{L}_-]|\.\d)/gu;

export function detectPhones(text: string): PiiDetection[] {
  const detections: PiiDetection[] = [];
  PHONE_CANDIDATE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PHONE_CANDIDATE_REGEX.exec(text)) !== null) {
    const rawValue = match[0];
    if (!rawValue) continue;

    // Trim any accidental leading/trailing separator
    const value = rawValue.trim();
    if (!value) continue;

    const validated = validatePhoneCandidate(value);
    if (!validated) {
      continue;
    }

    const offsetShift = rawValue.indexOf(value);
    const start = match.index + offsetShift;
    const end = start + value.length;

    detections.push({
      id: `PHONE:${start}:${end}`,
      category: 'PHONE',
      value,
      normalizedValue: validated.normalizedE164,
      start,
      end,
      validationStatus: validated.validationStatus,
      validationNote: validated.validationNote,
      subtype: validated.subtype,
    });
  }

  return detections;
}
