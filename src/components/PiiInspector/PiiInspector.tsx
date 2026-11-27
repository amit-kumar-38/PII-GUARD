import { ChevronLeft, ChevronRight, Crosshair, RotateCcw } from 'lucide-react';
import {
  CATEGORY_LABELS,
  CATEGORY_SHORT_LABELS,
  OPERATOR_LABELS,
  type InputSourceType,
  type InspectorFinding,
  type PiiCategory,
  type ScanMode,
  type TransformationOperator,
} from '../../types/pii.ts';

interface PiiInspectorProps {
  findings: InspectorFinding[];
  selectedFinding: InspectorFinding | null;
  selectedIndex: number;
  categoryFilter: PiiCategory | 'ALL';
  sourceType: InputSourceType;
  scanMode: ScanMode;
  onSelectFinding: (key: string) => void;
  onPrevFinding: () => void;
  onNextFinding: () => void;
  onOverrideFinding: (
    findingId: string,
    operator: TransformationOperator | null,
  ) => void;
}

const FINDING_ACTIONS: Array<{ op: TransformationOperator; label: string }> = [
  { op: 'FULL', label: 'Full' },
  { op: 'PARTIAL', label: 'Partial' },
  { op: 'PSEUDONYM', label: 'Pseudonym' },
  { op: 'LABEL', label: '[Label]' },
  { op: 'REMOVE', label: 'Remove' },
  { op: 'KEEP', label: 'Ignore (FP)' },
];

export function PiiInspector({
  findings,
  selectedFinding,
  selectedIndex,
  categoryFilter,
  sourceType,
  scanMode,
  onSelectFinding,
  onPrevFinding,
  onNextFinding,
  onOverrideFinding,
}: PiiInspectorProps) {
  return (
    <section className="pg-section" aria-labelledby="inspector-heading">
      <div className="pg-section-head">
        <div>
          <span className="pg-step-tag">INSPECT &amp; NAVIGATE</span>
          <h2 id="inspector-heading" className="pg-section-title">
            <Crosshair size={22} aria-hidden="true" className="pg-inline-icon" />
            Interactive PII Inspector
          </h2>
          <p className="pg-section-subtitle">
            Step through detected findings, inspect validation rules, and apply per-finding overrides.
          </p>
        </div>

        <div className="pg-inspector-nav" role="group" aria-label="Finding navigation">
          <button
            type="button"
            className="pg-btn pg-btn--secondary pg-btn--compact"
            onClick={onPrevFinding}
            disabled={findings.length === 0}
          >
            <ChevronLeft size={17} aria-hidden="true" />
            Prev
          </button>
          <span className="pg-inspector-index" data-testid="inspector-index">
            {findings.length === 0 ? '0 / 0' : `${selectedIndex + 1} / ${findings.length}`}
          </span>
          <button
            type="button"
            className="pg-btn pg-btn--secondary pg-btn--compact"
            onClick={onNextFinding}
            disabled={findings.length === 0}
          >
            Next
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      {findings.length === 0 ? (
        <div className="pg-inspector-empty">
          {categoryFilter === 'ALL'
            ? 'No findings to inspect. Enter text, load a sample, or upload a .txt/.csv file.'
            : `No ${CATEGORY_LABELS[categoryFilter]} findings match the active category filter.`}
        </div>
      ) : (
        <div className="pg-inspector-grid">
          {/* Findings List */}
          <div
            className="pg-findings-list"
            role="listbox"
            aria-label="Detected PII findings"
            tabIndex={0}
          >
            {findings.map((item, idx) => {
              const isSelected = selectedFinding?.key === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`pg-finding-row ${isSelected ? 'pg-finding-row--selected' : ''}`}
                  onClick={() => onSelectFinding(item.key)}
                >
                  <span className={`pg-finding-cat pg-finding-cat--${item.detection.category}`}>
                    {CATEGORY_SHORT_LABELS[item.detection.category]}
                  </span>
                  <span className="pg-finding-val">{item.detection.value}</span>
                  <span className="pg-finding-loc">
                    #{idx + 1} · {item.locationLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Finding Detail Inspector */}
          {selectedFinding && (
            <div className="pg-inspector-detail" aria-live="polite">
              <div className="pg-detail-head">
                <div className="pg-detail-badges">
                  <span className={`pg-finding-cat pg-finding-cat--${selectedFinding.detection.category}`}>
                    {CATEGORY_LABELS[selectedFinding.detection.category]}
                  </span>
                  <span className={`pg-severity-badge pg-severity--${selectedFinding.severity}`}>
                    Severity: {selectedFinding.severity}
                  </span>
                  {selectedFinding.isOverridden && (
                    <span className="pg-override-badge">Custom Override</span>
                  )}
                </div>
                <span className="pg-detail-loc">{selectedFinding.locationLabel}</span>
              </div>

              <dl className="pg-detail-grid">
                <div>
                  <dt>Detected Value (Local Only)</dt>
                  <dd>
                    <code className="pg-detail-code">{selectedFinding.detection.value}</code>
                  </dd>
                </div>
                <div>
                  <dt>
                    {scanMode === 'DETECT_ONLY' ? 'Output (Detect-Only)' : 'Transformed Output'}
                  </dt>
                  <dd>
                    <code className="pg-detail-code pg-detail-code--safe">
                      {selectedFinding.transformedValue || '(removed)'}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt>Detector Validation Rule</dt>
                  <dd>{selectedFinding.detection.validationNote}</dd>
                </div>
                <div>
                  <dt>Active Transformation</dt>
                  <dd>
                    {scanMode === 'DETECT_ONLY'
                      ? 'Unmasked (Detection-Only mode)'
                      : OPERATOR_LABELS[selectedFinding.appliedOperator]}
                  </dd>
                </div>
              </dl>

              {sourceType === 'csv' && scanMode === 'PROTECT' && (
                <div className="pg-finding-actions">
                  <span className="pg-finding-actions-label">
                    CSV Policy Note: CSV cell transformations follow the active Privacy Profile and Per-Category Matrix above to preserve column consistency.
                  </span>
                </div>
              )}

              {sourceType !== 'csv' && scanMode === 'PROTECT' && (
                <div className="pg-finding-actions">
                  <span className="pg-finding-actions-label">Per-Finding Action:</span>
                  <div className="pg-finding-action-btns">
                    {FINDING_ACTIONS.map(({ op, label }) => (
                      <button
                        key={op}
                        type="button"
                        aria-pressed={selectedFinding.appliedOperator === op}
                        className={`pg-btn pg-btn--compact ${selectedFinding.appliedOperator === op
                            ? 'pg-btn--accent'
                            : 'pg-btn--secondary'
                          }`}
                        onClick={() =>
                          onOverrideFinding(selectedFinding.detection.id, op)
                        }
                      >
                        {label}
                      </button>
                    ))}
                    {selectedFinding.isOverridden && (
                      <button
                        type="button"
                        className="pg-btn pg-btn--ghost-danger pg-btn--compact"
                        onClick={() =>
                          onOverrideFinding(selectedFinding.detection.id, null)
                        }
                      >
                        <RotateCcw size={15} aria-hidden="true" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
