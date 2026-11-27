import { useRef, useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Table,
  FileText,
  FileSearch,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import {
  CATEGORY_SHORT_LABELS,
  PII_CATEGORIES,
  type CsvCellScan,
  type CsvColumnProfile,
  type CsvSanitizationResult,
  type DetectionResult,
  type InputSourceType,
  type InspectorFinding,
  type PiiCategory,
  type RedactionMode,
  type ScanMode,
} from '../../types/pii.ts';
import type { RedactedSegment } from '../../modules/redaction/redactionEngine.ts';
import {
  OriginalHighlightedText,
  SanitizedHighlightedText,
} from '../HighlightedText/HighlightedText.tsx';

interface ComparisonViewProps {
  rawInput: string;
  sourceType: InputSourceType;
  mode: RedactionMode;
  scanMode: ScanMode;
  activeError: string | null;
  detectionSummary: DetectionResult;
  sanitizedSegments: RedactedSegment[];
  sanitizedOutputText: string;
  csvSanitizationResult: CsvSanitizationResult | null;
  csvColumnProfiles?: CsvColumnProfile[];
  selectedFinding?: InspectorFinding | null;
  categoryFilter?: PiiCategory | 'ALL';
  onSelectDetection?: (id: string) => void;
  onDownload: () => void;
}

export function ComparisonView({
  rawInput,
  sourceType,
  mode,
  scanMode,
  activeError,
  detectionSummary,
  sanitizedSegments,
  sanitizedOutputText,
  csvSanitizationResult,
  csvColumnProfiles = [],
  selectedFinding = null,
  categoryFilter = 'ALL',
  onSelectDetection,
  onDownload,
}: ComparisonViewProps) {
  const leftScrollRef = useRef<HTMLDivElement | null>(null);
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [csvRawView, setCsvRawView] = useState(false);

  const syncScroll = (source: 'left' | 'right') => {
    if (syncingRef.current) return;
    const from = source === 'left' ? leftScrollRef.current : rightScrollRef.current;
    const to = source === 'left' ? rightScrollRef.current : leftScrollRef.current;
    if (!from || !to) return;

    syncingRef.current = true;
    to.scrollTop = from.scrollTop;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  const handleCopy = async () => {
    if (!sanitizedOutputText || activeError || scanMode === 'DETECT_ONLY') return;
    try {
      await navigator.clipboard.writeText(sanitizedOutputText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts; fail safely.
    }
  };

  const canExport =
    scanMode === 'PROTECT' && Boolean(sanitizedOutputText.trim()) && !activeError;
  const outputExt = sourceType === 'csv' ? '.csv' : '.txt';
  const selectedDetId =
    sourceType !== 'csv' ? (selectedFinding?.detection.id ?? null) : null;

  return (
    <section
      className="pg-section pg-section--centerpiece"
      aria-labelledby="comparison-heading"
    >
      <div className="pg-section-head">
        <div>
          <span className="pg-step-tag">04 / VERIFY &amp; EXPORT</span>
          <h2 id="comparison-heading" className="pg-section-title">
            Inspect the protection result
          </h2>
          <p className="pg-section-subtitle">
            {scanMode === 'DETECT_ONLY'
              ? `Detection-Only mode active (${detectionSummary.totalOccurrences} entities highlighted, original text unchanged).`
              : `Inspect detected values alongside their sanitized replacements (${detectionSummary.totalOccurrences} entities across ${detectionSummary.totalUnique} unique values).`}
          </p>
        </div>

        <div className="pg-export-actions">
          {sourceType === 'csv' && csvSanitizationResult && (
            <button
              type="button"
              className="pg-btn pg-btn--secondary"
              onClick={() => setCsvRawView((v) => !v)}
            >
              {csvRawView ? (
                <>
                  <Table size={17} aria-hidden="true" /> Table Preview
                </>
              ) : (
                <>
                  <FileText size={17} aria-hidden="true" /> Raw CSV Preview
                </>
              )}
            </button>
          )}

          <button
            type="button"
            className="pg-btn pg-btn--secondary"
            onClick={handleCopy}
            disabled={!canExport}
          >
            {copied ? (
              <>
                <Check size={17} aria-hidden="true" /> Copied
              </>
            ) : (
              <>
                <Copy size={17} aria-hidden="true" /> Copy Output
              </>
            )}
          </button>

          <button
            type="button"
            className="pg-btn pg-btn--primary"
            onClick={onDownload}
            disabled={!canExport}
          >
            <Download size={17} aria-hidden="true" />
            Download Sanitized ({outputExt})
          </button>
        </div>
      </div>

      {/* CSV Column Profiling Strip */}
      {sourceType === 'csv' && csvColumnProfiles.length > 0 && (
        <div className="pg-csv-profiler" role="region" aria-label="CSV column profiling">
          <div className="pg-profiler-head">
            <span>CSV Column Profiling</span>
            <span>
              {csvColumnProfiles.length} columns ·{' '}
              {csvColumnProfiles[0]?.rowCount ?? 0} data rows
            </span>
          </div>
          <div className="pg-profiler-grid">
            {csvColumnProfiles.map((col) => (
              <div
                key={`colprof-${col.colIndex}`}
                className={`pg-profiler-card ${
                  col.detectionCount > 0 ? 'pg-profiler-card--pii' : ''
                }`}
              >
                <div className="pg-profiler-col-top">
                  <strong className="pg-profiler-name">{col.headerName}</strong>
                  <span className="pg-profiler-count">{col.detectionCount} PII</span>
                </div>
                <div className="pg-profiler-cats">
                  {PII_CATEGORIES.filter((cat) => col.categoryCounts[cat] > 0).map(
                    (cat) => (
                      <span key={cat} className="pg-profiler-badge">
                        {CATEGORY_SHORT_LABELS[cat]}: {col.categoryCounts[cat]}
                      </span>
                    ),
                  )}
                  {col.detectionCount === 0 && (
                    <span className="pg-profiler-clean">Clean column</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pg-comparison-grid">
        <div className="pg-panel pg-panel--original">
          <div className="pg-panel-bar">
            <div className="pg-panel-title-wrap">
              <FileSearch size={18} aria-hidden="true" />
              <span className="pg-panel-title">Original Document</span>
            </div>
            <span className="pg-panel-badge pg-panel-badge--warn">
              {detectionSummary.totalOccurrences} PII Highlighted
            </span>
          </div>
          <div
            ref={leftScrollRef}
            className="pg-panel-body"
            role="region"
            onScroll={() => syncScroll('left')}
            tabIndex={0}
            aria-label="Original input preview with highlighted PII detections"
          >
            {sourceType === 'csv' && csvSanitizationResult && !csvRawView ? (
              <CsvTablePreview
                headers={csvSanitizationResult.document.headers}
                rows={csvSanitizationResult.document.rows}
                headerScans={csvSanitizationResult.headerScans}
                cellScans={csvSanitizationResult.cellScans}
                variant="original"
                selectedFinding={selectedFinding}
                categoryFilter={categoryFilter}
              />
            ) : (
              <OriginalHighlightedText
                text={rawInput}
                detections={detectionSummary.detections}
                selectedDetectionId={selectedDetId}
                categoryFilter={categoryFilter}
                onSelectDetection={onSelectDetection}
              />
            )}
          </div>
        </div>

        <div className="pg-panel pg-panel--sanitized">
          <div className="pg-panel-bar">
            <div className="pg-panel-title-wrap">
              {scanMode === 'DETECT_ONLY' ? (
                <Eye size={18} aria-hidden="true" />
              ) : (
                <ShieldCheck size={18} aria-hidden="true" />
              )}
              <span className="pg-panel-title">Protected Output</span>
            </div>
            <span className="pg-panel-badge pg-panel-badge--safe">
              {scanMode === 'DETECT_ONLY'
                ? 'Detection Only'
                : mode === 'FULL'
                  ? 'Full Mask'
                  : mode === 'PARTIAL'
                    ? 'Partial Mask'
                    : 'Pseudonymized'}
            </span>
          </div>
          <div
            ref={rightScrollRef}
            className="pg-panel-body"
            role="region"
            onScroll={() => syncScroll('right')}
            tabIndex={0}
            aria-label="Sanitized output preview"
          >
            {scanMode === 'DETECT_ONLY' ? (
              <div className="pg-detect-only-panel">
                <p>
                  <strong>Detection-Only Mode Active</strong>
                </p>
                <p>
                  Original text and files are scanned and highlighted locally without applying redaction or overwriting data. Switch to <strong>Detection &amp; Protection</strong> above to generate and export sanitized output.
                </p>
              </div>
            ) : sourceType === 'csv' && csvSanitizationResult && !csvRawView ? (
              <CsvTablePreview
                headers={csvSanitizationResult.sanitizedHeaders}
                rows={csvSanitizationResult.sanitizedRows}
                variant="sanitized"
                originalHeaders={csvSanitizationResult.document.headers}
                originalRows={csvSanitizationResult.document.rows}
              />
            ) : sourceType === 'csv' && csvSanitizationResult && csvRawView ? (
              <pre className="pg-code-block">{sanitizedOutputText}</pre>
            ) : (
              <SanitizedHighlightedText
                segments={sanitizedSegments}
                selectedDetectionId={selectedDetId}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface CsvTablePreviewProps {
  headers: string[] | null;
  rows: string[][];
  headerScans?: CsvCellScan[];
  cellScans?: CsvCellScan[];
  variant: 'original' | 'sanitized';
  originalHeaders?: string[] | null;
  originalRows?: string[][];
  selectedFinding?: InspectorFinding | null;
  categoryFilter?: PiiCategory | 'ALL';
}

function CsvTablePreview({
  headers,
  rows,
  headerScans,
  cellScans,
  variant,
  originalHeaders,
  originalRows,
  selectedFinding = null,
  categoryFilter = 'ALL',
}: CsvTablePreviewProps) {
  if (rows.length === 0 && (!headers || headers.length === 0)) {
    return <p className="pg-empty-preview">No CSV rows to preview.</p>;
  }

  const scanLookup = new Map<string, CsvCellScan>();
  if (cellScans) {
    for (const scan of cellScans) {
      scanLookup.set(`${scan.rowIndex}:${scan.colIndex}`, scan);
    }
  }

  const headerScanLookup = new Map<number, CsvCellScan>();
  if (headerScans) {
    for (const scan of headerScans) {
      headerScanLookup.set(scan.colIndex, scan);
    }
  }

  return (
    <div className="pg-table-wrap">
      <table
        className="pg-csv-table"
        aria-label={variant === 'original' ? 'Original CSV table preview' : 'Sanitized CSV table preview'}
      >
        {headers && (
          <thead>
            <tr>
              <th scope="col" className="pg-csv-rownum">
                #
              </th>
              {headers.map((h, i) => {
                if (variant === 'original') {
                  const detections = headerScanLookup.get(i)?.detections ?? [];
                  const selectedId =
                    selectedFinding?.rowIndex === -1 && selectedFinding?.colIndex === i
                      ? selectedFinding.detection.id
                      : null;
                  return (
                    <th
                      key={`h-${i}`}
                      scope="col"
                      className={detections.length > 0 ? 'pg-cell-pii' : ''}
                    >
                      <OriginalHighlightedText
                        text={h}
                        detections={detections}
                        selectedDetectionId={selectedId}
                        categoryFilter={categoryFilter}
                      />
                    </th>
                  );
                }
                const origHeader = originalHeaders?.[i] ?? h;
                const changed = origHeader !== h;
                return (
                  <th
                    key={`h-${i}`}
                    scope="col"
                    className={changed ? 'pg-cell-sanitized' : ''}
                  >
                    {h}
                  </th>
                );
              })}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={`r-${rIdx}`}>
              <td className="pg-csv-rownum">{rIdx + 1}</td>
              {row.map((cell, cIdx) => {
                if (variant === 'original') {
                  const detections = scanLookup.get(`${rIdx}:${cIdx}`)?.detections ?? [];
                  const selectedId =
                    selectedFinding?.rowIndex === rIdx && selectedFinding?.colIndex === cIdx
                      ? selectedFinding.detection.id
                      : null;
                  return (
                    <td
                      key={`c-${rIdx}-${cIdx}`}
                      className={detections.length > 0 ? 'pg-cell-pii' : ''}
                    >
                      <OriginalHighlightedText
                        text={cell}
                        detections={detections}
                        selectedDetectionId={selectedId}
                        categoryFilter={categoryFilter}
                      />
                    </td>
                  );
                }
                const origCell = originalRows?.[rIdx]?.[cIdx] ?? cell;
                const changed = origCell !== cell;
                return (
                  <td
                    key={`c-${rIdx}-${cIdx}`}
                    className={changed ? 'pg-cell-sanitized' : ''}
                  >
                    <pre className="pg-code-block">{cell}</pre>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
