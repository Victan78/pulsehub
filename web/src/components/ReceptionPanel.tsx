import type { ReceptionView } from '../../../src/hub/synthesis/snapshot';
import { DECODE_ERROR_LABEL, formatInt, formatPercent } from '../format';
import { StatTile } from './StatTile';

/** Santé de la réception : le hub reçoit-il tout, et ce qu'il reçoit est-il en bon état ? */
export function ReceptionPanel({ reception: r }: { reception: ReceptionView }) {
  const reasons = Object.entries(r.invalidByReason).sort(([, a], [, b]) => b - a);

  return (
    <section className="panel reception" aria-labelledby="reception-title">
      <h2 id="reception-title">Réception des messages</h2>
      <div className="tiles">
        <StatTile
          hero
          label="Messages reçus par seconde"
          value={formatInt(r.framesPerSec)}
          detail={`${formatInt(r.datagrams)} depuis le démarrage`}
          help="Messages reçus des appareils chaque seconde. Par défaut : 50 appareils × 20 messages/s = environ 1 000."
        />
        <StatTile
          label="Messages utilisés"
          value={formatInt(r.accepted)}
          detail="valides et dans l'ordre"
          help="Messages lisibles, ni en double ni en retard : ce sont eux qui mettent à jour l'état des appareils."
        />
        <StatTile
          label="Messages abîmés"
          value={formatInt(r.invalid)}
          tone={r.invalid > 0 ? 'warning' : 'neutral'}
          detail={
            reasons.length === 0
              ? 'rejetés à la lecture'
              : reasons.map(([reason, count]) => `${DECODE_ERROR_LABEL[reason] ?? reason} : ${formatInt(count)}`).join(' · ')
          }
          help={
            'Message reçu mais illisible (contenu abîmé, incomplet, inconnu) : il est rejeté sans arrêter le hub.' +
            (reasons.length > 0 ? `\nCodes techniques : ${reasons.map(([reason, count]) => `${reason} ${count}`).join(', ')}` : '')
          }
        />
        <StatTile
          label="Messages perdus"
          value={formatInt(r.lost)}
          tone={r.lossRate > 0.01 ? 'critical' : r.lost > 0 ? 'warning' : 'neutral'}
          detail={`${formatPercent(r.lossRate)} des messages attendus`}
          help={
            'Messages attendus mais jamais utilisés : perdus en route, abîmés, ou arrivés après un message plus récent.\n' +
            'Un message en retard compte donc aussi ici : le trou est constaté avant son arrivée.'
          }
        />
        <StatTile
          label="Reçus en double"
          value={formatInt(r.duplicates)}
          detail="ignorés"
          help="Même message reçu deux fois : seul le premier est utilisé."
        />
        <StatTile
          label="Arrivés en retard"
          value={formatInt(r.late)}
          detail="ignorés"
          help="Arrivés après un message plus récent du même appareil : trop tard pour être utilisés (déjà comptés comme perdus)."
        />
        <StatTile
          label="Appareils redémarrés"
          value={formatInt(r.restarts)}
          help="Appareil qui a redémarré : son compteur de temps est revenu à zéro. Le hub repart de sa nouvelle numérotation."
        />
      </div>
    </section>
  );
}
