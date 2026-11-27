import { Lock, ShieldCheck, Cpu } from 'lucide-react';
import { PRIVACY_STATEMENT } from '../../modules/security/privacyGuard.ts';
import type { ScanMode, ShieldVisualState } from '../../types/pii.ts';

interface HeaderProps {
  totalOccurrences: number;
  sourceType: 'text' | 'txt' | 'csv';
  scanMode: ScanMode;
  shieldState: ShieldVisualState;
}

export function Header({
  totalOccurrences,
  sourceType,
  scanMode,
  shieldState,
}: HeaderProps) {
  return (
    <header className="pg-header">
      <div className="pg-header-bar">
        <div className="pg-brand">
          <div className="pg-logo-mark" aria-hidden="true">
            <ShieldCheck size={26} strokeWidth={2.2} />
          </div>
          <div className="pg-brand-text">
            <div className="pg-brand-row">
              <h1 className="pg-title">PII GUARD</h1>
              <span className="pg-aegis-tag">PRIVACY COCKPIT</span>
              <span className="pg-badge pg-badge--privacy">
                <Lock size={13} aria-hidden="true" />
                Client-Side Only
              </span>
            </div>
            <p className="pg-tagline">Your Data. Your Browser. Your Privacy.</p>
          </div>
        </div>

        <nav className="pg-nav" aria-label="Cockpit sections">
          <a href="#input-heading" className="pg-nav-link">Source</a>
          <a href="#redaction-mode-heading" className="pg-nav-link">Protect</a>
          <a href="#inspector-heading" className="pg-nav-link">Inspector</a>
          <a href="#comparison-heading" className="pg-nav-link">Verify</a>
          <a href="#prompt-log-heading" className="pg-nav-link">Audit</a>
        </nav>

        <div className="pg-header-status">
          <div className="pg-status-chip">
            <Cpu size={15} aria-hidden="true" />
            <span>
              In-Memory • {sourceType.toUpperCase()} •{' '}
              {scanMode === 'DETECT_ONLY' ? 'Detect Only' : shieldState}
            </span>
          </div>
          <div className="pg-status-chip pg-status-chip--accent">
            <span>{totalOccurrences} Detections</span>
          </div>
        </div>
      </div>

      <div className="pg-privacy-strip" role="note">
        <Lock size={14} aria-hidden="true" className="pg-privacy-icon" />
        <p>{PRIVACY_STATEMENT}</p>
      </div>
    </header>
  );
}
