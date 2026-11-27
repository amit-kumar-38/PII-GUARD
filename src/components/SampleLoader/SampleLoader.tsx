import { FlaskConical, FileSpreadsheet } from 'lucide-react';
import {
  SYNTHETIC_SAMPLE_LIBRARY,
  type SampleScenarioId,
} from '../../modules/sample/sampleData.ts';

interface SampleLoaderProps {
  activeSampleId: SampleScenarioId;
  onLoadSample: (kind: 'text' | 'csv', scenarioId?: SampleScenarioId) => void;
}

export function SampleLoader({ activeSampleId, onLoadSample }: SampleLoaderProps) {
  return (
    <div
      className="pg-sample-panel"
      role="group"
      aria-label="Synthetic sample data loader"
    >
      <div className="pg-sample-top">
        <div className="pg-sample-actions">
          <button
            type="button"
            className="pg-btn pg-btn--accent"
            onClick={() => onLoadSample('text', activeSampleId)}
          >
            <FlaskConical size={17} aria-hidden="true" />
            Load Synthetic Sample
          </button>
          <button
            type="button"
            className="pg-btn pg-btn--secondary"
            onClick={() => onLoadSample('csv')}
          >
            <FileSpreadsheet size={17} aria-hidden="true" />
            Load Sample CSV
          </button>
        </div>
        <span className="pg-sample-tag">
          SYNTHETIC TEST DATA ONLY · FICTIONAL ENTITIES
        </span>
      </div>

      <div className="pg-scenario-strip" role="group" aria-label="Synthetic sample datasets">
        {SYNTHETIC_SAMPLE_LIBRARY.map((scenario) => {
          const isCurrent = activeSampleId === scenario.id;
          return (
            <button
              key={scenario.id}
              type="button"
              className={`pg-scenario-pill ${isCurrent ? 'pg-scenario-pill--active' : ''}`}
              onClick={() => onLoadSample('text', scenario.id)}
              title={scenario.description}
            >
              {scenario.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
