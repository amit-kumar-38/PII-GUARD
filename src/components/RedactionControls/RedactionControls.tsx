import { useRef, type KeyboardEvent } from 'react';
import { EyeOff, Shield, KeyRound, Eye, ShieldCheck, Sliders } from 'lucide-react';
import {
  CATEGORY_SHORT_LABELS,
  OPERATOR_LABELS,
  PII_CATEGORIES,
  PRIVACY_PROFILES,
  type CategoryPolicyMap,
  type PiiCategory,
  type PrivacyProfileId,
  type RedactionMode,
  type ScanMode,
  type TransformationOperator,
} from '../../types/pii.ts';

interface RedactionControlsProps {
  mode: RedactionMode;
  scanMode: ScanMode;
  activeProfile: PrivacyProfileId;
  categoryPolicies: CategoryPolicyMap;
  onModeChange: (mode: RedactionMode) => void;
  onScanModeChange: (scanMode: ScanMode) => void;
  onProfileChange: (profile: Exclude<PrivacyProfileId, 'CUSTOM'>) => void;
  onCategoryPolicyChange: (
    category: PiiCategory,
    operator: TransformationOperator,
  ) => void;
}

const MODES: Array<{
  id: RedactionMode;
  title: string;
  example: string;
  description: string;
  Icon: typeof EyeOff;
}> = [
  {
    id: 'FULL',
    title: 'Full Mask',
    example: '[REDACTED]',
    description: 'Remove the entire detected value without exposing characters.',
    Icon: EyeOff,
  },
  {
    id: 'PARTIAL',
    title: 'Partial Mask',
    example: 'a***@e***.com · XXXX-1111',
    description: 'Preserve minimal verification context while masking secrets.',
    Icon: Shield,
  },
  {
    id: 'PSEUDONYM',
    title: 'Consistent Pseudonymization',
    example: 'EMAIL_001 · PHONE_001',
    description: 'Replace recurring entities with stable in-memory session aliases.',
    Icon: KeyRound,
  },
];

const CATEGORY_OPERATORS: readonly TransformationOperator[] = [
  'FULL',
  'PARTIAL',
  'PSEUDONYM',
  'LABEL',
  'REMOVE',
];

export function RedactionControls({
  mode,
  scanMode,
  activeProfile,
  categoryPolicies,
  onModeChange,
  onScanModeChange,
  onProfileChange,
  onCategoryPolicyChange,
}: RedactionControlsProps) {
  const radioRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % MODES.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + MODES.length) % MODES.length;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      const target = MODES[nextIndex];
      if (target) {
        onModeChange(target.id);
        radioRefs.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <section className="pg-band-block" aria-labelledby="redaction-mode-heading">
      <div className="pg-section-head">
        <div>
          <span className="pg-step-tag">02 / CONFIGURE &amp; PROTECT</span>
          <h2 id="redaction-mode-heading" className="pg-section-title">
            Choose your protection protocol
          </h2>
          <p className="pg-section-subtitle">
            Switch between Detection-Only and Protection, apply a Privacy Profile, or tune per-category operators.
          </p>
        </div>

        {/* Detection-Only vs Detection & Protection Switch */}
        <div
          className="pg-scan-mode-switch"
          role="group"
          aria-label="Cockpit scan mode"
        >
          <button
            type="button"
            aria-pressed={scanMode === 'DETECT_ONLY'}
            className={`pg-switch-btn ${
              scanMode === 'DETECT_ONLY' ? 'pg-switch-btn--detect' : ''
            }`}
            onClick={() => onScanModeChange('DETECT_ONLY')}
          >
            <Eye size={16} aria-hidden="true" />
            Detection Only
          </button>
          <button
            type="button"
            aria-pressed={scanMode === 'PROTECT'}
            className={`pg-switch-btn ${
              scanMode === 'PROTECT' ? 'pg-switch-btn--protect' : ''
            }`}
            onClick={() => onScanModeChange('PROTECT')}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            Detection &amp; Protection
          </button>
        </div>
      </div>

      {scanMode === 'DETECT_ONLY' && (
        <div className="pg-alert pg-alert--info" role="status">
          <Eye size={18} aria-hidden="true" />
          <span>
            <strong>Detection-Only Mode:</strong> PII is highlighted and inspectable without modifying or exporting sanitized output.
          </span>
        </div>
      )}

      {/* Privacy Profiles */}
      <div className="pg-profiles-row" role="group" aria-label="Privacy protection profiles">
        <span className="pg-profiles-label">Privacy Profiles:</span>
        {(['STRICT', 'BALANCED', 'UTILITY'] as const).map((profileKey) => {
          const profile = PRIVACY_PROFILES[profileKey];
          const isSelected = activeProfile === profileKey;
          return (
            <button
              key={profileKey}
              type="button"
              aria-pressed={isSelected}
              className={`pg-profile-btn ${
                isSelected ? 'pg-profile-btn--active' : ''
              }`}
              onClick={() => onProfileChange(profileKey)}
              title={profile.summary}
            >
              <strong>{profile.name}</strong>
              <span>{profile.summary}</span>
            </button>
          );
        })}
        {activeProfile === 'CUSTOM' && (
          <span className="pg-profile-custom-tag">
            <Sliders size={14} aria-hidden="true" /> Custom Matrix
          </span>
        )}
      </div>

      {/* Classic 3 Redaction Mode Cards (Radiogroup preserved for accessibility & tests) */}
      <div
        className="pg-mode-grid"
        role="radiogroup"
        aria-labelledby="redaction-mode-heading"
      >
        {MODES.map(({ id, title, example, description, Icon }, idx) => {
          const selected = mode === id && activeProfile !== 'BALANCED';
          return (
            <button
              key={id}
              ref={(el) => {
                radioRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={mode === id}
              tabIndex={mode === id ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`pg-mode-card ${selected ? 'pg-mode-card--selected' : ''}`}
              onClick={() => onModeChange(id)}
            >
              <div className="pg-mode-card-top">
                <div className="pg-mode-title-group">
                  <span className="pg-mode-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="pg-mode-title">{title}</span>
                </div>
                {mode === id && <span className="pg-mode-active-dot">ACTIVE</span>}
              </div>
              <code className="pg-mode-example">{example}</code>
              <span className="pg-mode-desc">{description}</span>
            </button>
          );
        })}
      </div>

      {/* Per-Category Transformation Policy Matrix */}
      <div className="pg-policy-matrix" role="group" aria-label="Per-category transformation rules">
        <div className="pg-matrix-title">Per-Category Transformation Operators</div>
        <div className="pg-matrix-grid">
          {PII_CATEGORIES.map((category) => (
            <label key={category} className={`pg-matrix-cell pg-matrix-cell--${category}`}>
              <span className="pg-matrix-cat">{CATEGORY_SHORT_LABELS[category]}</span>
              <select
                className="pg-matrix-select"
                value={categoryPolicies[category]}
                onChange={(e) =>
                  onCategoryPolicyChange(
                    category,
                    e.target.value as TransformationOperator,
                  )
                }
                aria-label={`${CATEGORY_SHORT_LABELS[category]} transformation operator`}
              >
                {CATEGORY_OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
