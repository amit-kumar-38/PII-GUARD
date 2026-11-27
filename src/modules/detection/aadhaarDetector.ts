import type { PiiDetection } from '../../types/pii.ts';

// 12-digit Aadhaar formats: 1234 5678 9012, 1234-5678-9012, or 123456789012.
// Rejects leading '+' (international phone prefix) and adjacent digits/letters/decimal dots.
const AADHAAR_CANDIDATE_REGEX =
  /(?<!\d\.)(?<![\d+\p{L}])(?<!\d[ -])(\d{4}([ -])\d{4}\2\d{4}|\d{12})(?![\d\p{L}]|\.\d)(?![ -]\d)/gu;

export function detectAadhaar(text: string): PiiDetection[] {
  const detections: PiiDetection[] = [];
  AADHAAR_CANDIDATE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = AADHAAR_CANDIDATE_REGEX.exec(text)) !== null) {
    const value = match[1];
    if (!value) continue;

    const digits = value.replace(/[\s-]/g, '');
    if (digits.length !== 12 || /^0+$/.test(digits)) {
      continue;
    }

    const start = match.index;
    const end = start + value.length;
    detections.push({
      id: `AADHAAR:${start}:${end}`,
      category: 'AADHAAR',
      value,
      normalizedValue: digits,
      start,
      end,
      validationStatus: 'VALID_FORMAT',
      validationNote: '12-digit Aadhaar format match only; not a UIDAI verification',
    });
  }

  return detections;
}
