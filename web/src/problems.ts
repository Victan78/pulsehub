import type { AlertView, DeviceStatus, DeviceView } from '../../src/hub/synthesis/snapshot';

/** Un problème = un appareil en difficulté, résumé en une ligne lisible par toute la régie. */
export interface Problem {
  deviceId: number;
  status: Exclude<DeviceStatus, 'ok'>;
  title: string;
  /** Valeur mesurée et limite, ou durée de silence. */
  value: number | null;
  alert: AlertView | null;
  /** Autres alertes du même appareil, masquées derrière la plus grave. */
  otherAlerts: number;
  advice: string | null;
  since: number;
}

/** Ordre d'urgence : danger, puis appareil muet, puis à surveiller, puis OK. */
export const STATUS_PRIORITY: Record<DeviceStatus, number> = { critical: 0, offline: 1, warning: 2, ok: 3 };

export const OFFLINE_ADVICE = "Vérifier le câble réseau et l'alimentation de l'appareil.";

/** Trie les appareils du plus urgent au moins urgent, puis par numéro (ordre stable). */
export function byUrgency(a: DeviceView, b: DeviceView): number {
  return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || a.deviceId - b.deviceId;
}

/**
 * Une ligne par appareil en difficulté, avec son problème le plus grave
 * (les appareils muets compris), du plus urgent au plus ancien.
 */
export function listProblems(devices: DeviceView[]): Problem[] {
  return devices
    .filter((d) => d.status !== 'ok')
    .map(toProblem)
    .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || a.since - b.since);
}

function toProblem(device: DeviceView): Problem {
  const status = device.status as Problem['status'];
  if (status === 'offline') {
    return {
      deviceId: device.deviceId,
      status,
      title: 'Ne répond plus',
      value: null,
      alert: null,
      otherAlerts: 0,
      advice: OFFLINE_ADVICE,
      since: device.lastSeenAt,
    };
  }

  const [worst, ...others] = [...device.alerts].sort(
    (a, b) => (a.severity === b.severity ? a.breachSince - b.breachSince : a.severity === 'critical' ? -1 : 1),
  );
  return {
    deviceId: device.deviceId,
    status,
    title: worst?.label ?? 'À surveiller',
    value: worst?.value ?? null,
    alert: worst ?? null,
    otherAlerts: others.length,
    advice: worst?.advice ?? null,
    since: worst?.breachSince ?? device.lastSeenAt,
  };
}
