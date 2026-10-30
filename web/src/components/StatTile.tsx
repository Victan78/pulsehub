import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: string;
  detail?: ReactNode;
  /** Met la carte en évidence quand la valeur signale un problème. */
  tone?: 'neutral' | 'warning' | 'critical';
  hero?: boolean;
  /** Explication affichée au survol ou au focus clavier (signalée par un « ? »). */
  help?: string;
}

export function StatTile({ label, value, detail, tone = 'neutral', hero = false, help }: StatTileProps) {
  return (
    <div className={`tile tile-${tone}${hero ? ' tile-hero' : ''}`} data-tip={help} tabIndex={help ? 0 : undefined}>
      <div className="tile-label">
        {label}
        {help && (
          <span className="help-dot" aria-hidden>
            ?
          </span>
        )}
      </div>
      <div className="tile-value">{value}</div>
      {detail && <div className="tile-detail">{detail}</div>}
      {help && <span className="sr-only">{help}</span>}
    </div>
  );
}
