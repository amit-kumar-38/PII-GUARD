import {
  Mail,
  Phone,
  Globe,
  CreditCard,
  IdCard,
  Fingerprint,
  ShieldAlert,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  PII_CATEGORIES,
  type DetectionResult,
  type PiiCategory,
  type ScanMode,
} from '../../types/pii.ts';

interface ExposureStats {
  financialCount: number;
  governmentCount: number;
  contactCount: number;
  networkCount: number;
  highSensitivityCount: number;
  transformedCount: number;
  excludedCount: number;
  unmaskedCount: number;
}

interface DetectionSummaryProps {
  summary: DetectionResult;
  hasInput?: boolean;
  scanMode?: ScanMode;
  categoryFilter?: PiiCategory | 'ALL';
  onCategoryFilterChange?: (filter: PiiCategory | 'ALL') => void;
  exposureStats?: ExposureStats;
}

const CATEGORY_ICONS: Record<PiiCategory, typeof Mail> = {
  EMAIL: Mail,
  PHONE: Phone,
  IP: Globe,
  PAN: IdCard,
  AADHAAR: Fingerprint,
  CREDIT_CARD: CreditCard,
};

export function DetectionSummary({
  summary,
  hasInput = false,
  scanMode = 'PROTECT',
  categoryFilter = 'ALL',
  onCategoryFilterChange,
  exposureStats,
}: DetectionSummaryProps) {
  return (
    <section className="pg-band-block" aria-labelledby="detection-summary-heading">
      <div className="pg-section-head">
        <div>
          <span className="pg-step-tag">03 / DETECT &amp; FILTER</span>
          <h2 id="detection-summary-heading" className="pg-section-title">
            Sensitive entities identified
          </h2>
          <p className="pg-section-subtitle">
            Overlap-resolved counts and rules-based exposure breakdown. Click any category to filter the inspector.
          </p>
        </div>

        <div className="pg-totals-row">
          <div className="pg-total-pill">
            <span className="pg-total-label">Total Occurrences</span>
            <strong className="pg-total-value" data-testid="total-occurrences">
              {summary.totalOccurrences}
            </strong>
          </div>
          <div className="pg-total-pill">
            <span className="pg-total-label">Unique Entities</span>
            <strong className="pg-total-value" data-testid="total-unique">
              {summary.totalUnique}
            </strong>
          </div>
          {(summary.rejectedCardCandidates > 0 || summary.rejectedIpCandidates > 0) && (
            <div
              className="pg-total-pill pg-total-pill--rejected"
              title="Candidates failing Luhn mod-10 checksum or strict IP range checks were safely ignored"
            >
              <ShieldAlert size={16} aria-hidden="true" />
              <span className="pg-total-label">
                False Positives Rejected:{' '}
                <strong>
                  {summary.rejectedCardCandidates + summary.rejectedIpCandidates}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Toolbar + 6 Category Counters */}
      {onCategoryFilterChange && (
        <div className="pg-filter-bar" role="group" aria-label="Filter findings by PII category">
          <span className="pg-filter-label">
            <Filter size={15} aria-hidden="true" /> Filter Inspector:
          </span>
          <button
            type="button"
            aria-pressed={categoryFilter === 'ALL'}
            className={`pg-filter-pill ${categoryFilter === 'ALL' ? 'pg-filter-pill--active' : ''}`}
            onClick={() => onCategoryFilterChange('ALL')}
          >
            All ({summary.totalOccurrences})
          </button>
          {PII_CATEGORIES.map((category) => (
            <button
              key={`flt-${category}`}
              type="button"
              aria-pressed={categoryFilter === category}
              className={`pg-filter-pill ${categoryFilter === category ? 'pg-filter-pill--active' : ''}`}
              onClick={() =>
                onCategoryFilterChange(categoryFilter === category ? 'ALL' : category)
              }
            >
              {CATEGORY_LABELS[category]} ({summary.categoryCounts[category]})
            </button>
          ))}
        </div>
      )}

      <div className="pg-counters-grid">
        {PII_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          const count = summary.categoryCounts[category];
          const unique = summary.uniqueCounts[category];
          const isFiltered = categoryFilter === category;
          return (
            <button
              key={category}
              type="button"
              className={`pg-counter-card pg-counter-card--${category} ${
                count > 0 ? 'pg-counter-card--active' : ''
              } ${isFiltered ? 'pg-counter-card--filtered' : ''}`}
              data-testid={`counter-${category}`}
              onClick={() =>
                onCategoryFilterChange?.(isFiltered ? 'ALL' : category)
              }
            >
              <div className="pg-counter-top">
                <span className="pg-counter-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="pg-counter-name">{CATEGORY_LABELS[category]}</span>
              </div>
              <div className="pg-counter-metrics">
                <strong className="pg-counter-count">{count}</strong>
                <span className="pg-counter-unique">{unique} unique</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rules-Based Exposure Summary */}
      {exposureStats && hasInput && summary.totalOccurrences > 0 && (
        <div className="pg-exposure-strip" role="group" aria-label="Rules-based exposure summary">
          <div className="pg-exposure-item">
            <span className="pg-exposure-k">High-Sensitivity (Card/Aadhaar/PAN)</span>
            <strong className="pg-exposure-v">{exposureStats.highSensitivityCount}</strong>
          </div>
          <div className="pg-exposure-item">
            <span className="pg-exposure-k">Financial IDs</span>
            <strong className="pg-exposure-v">{exposureStats.financialCount}</strong>
          </div>
          <div className="pg-exposure-item">
            <span className="pg-exposure-k">Government IDs</span>
            <strong className="pg-exposure-v">{exposureStats.governmentCount}</strong>
          </div>
          <div className="pg-exposure-item">
            <span className="pg-exposure-k">Contact Info</span>
            <strong className="pg-exposure-v">{exposureStats.contactCount}</strong>
          </div>
          <div className="pg-exposure-item">
            <span className="pg-exposure-k">Network IDs</span>
            <strong className="pg-exposure-v">{exposureStats.networkCount}</strong>
          </div>
          <div className="pg-exposure-item">
            <span className="pg-exposure-k">
              {scanMode === 'DETECT_ONLY' ? 'Unmasked (Detect-Only)' : 'Transformed / Ignored'}
            </span>
            <strong className="pg-exposure-v">
              {scanMode === 'DETECT_ONLY'
                ? exposureStats.unmaskedCount
                : `${exposureStats.transformedCount} / ${exposureStats.excludedCount}`}
            </strong>
          </div>
        </div>
      )}

      {hasInput && summary.totalOccurrences === 0 && (
        <div className="pg-quiet-notice" role="status">
          <CheckCircle2 size={15} aria-hidden="true" />
          <span>
            No matching PII detected in this document across the six configured categories.
          </span>
        </div>
      )}
    </section>
  );
}
