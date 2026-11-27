import { useEffect, useRef, type ReactNode } from 'react';
import {
  CATEGORY_SHORT_LABELS,
  type PiiCategory,
  type PiiDetection,
} from '../../types/pii.ts';
import type { RedactedSegment } from '../../modules/redaction/redactionEngine.ts';

interface OriginalHighlightedTextProps {
  text: string;
  detections: PiiDetection[];
  selectedDetectionId?: string | null;
  categoryFilter?: PiiCategory | 'ALL';
  onSelectDetection?: (id: string) => void;
}

/**
 * Safely renders original text with non-color-only PII highlight badges using React text nodes.
 * Never uses dangerouslySetInnerHTML.
 */
export function OriginalHighlightedText({
  text,
  detections,
  selectedDetectionId = null,
  categoryFilter = 'ALL',
  onSelectDetection,
}: OriginalHighlightedTextProps) {
  const selectedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = selectedRef.current;
    if (!selectedDetectionId || !el) return;
    const container = el.closest('.pg-panel-body') as HTMLElement | null;
    if (!container) return;
    const elRect = el.getBoundingClientRect();
    const boxRect = container.getBoundingClientRect();
    if (elRect.top < boxRect.top || elRect.bottom > boxRect.bottom) {
      container.scrollTop += elRect.top - boxRect.top - 48;
    }
  }, [selectedDetectionId]);

  if (!text) {
    return (
      <p className="pg-empty-preview">
        No input yet. Paste text, upload a <code>.txt</code> or <code>.csv</code> file, or load a synthetic sample to inspect detections.
      </p>
    );
  }

  if (detections.length === 0) {
    return <pre className="pg-code-block">{text}</pre>;
  }

  const ordered = [...detections].sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const det of ordered) {
    if (det.start < cursor) continue;
    if (det.start > cursor) {
      nodes.push(text.slice(cursor, det.start));
    }
    const label = CATEGORY_SHORT_LABELS[det.category];
    const isSelected = selectedDetectionId === det.id;
    const isDimmed = categoryFilter !== 'ALL' && det.category !== categoryFilter;

    nodes.push(
      <mark
        key={det.id}
        ref={isSelected ? selectedRef : undefined}
        className={`pg-pii-mark pg-pii-mark--${det.category} ${
          isSelected ? 'pg-pii-mark--selected' : ''
        } ${isDimmed ? 'pg-pii-mark--dimmed' : ''}`}
        title={`${label}: ${det.validationNote}`}
        onClick={onSelectDetection ? () => onSelectDetection(det.id) : undefined}
      >
        <span className="pg-pii-chip">{label}</span>
        <span className="pg-sr-only"> detected: </span>
        <span>{text.slice(det.start, det.end)}</span>
      </mark>,
    );
    cursor = det.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return <pre className="pg-code-block">{nodes}</pre>;
}

interface SanitizedHighlightedTextProps {
  segments: RedactedSegment[];
  selectedDetectionId?: string | null;
}

export function SanitizedHighlightedText({
  segments,
  selectedDetectionId = null,
}: SanitizedHighlightedTextProps) {
  if (segments.length === 0) {
    return (
      <p className="pg-empty-preview">
        Protected output will appear here automatically in real time.
      </p>
    );
  }

  return (
    <pre className="pg-code-block">
      {segments.map((seg, idx) => {
        if (!seg.detection) {
          return <span key={`plain-${idx}`}>{seg.text}</span>;
        }
        const label = CATEGORY_SHORT_LABELS[seg.detection.category];
        const isSelected = selectedDetectionId === seg.detection.id;
        if (!seg.isRedacted) {
          return (
            <span
              key={seg.detection.id}
              className={`pg-kept-mark ${isSelected ? 'pg-pii-mark--selected' : ''}`}
              title={`Kept unredacted (${label})`}
            >
              {seg.text}
            </span>
          );
        }
        return (
          <mark
            key={seg.detection.id}
            className={`pg-redacted-mark pg-redacted-mark--${seg.detection.category} ${
              isSelected ? 'pg-redacted-mark--selected' : ''
            }`}
            title={`Protected ${label}`}
          >
            {seg.text || '[REMOVED]'}
          </mark>
        );
      })}
    </pre>
  );
}
