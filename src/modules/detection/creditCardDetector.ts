import type { PiiDetection } from '../../types/pii.ts';
import { isValidLuhn, normalizeCardDigits } from '../validation/luhn.ts';

// Bounded candidate patterns covering standard 13-19 digit card groupings with consistent spaces or hyphens,
// or contiguous 13-19 digits. Prevents crossing lines or merging unrelated phone/date sequences.
const CARD_CANDIDATE_REGEX =
  /(?<!\d\.)(?<![\d+\p{L}])(?<!\d[ -])(\d{4}([ -])\d{4}\2\d{4}\2\d{4}\2\d{1,3}|\d{4}([ -])\d{4}\3\d{4}\3\d{1,7}|\d{4}([ -])\d{6}\4\d{5}|\d{13,19})(?![\d\p{L}]|\.\d)(?![ -]\d)/gu;

export interface CreditCardDetectionOutcome {
  detections: PiiDetection[];
  rejectedCandidates: number;
}

export function detectCreditCards(text: string): CreditCardDetectionOutcome {
  const detections: PiiDetection[] = [];
  let rejectedCandidates = 0;
  CARD_CANDIDATE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CARD_CANDIDATE_REGEX.exec(text)) !== null) {
    const value = match[1];
    if (!value) continue;

    const digits = normalizeCardDigits(value);
    if (digits.length < 13 || digits.length > 19) {
      continue;
    }

    if (!isValidLuhn(digits)) {
      rejectedCandidates += 1;
      continue;
    }

    const start = match.index;
    const end = start + value.length;
    detections.push({
      id: `CREDIT_CARD:${start}:${end}`,
      category: 'CREDIT_CARD',
      value,
      normalizedValue: digits,
      start,
      end,
      validationStatus: 'LUHN_VERIFIED',
      validationNote: `Luhn mod-10 checksum passed (${digits.length} digits; format-level check, not proof of active/issued card)`,
      subtype: `${digits.length}-digit`,
    });
  }

  return { detections, rejectedCandidates };
}
