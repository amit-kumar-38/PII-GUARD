import { CheckCircle2, Circle, AlertTriangle, Clock } from 'lucide-react';
import type { TimelineStep } from '../../types/pii.ts';

interface ProtectionTimelineProps {
  steps: TimelineStep[];
}

export function ProtectionTimeline({ steps }: ProtectionTimelineProps) {
  return (
    <section className="pg-section" aria-labelledby="timeline-heading">
      <div className="pg-section-head">
        <div>
          <span className="pg-step-tag">WORKFLOW TELEMETRY</span>
          <h2 id="timeline-heading" className="pg-section-title">
            Protection Timeline
          </h2>
          <p className="pg-section-subtitle">
            Live local-processing stage status recorded from actual workspace operations.
          </p>
        </div>
      </div>

      <ol className="pg-timeline-list">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`pg-timeline-step pg-timeline-step--${step.status}`}
          >
            <div className="pg-timeline-top">
              <span className="pg-timeline-icon" aria-hidden="true">
                {step.status === 'completed' ? (
                  <CheckCircle2 size={18} />
                ) : step.status === 'error' ? (
                  <AlertTriangle size={18} />
                ) : step.status === 'active' ? (
                  <Clock size={18} />
                ) : (
                  <Circle size={18} />
                )}
              </span>
              <span className="pg-timeline-num">0{index + 1}</span>
              <strong className="pg-timeline-label">{step.label}</strong>
              {step.timestamp && (
                <span className="pg-timeline-time">{step.timestamp}</span>
              )}
            </div>
            <p className="pg-timeline-detail">{step.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
