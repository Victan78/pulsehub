import type { DeviceStatus } from '../../src/hub/synthesis/snapshot';

const integer = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 2 });

export const formatInt = (value: number) => integer.format(value);
export const formatPercent = (value: number) => percent.format(value);
export const formatDecimal = (value: number | null) => (value === null ? '—' : oneDecimal.format(value));

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
  warning: { icon: '▲', label: 'À surveiller' },
  critical: { icon: '✕', label: 'Danger' },
  offline: { icon: '○', label: 'Ne répond plus' },
};

/** Illustration 3D de la machine dans chaque état (fichiers dans web/public/devices). */
export const deviceImage = (status: DeviceStatus) => `/devices/${status}.png`;

/** Motifs de rejet en langage courant (le code technique reste visible au survol). */
export const DECODE_ERROR_LABEL: Record<string, string> = {
  TOO_SHORT: 'message incomplet',
  TOO_LONG: 'message trop long',
  BAD_MAGIC: 'pas un message PulseHub',
  BAD_VERSION: 'version inconnue',
  LENGTH_MISMATCH: 'taille incohérente',
  BAD_CHECKSUM: 'contenu abîmé',
  UNKNOWN_TYPE: 'type inconnu',
  BAD_DEVICE_ID: 'appareil inconnu',
  HEARTBEAT_WITH_MEASUREMENTS: 'signal de vie mal formé',
};
