import { useId, useState, type MouseEvent } from 'react';
import type {
  InputSourceType,
  PrivacyProfileId,
  RedactionMode,
  ScanMode,
  ShieldVisualState,
} from '../../types/pii.ts';

interface AegisPrivacyCoreProps {
  shieldState: ShieldVisualState;
  totalOccurrences: number;
  uniqueEntities: number;
  mode: RedactionMode;
  scanMode: ScanMode;
  activeProfile: PrivacyProfileId;
  policyLabel?: string;
  sourceType: InputSourceType;
}

const STATE_LABELS: Record<ShieldVisualState, string> = {
  IDLE: 'STANDBY',
  SCANNING: 'SCANNING INPUT',
  PII_DETECTED: 'PII DETECTED (UNMASKED)',
  PROTECTED: 'PROTECTED',
  CLEAN: 'NO PII MATCHED',
  ERROR: 'VALIDATION ERROR',
};

const STATE_CLASS_MAP: Record<ShieldVisualState, string> = {
  IDLE: 'aegis--idle',
  SCANNING: 'aegis--scanning',
  PII_DETECTED: 'aegis--detected',
  PROTECTED: 'aegis--protected',
  CLEAN: 'aegis--clean',
  ERROR: 'aegis--error',
};

/**
 * Isolated presentational 3D cybernetic privacy shield built with CSS 3D + inline SVG.
 * Receives display-safe state metadata only — never accesses document text or raw PII.
 */
