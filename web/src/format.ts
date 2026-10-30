import type { DeviceStatus } from '../../src/hub/synthesis/snapshot';

const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 2 });

export const formatInt = (value: number) => integer.format(value);
export const formatPercent = (value: number) => percent.format(value);

export function formatValue(value: number | null, unit: string): string {
  return value === null ? '—' : `${oneDecimal.format(value)} ${unit}`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${String(s).padStart(2, '0')} s`;
  return `${s} s`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('fr-FR');
}

/** Libellé + icône : un statut ne repose jamais sur la seule couleur. */
export const STATUS_LABEL: Record<DeviceStatus, { icon: string; label: string }> = {
  ok: { icon: '✓', label: 'OK' },
  warning: { icon: '▲', label: 'Attention' },
  critical: { icon: '✕', label: 'Critique' },
  offline: { icon: '○', label: 'Hors ligne' },
};

export const DECODE_ERROR_LABEL: Record<string, string> = {
  TOO_SHORT: 'Trop courte',
  TOO_LONG: 'Trop longue',
  BAD_MAGIC: 'Magic invalide',
  BAD_VERSION: 'Version inconnue',
  LENGTH_MISMATCH: 'Longueur incohérente',
  BAD_CHECKSUM: 'Checksum faux',
  UNKNOWN_TYPE: 'Type inconnu',
  BAD_DEVICE_ID: 'deviceId invalide',
  HEARTBEAT_WITH_MEASUREMENTS: 'Heartbeat avec mesures',
};
