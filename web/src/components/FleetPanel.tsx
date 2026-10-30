import type { DeviceStatus, FleetView } from '../../../src/hub/synthesis/snapshot';
import { STATUS_LABEL, formatInt, formatValue } from '../format';

const STATUS_ORDER: DeviceStatus[] = ['critical', 'warning', 'offline', 'ok'];

/** Vue d'ensemble de la flotte : répartition des statuts et température. */
export function FleetPanel({ fleet }: { fleet: FleetView }) {
  return (
    <section className="panel fleet" aria-labelledby="fleet-title">
      <h2 id="fleet-title">
        Flotte <span className="muted">· {formatInt(fleet.total)} appareils</span>
      </h2>

      <div className="status-counts">
        {STATUS_ORDER.map((status) => (
          <div key={status} className={`status-count status-${status}`}>
            <span className="status-icon" aria-hidden>
              {STATUS_LABEL[status].icon}
            </span>
            <span className="status-count-value">{formatInt(fleet.byStatus[status])}</span>
            <span className="status-count-label">{STATUS_LABEL[status].label}</span>
          </div>
        ))}
      </div>

      <div className="status-bar" role="img" aria-label="Répartition des appareils par statut">
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

      <dl className="fleet-temps">
        <div>
          <dt>Température max</dt>
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
