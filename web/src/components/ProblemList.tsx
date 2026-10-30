import type { DeviceView } from '../../../src/hub/synthesis/snapshot';
import { STATUS_LABEL, deviceImage, formatDuration, formatValue } from '../format';
import { listProblems } from '../problems';

const UNITS = { temperature: '°C', voltage: 'V', current: 'A' } as const;

/** Problèmes en cours : un appareil par ligne, quoi, depuis quand, et quoi faire. */
export function ProblemList({ devices, now }: { devices: DeviceView[]; now: number }) {
  const problems = listProblems(devices);

  return (
    <section className="panel alerts" aria-labelledby="alerts-title">
      <h2 id="alerts-title">
        Problèmes en cours <span className="muted">· {problems.length}</span>
      </h2>
      {problems.length === 0 ? (
        <p className="empty">Aucun problème en ce moment.</p>
      ) : (
        <ul className="alert-list">
          {problems.map((p) => (
            <li key={p.deviceId} className={`alert alert-${p.status}`}>
              <img className="alert-img" src={deviceImage(p.status)} alt="" />
              <div>
                <div className="alert-title">
                  <span className={`status-${p.status}`} aria-hidden>
                    {STATUS_LABEL[p.status].icon}
                  </span>{' '}
                  Appareil {p.deviceId} · {p.title}
                  {p.otherAlerts > 0 && (
                    <span className="muted">
                      {' '}
                      + {p.otherAlerts} autre{p.otherAlerts > 1 ? 's' : ''} alerte{p.otherAlerts > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="alert-detail">
                  {p.alert
                    ? `${formatValue(p.alert.value, UNITS[p.alert.metric])} pour une limite de ${p.alert.threshold} ${UNITS[p.alert.metric]}, depuis ${formatDuration(now - p.since)}`
                    : `Aucun message depuis ${formatDuration(now - p.since)}`}
                </div>
                {p.advice && (
                  <div className="alert-advice">
                    <span aria-hidden>→ </span>
                    {p.advice}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
