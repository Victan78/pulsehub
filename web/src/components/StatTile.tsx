import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: string;
  detail?: ReactNode;
  /** Met la tuile en évidence quand la valeur signale un problème. */
  tone?: 'neutral' | 'warning' | 'critical';
  hero?: boolean;
}

export function StatTile({ label, value, detail, tone = 'neutral', hero = false }: StatTileProps) {
  return (
    <div className={`tile tile-${tone}${hero ? ' tile-hero' : ''}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {detail && <div className="tile-detail">{detail}</div>}
    </div>
  );
}
