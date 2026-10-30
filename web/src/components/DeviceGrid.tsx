import { useState } from 'react';
import type { DeviceView } from '../../../src/hub/synthesis/snapshot';
import { STATUS_LABEL, formatDuration, formatInt, formatValue } from '../format';

/** Une tuile par appareil : statut lisible d'un coup d'œil, détail au survol. */
export function DeviceGrid({ devices, now }: { devices: DeviceView[]; now: number }) {
  const [problemsOnly, setProblemsOnly] = useState(false);
  const shown = problemsOnly ? devices.filter((d) => d.status !== 'ok') : devices;

  return (
    <section className="panel devices" aria-labelledby="devices-title">
      <div className="panel-head">
        <h2 id="devices-title">Appareils</h2>
        <label className="toggle">
          <input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} />
          Seulement les appareils en défaut
        </label>
      </div>

      {devices.length === 0 ? (
        <p className="empty">Aucun appareil détecté pour l'instant : en attente des premières trames.</p>
      ) : shown.length === 0 ? (
        <p className="empty">Aucun appareil en défaut.</p>
      ) : (
        <ul className="device-grid">
          {shown.map((device) => (
            <DeviceTile key={device.deviceId} device={device} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DeviceTile({ device: d, now }: { device: DeviceView; now: number }) {
  const status = STATUS_LABEL[d.status];
  const tooltip = [
    `Appareil ${d.deviceId} · ${status.label}`,
    `seq ${d.seq} · uptime ${formatDuration(d.uptimeMs)}`,
    `acceptées ${formatInt(d.accepted)} · pertes ${formatInt(d.lost)}`,
    `doublons ${formatInt(d.duplicates)} · retards ${formatInt(d.late)} · redémarrages ${d.restarts}`,
    ...d.alerts.map((a) => `⚠ ${a.label}`),
  ].join('\n');

  return (
    <li className={`device device-${d.status}`} title={tooltip}>
      <div className="device-head">
        <span className="device-id">#{d.deviceId}</span>
        <span className={`device-status status-${d.status}`}>
          <span aria-hidden>{status.icon}</span> {status.label}
        </span>
      </div>
      <div className="device-temp">{formatValue(d.temperature, '°C')}</div>
      <div className="device-sub">
        {d.status === 'offline'
          ? `silencieux depuis ${formatDuration(now - d.lastSeenAt)}`
          : `${formatValue(d.voltage, 'V')} · ${formatValue(d.current, 'A')}`}
      </div>
      {d.alerts.length > 0 && d.status !== 'offline' && (
        <div className="device-alert">{d.alerts.map((a) => a.label).join(' · ')}</div>
      )}
    </li>
  );
}
