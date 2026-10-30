import type { AlertView } from '../../../src/hub/synthesis/snapshot';
import { formatDuration, formatValue } from '../format';

const UNITS = { temperature: '°C', voltage: 'V', current: 'A' } as const;
const SEVERITY_RANK = { critical: 0, warning: 1 } as const;

/** Alertes en cours, les critiques d'abord puis les plus anciennes. */
export function AlertList({ alerts, now }: { alerts: AlertView[]; now: number }) {
  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.breachSince - b.breachSince,
  );

  return (
    <section className="panel alerts" aria-labelledby="alerts-title">
      <h2 id="alerts-title">
        Alertes actives <span className="muted">· {alerts.length}</span>
      </h2>
      {sorted.length === 0 ? (
        <p className="empty">Aucune alerte en cours.</p>
      ) : (
        <ul className="alert-list">
          {sorted.map((alert) => (
            <li key={`${alert.deviceId}-${alert.ruleId}`} className={`alert alert-${alert.severity}`}>
              <span className={`alert-icon status-${alert.severity}`} aria-hidden>
                {alert.severity === 'critical' ? '✕' : '▲'}
              </span>
              <div>
                <div className="alert-title">
                  {alert.label} · appareil {alert.deviceId}
                </div>
                <div className="alert-detail">
                  {formatValue(alert.value, UNITS[alert.metric])} (seuil {alert.threshold} {UNITS[alert.metric]}) ·
                  depuis {formatDuration(now - alert.breachSince)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
