import type { ReceptionView } from '../../../src/hub/synthesis/snapshot';
import { DECODE_ERROR_LABEL, formatInt, formatPercent } from '../format';
import { StatTile } from './StatTile';

/** Santé de la réception : le hub voit-il tout, et ce qu'il voit est-il intègre ? */
export function ReceptionPanel({ reception: r }: { reception: ReceptionView }) {
  const invalidRate = r.datagrams === 0 ? 0 : r.invalid / r.datagrams;
  const reasons = Object.entries(r.invalidByReason).sort(([, a], [, b]) => b - a);

  return (
    <section className="panel reception" aria-labelledby="reception-title">
      <h2 id="reception-title">Réception</h2>
      <div className="tiles">
        <StatTile hero label="Débit" value={`${formatInt(r.framesPerSec)} trames/s`} detail={`${formatInt(r.datagrams)} reçues au total`} />
        <StatTile label="Acceptées" value={formatInt(r.accepted)} detail="après décodage et séquencement" />
        <StatTile
          label="Invalides"
          value={formatInt(r.invalid)}
          tone={r.invalid > 0 ? 'warning' : 'neutral'}
          detail={
            reasons.length === 0
              ? formatPercent(invalidRate)
              : reasons.map(([reason, count]) => `${DECODE_ERROR_LABEL[reason] ?? reason} : ${formatInt(count)}`).join(' · ')
          }
        />
        <StatTile
          label="Pertes"
          value={formatInt(r.lost)}
          tone={r.lossRate > 0.01 ? 'critical' : r.lost > 0 ? 'warning' : 'neutral'}
          detail={`${formatPercent(r.lossRate)} des trames attendues`}
        />
        <StatTile label="Doublons écartés" value={formatInt(r.duplicates)} />
        <StatTile label="Retards écartés" value={formatInt(r.late)} />
        <StatTile label="Redémarrages" value={formatInt(r.restarts)} />
      </div>
    </section>
  );
}
