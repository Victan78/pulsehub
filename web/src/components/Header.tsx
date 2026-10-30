import type { HubSnapshot } from '../../../src/hub/synthesis/snapshot';
import { formatClock, formatDuration } from '../format';
import type { ConnectionState } from '../hub-state';

const CONNECTION_LABEL: Record<ConnectionState, string> = {
  connecting: 'Connexion au hub…',
  open: 'Connecté au hub',
  closed: 'Hub injoignable, nouvelle tentative…',
};

export function Header({ connection, snapshot }: { connection: ConnectionState; snapshot: HubSnapshot }) {
  const live = connection === 'open' && snapshot.generatedAt > 0;

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          ◉
        </span>
        <h1>PulseHub</h1>
        <span className="brand-sub">Surveillance du matériel scénique</span>
      </div>
      <div className="header-meta">
        {live && (
          <span>
            En marche depuis {formatDuration(snapshot.generatedAt - snapshot.hubStartedAt)} · mis à jour à{' '}
            {formatClock(snapshot.generatedAt)}
          </span>
        )}
        <span className={`connection connection-${connection}`} role="status">
          <span className="connection-dot" aria-hidden />
          {CONNECTION_LABEL[connection]}
        </span>
      </div>
    </header>
  );
}
