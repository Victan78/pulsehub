import type { HubEvent } from '../../../src/hub/synthesis/snapshot';
import { formatClock } from '../format';

const LEVEL_ICON = { info: 'ℹ', warning: '▲', critical: '✕' } as const;

/** Derniers événements notables : ce qui s'est passé pendant qu'on regardait ailleurs. */
export function EventFeed({ events }: { events: HubEvent[] }) {
  return (
    <section className="panel events" aria-labelledby="events-title">
      <h2 id="events-title">Ce qui s'est passé</h2>
      {events.length === 0 ? (
        <p className="empty">Rien à signaler pour l'instant.</p>
      ) : (
        <ol className="event-list">
          {events.map((event, i) => (
            <li key={`${event.at}-${i}`} className={`event event-${event.level}`}>
              <time>{formatClock(event.at)}</time>
              <span className={`event-icon status-${event.level}`} aria-hidden>
                {LEVEL_ICON[event.level]}
              </span>
              <span>{event.message}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