export function AegisPrivacyCore({
  shieldState,
  totalOccurrences,
  uniqueEntities,
  mode,
  scanMode,
  activeProfile,
  policyLabel,
  sourceType,
}: AegisPrivacyCoreProps) {
  const uid = useId().replace(/:/g, '');
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const normX = (event.clientX - rect.left) / rect.width - 0.5;
    const normY = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Number((-normY * 14).toFixed(2)),
      y: Number((normX * 16).toFixed(2)),
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const stateClass = STATE_CLASS_MAP[shieldState];

  return (
    <div className="aegis-showcase">
      <div
        className={`aegis-stage ${stateClass} aegis--mode-${mode}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          {
            '--tilt-x': `${tilt.x}deg`,
            '--tilt-y': `${tilt.y}deg`,
          } as React.CSSProperties
        }
        aria-hidden="true"
      >
        <div className="aegis-halo" />

        <div className="aegis-3d-rig">
          <div className="aegis-orbit aegis-orbit--outer">
            <span className="aegis-node aegis-node--cyan" />
            <span className="aegis-node aegis-node--periwinkle" />
            <span className="aegis-node aegis-node--mint" />
          </div>

          <div className="aegis-orbit aegis-orbit--inner" />

          <svg
            className="aegis-layer aegis-layer--backplate"
            viewBox="0 0 220 250"
            fill="none"
          >
            <path
              d="M110 10 L198 42 V116 C198 174 160 218 110 240 C60 218 22 174 22 116 V42 Z"
              fill="#0A101B"
              stroke="rgba(165, 179, 255, 0.32)"
              strokeWidth="2.5"
            />
          </svg>

          <svg
            className="aegis-layer aegis-layer--core"
            viewBox="0 0 220 250"
            fill="none"
          >
            <defs>
              <linearGradient id={`shell-${uid}`} x1="25" y1="14" x2="195" y2="236" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1B2A44" stopOpacity="0.96" />
                <stop offset="52%" stopColor="#101A2C" stopOpacity="0.94" />
                <stop offset="100%" stopColor="#09101C" stopOpacity="0.98" />
              </linearGradient>
              <linearGradient id={`rim-${uid}`} x1="22" y1="10" x2="198" y2="240" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={shieldState === 'ERROR' ? '#ED9DAB' : '#91EAF5'} />
                <stop offset="50%" stopColor={shieldState === 'PII_DETECTED' ? '#E8C67B' : '#A5B3FF'} />
                <stop offset="100%" stopColor={shieldState === 'ERROR' ? '#EBA878' : '#89E1BC'} />
              </linearGradient>
              <pattern id={`hex-${uid}`} width="18" height="20" patternUnits="userSpaceOnUse">
                <path
                  d="M9 0 L18 5 V15 L9 20 L0 15 V5 Z"
                  fill="none"
                  stroke="rgba(145, 234, 245, 0.14)"
                  strokeWidth="0.8"
                />
              </pattern>
              <clipPath id={`clip-${uid}`}>
                <path d="M110 14 L194 44 V116 C194 171 157 214 110 235 C63 214 26 171 26 116 V44 Z" />
              </clipPath>
            </defs>

            <path
              d="M110 14 L194 44 V116 C194 171 157 214 110 235 C63 214 26 171 26 116 V44 Z"
              fill={`url(#shell-${uid})`}
              stroke={`url(#rim-${uid})`}
              strokeWidth="2.2"
            />

            <g clipPath={`url(#clip-${uid})`}>
              <rect x="20" y="10" width="180" height="230" fill={`url(#hex-${uid})`} />
              <polygon points="110,14 194,44 110,122" fill="rgba(165, 179, 255, 0.08)" />
              <polygon points="110,14 26,44 110,122" fill="rgba(89, 217, 236, 0.09)" />
              <polygon points="110,122 194,116 110,235" fill="rgba(8, 14, 24, 0.38)" />
              {shieldState === 'SCANNING' && (
                <rect
                  className="aegis-scan-bar"
                  x="20"
                  y="14"
                  width="180"
                  height="26"
                  fill="rgba(89, 217, 236, 0.25)"
                />
              )}
            </g>

            <path
              d="M110 26 L182 52 V115 C182 162 150 200 110 219 C70 200 38 162 38 115 V52 Z"
              stroke="rgba(168, 185, 216, 0.24)"
              strokeWidth="1.2"
            />
          </svg>

          <svg
            className="aegis-layer aegis-layer--glass"
            viewBox="0 0 220 250"
            fill="none"
          >
            <defs>
              <linearGradient id={`glass-${uid}`} x1="30" y1="20" x2="180" y2="210" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(244, 246, 252, 0.22)" />
                <stop offset="38%" stopColor="rgba(89, 217, 236, 0.06)" />
                <stop offset="100%" stopColor="rgba(165, 179, 255, 0.02)" />
              </linearGradient>
              <linearGradient id={`sweep-${uid}`} x1="0" y1="0" x2="1" y2="0.4">
                <stop offset="0%" stopColor="rgba(244, 246, 252, 0)" />
                <stop offset="50%" stopColor="rgba(145, 234, 245, 0.28)" />
                <stop offset="100%" stopColor="rgba(244, 246, 252, 0)" />
              </linearGradient>
            </defs>
            <path
              d="M110 18 L190 46 V116 C190 168 155 210 110 230 C65 210 30 168 30 116 V46 Z"
              fill={`url(#glass-${uid})`}
              stroke="rgba(244, 246, 252, 0.18)"
              strokeWidth="1"
            />
            <g key={`${mode}-${activeProfile}`} clipPath={`url(#clip-${uid})`}>
              <rect
                className="aegis-sheen-bar"
                x="-120"
                y="10"
                width="100"
                height="230"
                fill={`url(#sweep-${uid})`}
              />
            </g>
          </svg>

          <div className="aegis-layer aegis-layer--emblem">
            <svg viewBox="0 0 96 96" fill="none" className="aegis-emblem-svg">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <circle
                cx="48"
                cy="48"
                r="30"
                fill="rgba(11, 16, 25, 0.88)"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M39 45 V39 C39 34 43 30 48 30 C53 30 57 34 57 39 V45"
                stroke="#F4F6FC"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <rect
                x="35"
                y="45"
                width="26"
                height="20"
                rx="4"
                fill="currentColor"
                fillOpacity="0.16"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="48" cy="54" r="2.8" fill="#F4F6FC" />
            </svg>
          </div>
        </div>
      </div>

      <div className="aegis-telemetry">
        <div className="aegis-telemetry-row">
          <span className={`aegis-pulse-dot ${stateClass}`} aria-hidden="true" />
          <span className="aegis-telemetry-title">
            AEGIS CORE · {STATE_LABELS[shieldState]}
          </span>
        </div>
        <div className="aegis-telemetry-meta">
          <span>
            {scanMode === 'DETECT_ONLY'
              ? 'DETECT ONLY'
              : policyLabel ?? (activeProfile === 'CUSTOM' ? mode : activeProfile)}
          </span>
          <span>·</span>
          <span>{sourceType.toUpperCase()}</span>
          <span>·</span>
          <span>
            {totalOccurrences} {totalOccurrences === 1 ? 'entity' : 'entities'} ({uniqueEntities} unique)
          </span>
        </div>
      </div>
    </div>
  );
}
