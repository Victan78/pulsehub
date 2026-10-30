import { AlertList } from './components/AlertList';
import { DeviceGrid } from './components/DeviceGrid';
import { EventFeed } from './components/EventFeed';
import { FleetPanel } from './components/FleetPanel';
import { Header } from './components/Header';
import { ReceptionPanel } from './components/ReceptionPanel';
import { useHubSnapshot } from './useHubSnapshot';

/**
 * Lecture de haut en bas, du plus urgent au plus détaillé :
 * la réception est-elle saine ? → la flotte va-t-elle bien ? → quel appareil, quelle alerte ?
 */
export function App() {
  const { snapshot, connection } = useHubSnapshot();

  return (
    <div className="app">
      <Header connection={connection} snapshot={snapshot} />
      <main className="layout">
        <ReceptionPanel reception={snapshot.reception} />
        <FleetPanel fleet={snapshot.fleet} />
        <DeviceGrid devices={snapshot.devices} now={snapshot.generatedAt} />
        <aside className="side">
          <AlertList alerts={snapshot.alerts} now={snapshot.generatedAt} />
          <EventFeed events={snapshot.events} />
        </aside>
      </main>
    </div>
  );
}
