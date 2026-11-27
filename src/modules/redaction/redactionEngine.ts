import {
  PSEUDONYM_PREFIXES,
  type CategoryPolicyMap,
  type PiiDetection,
  type PseudonymSession,
  type RedactionMode,
  type TransformationOperator,
} from '../../types/pii.ts';
import { applyFullMask } from './fullMask.ts';
import { applyPartialMask } from './partialMask.ts';
import { createPseudonymSession, getOrAssignPseudonym } from './pseudonymization.ts';

export interface RedactedSegment {
  text: string;
  isRedacted: boolean;
  detection?: PiiDetection;
  replacement?: string;
  operator?: TransformationOperator;
}

export interface RedactionOutput {
  sanitizedText: string;
  segments: RedactedSegment[];
  replacements: Map<string, string>;
}

export function resolveOperatorForDetection(
  detection: PiiDetection,
  mode: RedactionMode,
  categoryPolicies?: CategoryPolicyMap,
  findingOverrides?: Record<string, TransformationOperator>,
): TransformationOperator {
  const override = findingOverrides?.[detection.id];
  if (override) {
    return override;
  }
  if (categoryPolicies) {
    return categoryPolicies[detection.category];
  }
  return mode;
}

export function applyOperator(
  detection: PiiDetection,
  operator: TransformationOperator,
  session: PseudonymSession,
): string {
  switch (operator) {
    case 'FULL':
      return applyFullMask();
    case 'PARTIAL':
      return applyPartialMask(detection);
    case 'PSEUDONYM':
      return getOrAssignPseudonym(session, detection);
    case 'LABEL':
      return `[${PSEUDONYM_PREFIXES[detection.category]}]`;
    case 'REMOVE':
      return '';
    case 'KEEP':
      return detection.value;
  }
}

export function resolveReplacement(
  detection: PiiDetection,
  mode: RedactionMode,
  session: PseudonymSession,
  categoryPolicies?: CategoryPolicyMap,
  findingOverrides?: Record<string, TransformationOperator>,
): string {
  const operator = resolveOperatorForDetection(
    detection,
    mode,
    categoryPolicies,
    findingOverrides,
  );
  return applyOperator(detection, operator, session);
}

/**
 * Applies the selected redaction mode or per-category/per-finding operators across
 * non-overlapping sorted detections while preserving surrounding text.
 */
export function redactText(
  text: string,
  detections: PiiDetection[],
  mode: RedactionMode,
  session: PseudonymSession = createPseudonymSession(),
  categoryPolicies?: CategoryPolicyMap,
  findingOverrides?: Record<string, TransformationOperator>,
): RedactionOutput {
  if (!text) {
    return {
      sanitizedText: '',
      segments: [],
      replacements: new Map(),
    };
  }

  if (detections.length === 0) {
    return {
      sanitizedText: text,
      segments: [{ text, isRedacted: false }],
      replacements: new Map(),
    };
  }

  const ordered = [...detections].sort((a, b) => a.start - b.start);
  const segments: RedactedSegment[] = [];
  const replacements = new Map<string, string>();
  let cursor = 0;
  let output = '';

  for (const detection of ordered) {
    if (detection.start < cursor) {
      continue;
    }

    if (detection.start > cursor) {
      const plain = text.slice(cursor, detection.start);
      segments.push({ text: plain, isRedacted: false });
      output += plain;
    }

    const operator = resolveOperatorForDetection(
      detection,
      mode,
      categoryPolicies,
      findingOverrides,
    );
    const replacement = applyOperator(detection, operator, session);
    replacements.set(detection.id, replacement);
    segments.push({
      text: replacement,
      isRedacted: operator !== 'KEEP',
      detection,
      replacement,
      operator,
    });
    output += replacement;
    cursor = detection.end;
  }

  if (cursor < text.length) {
    const trailing = text.slice(cursor);
    segments.push({ text: trailing, isRedacted: false });
    output += trailing;
  }

  return {
    sanitizedText: output,
    segments,
    replacements,
  };
}
