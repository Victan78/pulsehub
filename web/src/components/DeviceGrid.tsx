import { useState } from 'react';
import type { AlertRule, DeviceView } from '../../../src/hub/synthesis/snapshot';
import { STATUS_LABEL, deviceImage, formatDecimal, formatDuration, formatInt } from '../format';
import { temperatureGauge } from '../gauge';
import { byUrgency } from '../problems';

interface DeviceGridProps {
  devices: DeviceView[];
  rules: AlertRule[];
  now: number;
}

/**
 * Une carte par appareil : son état se lit d'un coup d'œil, le détail technique est au survol.
 * Les appareils en difficulté remontent en tête pour ne jamais se retrouver hors de l'écran.
 */
export function DeviceGrid({ devices, rules, now }: DeviceGridProps) {
  const [problemsOnly, setProblemsOnly] = useState(false);
  const sorted = [...devices].sort(byUrgency);
  const shown = problemsOnly ? sorted.filter((d) => d.status !== 'ok') : sorted;

  return (
    <section className="panel devices" aria-labelledby="devices-title">
      <div className="panel-head">
        <h2 id="devices-title">
          Chaque appareil <span className="muted">· problèmes en premier</span>
        </h2>
        <label className="toggle">
          <input type="checkbox" checked={problemsOnly} onChange={(e) => setProblemsOnly(e.target.checked)} />
          Montrer seulement ceux qui ont un problème
        </label>
      </div>

      {devices.length === 0 ? (
        <p className="empty">Aucun appareil pour l'instant : lancez le simulateur ou branchez le matériel.</p>
      ) : shown.length === 0 ? (
        <p className="empty">Aucun appareil n'a de problème.</p>
      ) : (
        <ul className="device-grid">
          {shown.map((device) => (
            <DeviceCard key={device.deviceId} device={device} rules={rules} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Carte « jauge thermique » : état, machine, température et sa distance aux limites. */
function DeviceCard({ device: d, rules, now }: { device: DeviceView; rules: AlertRule[]; now: number }) {
  const status = STATUS_LABEL[d.status];
  const gauge = temperatureGauge(d.temperature, rules);
  const worstAlert = d.alerts.find((a) => a.severity === 'critical') ?? d.alerts[0];
  const tooltip = [
    `Appareil ${d.deviceId} · ${status.label}`,
    `seq ${d.seq} · allumé depuis ${formatDuration(d.uptimeMs)}`,
    `messages utilisés ${formatInt(d.accepted)} · perdus ${formatInt(d.lost)}`,
    `en double ${formatInt(d.duplicates)} · en retard ${formatInt(d.late)} · redémarrages ${d.restarts}`,
  ].join('\n');

  return (
    <li className={`device device-${d.status}`} data-tip={tooltip} tabIndex={0}>
      <div className="device-top">
        <span className={`pill pill-${d.status}`}>
          <span aria-hidden>{status.icon}</span> {status.label}
        </span>
        <span className="device-id">
          <small>App.</small> {d.deviceId}
        </span>
      </div>

      <img className="device-img" src={deviceImage(d.status)} alt="" />

      <div className="device-temp">
        {formatDecimal(d.temperature)}
        <small>°C</small>
      </div>

      <div
        className="gauge"
        role="meter"
        aria-label={`Température de l'appareil ${d.deviceId}`}
        aria-valuemin={0}
        aria-valuemax={gauge.max}
        aria-valuenow={d.temperature ?? undefined}
      >
        {/* scaleX plutôt que width : animé par le compositeur, sans recalcul de mise en page */}
        <div className="gauge-fill" style={{ transform: `scaleX(${gauge.percent / 100})` }} />
        {gauge.marks.map((mark) => (
          <span key={mark.value} className={`gauge-mark mark-${mark.severity}`} style={{ left: `${mark.percent}%` }} />
        ))}
      </div>
      <div className="gauge-scale" aria-hidden>
        <span style={{ left: 0 }}>0</span>
        {gauge.marks.map((mark) => (
          <span key={mark.value} className={`mark-${mark.severity}`} style={{ left: `${mark.percent}%` }}>
            {mark.value}
          </span>
        ))}
        <span style={{ right: 0 }}>{gauge.max} °C</span>
      </div>

      <div className={`device-verdict${gauge.verdict?.over ? ' is-over' : ''}`}>
        {d.status === 'offline'
          ? `Muet depuis ${formatDuration(now - d.lastSeenAt)} · dernière valeur connue`
          : worstAlert
            ? `${worstAlert.label} depuis ${formatDuration(now - worstAlert.breachSince)}`
            : (gauge.verdict?.text ?? '')}
      </div>

      <dl className="device-electric">
        <div>
          <dt>Tension</dt>
          <dd>{d.status === 'offline' ? '—' : `${formatDecimal(d.voltage)} V`}</dd>
        </div>
        <div>
          <dt>Courant</dt>
          <dd>{d.status === 'offline' ? '—' : `${formatDecimal(d.current)} A`}</dd>
        </div>
      </dl>
      <span className="sr-only">{tooltip}</span>
    </li>
  );
}
