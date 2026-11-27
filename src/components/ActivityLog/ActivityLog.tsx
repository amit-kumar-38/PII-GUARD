import { ScrollText, Trash2, Download, ShieldCheck } from 'lucide-react';
import type {
  AuditEvent,
  DetectionResult,
  PrivacyProfileId,
  RedactionMode,
  ScanMode,
} from '../../types/pii.ts';
import {
  LOCAL_POLICY_SUMMARY,
  PRIVACY_STATEMENT,
  triggerLocalDownload,
} from '../../modules/security/privacyGuard.ts';

interface ActivityLogProps {
  events: AuditEvent[];
  mode: RedactionMode;
  scanMode?: ScanMode;
  activeProfile?: PrivacyProfileId;
  transformedCount?: number;
  summary: DetectionResult;
  onClearLog: () => void;
}

export function ActivityLog({
  events,
  mode,
  scanMode = 'PROTECT',
  activeProfile = 'CUSTOM',
  transformedCount,
  summary,
  onClearLog,
}: ActivityLogProps) {
  const handleExportAuditSummary = () => {
    const safeAuditReport = {
      application: 'PII GUARD',
      exportedAt: new Date().toISOString(),
      privacyGuarantee: PRIVACY_STATEMENT,
      note: 'Safe metadata audit summary only. Contains zero raw PII, zero document content, and zero pseudonym mappings.',
      activeRedactionMode: mode,
      scanMode,
      privacyProfile: activeProfile,
      processingStatus: scanMode === 'DETECT_ONLY' ? 'DETECTED_UNMASKED' : 'TRANSFORMED_IN_MEMORY',
      detectionTotals: {
        totalOccurrences: summary.totalOccurrences,
        totalUniqueEntities: summary.totalUnique,
        transformedEntities:
          typeof transformedCount === 'number'
            ? transformedCount
            : scanMode === 'DETECT_ONLY'
              ? 0
              : summary.totalOccurrences,
        byCategory: summary.categoryCounts,
        rejectedFalsePositiveCards: summary.rejectedCardCandidates,
        rejectedInvalidIps: summary.rejectedIpCandidates,
      },
      policyRules: LOCAL_POLICY_SUMMARY,
      events: events.map((e) => ({
        timestamp: e.timestamp,
        type: e.type,
        message: e.message,
        details: e.details ?? null,
      })),
    };

    triggerLocalDownload(
      JSON.stringify(safeAuditReport, null, 2),
      'pii-guard-audit-summary.json',
      false,
    );
  };

  return (
    <section
      className="pg-section pg-section--quiet"
      aria-labelledby="prompt-log-heading"
    >
      <div className="pg-section-head">
        <div>
          <span className="pg-step-tag">PROCESSING / AUDIT TRAIL</span>
          <h2 id="prompt-log-heading" className="pg-section-title">
            <ScrollText size={22} aria-hidden="true" className="pg-inline-icon" />
            Prompt &amp; Processing Log — Processing &amp; Audit Trail
          </h2>
          <p className="pg-section-subtitle">
            Local deterministic rule summary and privacy-safe event stream (no raw PII or entity mappings ever logged).
          </p>
        </div>

        <div className="pg-log-actions">
          <button
            type="button"
            className="pg-btn pg-btn--secondary"
            onClick={handleExportAuditSummary}
          >
            <Download size={17} aria-hidden="true" />
            Export Audit Summary
          </button>
          <button
            type="button"
            className="pg-btn pg-btn--ghost-danger"
            onClick={onClearLog}
          >
            <Trash2 size={17} aria-hidden="true" />
            Clear Log
          </button>
        </div>
      </div>

      <div className="pg-policy-box">
        <div className="pg-policy-title">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Local Sanitization Policy &amp; Deterministic Rule Pipeline (Zero LLM Calls)</span>
        </div>
        <ul className="pg-policy-list">
          {LOCAL_POLICY_SUMMARY.map((rule, idx) => (
            <li key={idx}>{rule}</li>
          ))}
        </ul>
      </div>

      <div
        className="pg-log-list"
        role="log"
        aria-live="polite"
        aria-label="Local processing events"
        tabIndex={0}
      >
        {events.map((evt) => (
          <div key={evt.id} className="pg-log-item">
            <span className="pg-log-time">{evt.timestamp}</span>
            <span className={`pg-log-type pg-log-type--${evt.type}`}>{evt.type}</span>
            <div className="pg-log-body">
              <span className="pg-log-msg">{evt.message}</span>
              {evt.details && <span className="pg-log-details">{evt.details}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
