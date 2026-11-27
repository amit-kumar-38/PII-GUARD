import {
  PII_CATEGORIES,
  type CategoryCounts,
  type DetectionResult,
  type PiiCategory,
  type PiiDetection,
} from '../../types/pii.ts';
import { detectAadhaar } from './aadhaarDetector.ts';
import { detectCreditCards } from './creditCardDetector.ts';
import { detectEmails } from './emailDetector.ts';
import { detectIps } from './ipDetector.ts';
import { detectPans } from './panDetector.ts';
import { detectPhones } from './phoneDetector.ts';

const CATEGORY_PRIORITY: Record<PiiCategory, number> = {
  EMAIL: 6,
  IP: 5,
  CREDIT_CARD: 4,
  AADHAAR: 3,
  PAN: 2,
  PHONE: 1,
};

export function createEmptyCounts(): CategoryCounts {
  return {
    EMAIL: 0,
    PHONE: 0,
    IP: 0,
    PAN: 0,
    AADHAAR: 0,
    CREDIT_CARD: 0,
  };
}

/**
 * Resolves overlapping PII detections deterministically using category specificity,
 * span length, and start offset. Guarantees zero double-redacted characters.
 */
export function resolveOverlaps(candidates: PiiDetection[]): PiiDetection[] {
  if (candidates.length <= 1) {
    return [...candidates].sort((a, b) => a.start - b.start);
  }

  const ranked = [...candidates].sort((a, b) => {
    const priorityDiff = CATEGORY_PRIORITY[b.category] - CATEGORY_PRIORITY[a.category];
    if (priorityDiff !== 0) return priorityDiff;

    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;

    return a.start - b.start;
  });

  const accepted: PiiDetection[] = [];
  for (const candidate of ranked) {
    const overlaps = accepted.some(
      (existing) => candidate.start < existing.end && existing.start < candidate.end,
    );
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.start - b.start);
}

export function summarizeDetections(
  detections: PiiDetection[],
  rejectedCardCandidates = 0,
  rejectedIpCandidates = 0,
): DetectionResult {
  const categoryCounts = createEmptyCounts();
  const uniqueSets: Record<PiiCategory, Set<string>> = {
    EMAIL: new Set(),
    PHONE: new Set(),
    IP: new Set(),
    PAN: new Set(),
    AADHAAR: new Set(),
    CREDIT_CARD: new Set(),
  };

  for (const item of detections) {
    categoryCounts[item.category] += 1;
    uniqueSets[item.category].add(item.normalizedValue);
  }

  const uniqueCounts = createEmptyCounts();
  let totalUnique = 0;
  for (const category of PII_CATEGORIES) {
    const count = uniqueSets[category].size;
    uniqueCounts[category] = count;
    totalUnique += count;
  }

  return {
    detections,
    categoryCounts,
    uniqueCounts,
    totalOccurrences: detections.length,
    totalUnique,
    rejectedCardCandidates,
    rejectedIpCandidates,
  };
}

/**
 * Runs all six deterministic client-side PII detectors and resolves overlaps.
 */
export function detectPii(text: string): DetectionResult {
  if (!text || text.trim().length === 0) {
    return summarizeDetections([], 0, 0);
  }

  const emails = detectEmails(text);
  const ipOutcome = detectIps(text);
  const pans = detectPans(text);
  const aadhaar = detectAadhaar(text);
  const cardOutcome = detectCreditCards(text);
  const phones = detectPhones(text);

  const combined = [
    ...emails,
    ...ipOutcome.detections,
    ...cardOutcome.detections,
    ...aadhaar,
    ...pans,
    ...phones,
  ];

  const resolved = resolveOverlaps(combined);
  return summarizeDetections(
    resolved,
    cardOutcome.rejectedCandidates,
    ipOutcome.rejectedCandidates,
  );
}
