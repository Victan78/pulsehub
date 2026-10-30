import type { DeviceStatus, FleetView } from '../../../src/hub/synthesis/snapshot';
import { STATUS_LABEL, formatInt, formatValue } from '../format';

const STATUS_ORDER: DeviceStatus[] = ['critical', 'warning', 'offline', 'ok'];

/** Vue d'ensemble de la flotte : combien d'appareils dans chaque état, et la température. */
export function FleetPanel({ fleet }: { fleet: FleetView }) {
  return (
    <section className="panel fleet" aria-labelledby="fleet-title">
      <h2 id="fleet-title">
        Appareils <span className="muted">· {formatInt(fleet.total)} au total</span>
      </h2>

      <div className="status-counts">
        {STATUS_ORDER.map((status) => (
          <div key={status} className={`status-count status-count-${status}${fleet.byStatus[status] > 0 ? ' is-active' : ''}`}>
            <span className={`status-icon status-${status}`} aria-hidden>
              {STATUS_LABEL[status].icon}
            </span>
            <span className="status-count-value">{formatInt(fleet.byStatus[status])}</span>
            <span className="status-count-label">{STATUS_LABEL[status].label}</span>
          </div>
        ))}
      </div>

      <div className="status-bar" role="img" aria-label="Répartition des appareils par état">
        {fleet.total === 0 ? (
          <div className="status-bar-empty" />
        ) : (
          STATUS_ORDER.filter((s) => fleet.byStatus[s] > 0).map((status) => (
            <div
              key={status}
              className={`status-bar-segment bg-${status}`}
              style={{ flexGrow: fleet.byStatus[status] }}
              title={`${STATUS_LABEL[status].label} : ${fleet.byStatus[status]}`}
            />
          ))
        )}
      </div>

      <div
        className={`anomalies${fleet.anomalies > 0 ? ' is-active' : ''}`}
        data-tip="Mesure ponctuelle hors limites (0 V, 120 °C, surintensité…), souvent retombée aussitôt. Le détail de chacune est dans « Ce qui s'est passé »."
        tabIndex={0}
      >
        <span className="anomalies-value">{formatInt(fleet.anomalies)}</span>
        <span className="anomalies-label">
          valeurs anormales détectées
          <small>pics ponctuels, détail dans « Ce qui s'est passé »</small>
        </span>
        <span className="help-dot" aria-hidden>
          ?
        </span>
      </div>

      <dl className="fleet-temps">
        <div>
          <dt>Le plus chaud</dt>
          <dd>
            {formatValue(fleet.maxTemperature?.value ?? null, '°C')}
            {fleet.maxTemperature && <span className="muted"> · appareil {fleet.maxTemperature.deviceId}</span>}
          </dd>
        </div>
        <div>
          <dt>Température moyenne</dt>
          <dd>{formatValue(fleet.averageTemperature, '°C')}</dd>
        </div>
      </dl>
    </section>
  );
}
