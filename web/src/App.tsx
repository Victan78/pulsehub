import { DeviceGrid } from './components/DeviceGrid';
import { EventFeed } from './components/EventFeed';
import { FleetPanel } from './components/FleetPanel';
import { Header } from './components/Header';
import { ProblemList } from './components/ProblemList';
import { ReceptionPanel } from './components/ReceptionPanel';
import { SummaryBanner } from './components/SummaryBanner';
import { useHubSnapshot } from './useHubSnapshot';

/**
 * Lecture de haut en bas, du plus urgent au plus détaillé :
 * tout va-t-il bien ? → la réception est-elle saine ? → la flotte ? → quel appareil, quel problème ?
 */
export function App() {
  const { snapshot, connection } = useHubSnapshot();

  return (
    <div className="app">
      <Header connection={connection} snapshot={snapshot} />
      <main className="layout">
        <SummaryBanner snapshot={snapshot} connection={connection} />
        <ReceptionPanel reception={snapshot.reception} />
        <FleetPanel fleet={snapshot.fleet} />
        <DeviceGrid devices={snapshot.devices} rules={snapshot.rules} now={snapshot.generatedAt} />
        <aside className="side">
          <ProblemList devices={snapshot.devices} now={snapshot.generatedAt} />
          <EventFeed events={snapshot.events} />
        </aside>
      </main>
    </div>
  );
}
