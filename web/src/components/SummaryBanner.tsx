import type { HubSnapshot } from '../../../src/hub/synthesis/snapshot';
import type { ConnectionState } from '../hub-state';
import { deviceImage } from '../format';
import { summarize, type Tone } from '../summary';

const ICON: Record<Tone, string> = { idle: '…', ok: '✓', warning: '▲', critical: '✕' };

export function SummaryBanner({ snapshot, connection }: { snapshot: HubSnapshot; connection: ConnectionState }) {
  const summary = summarize(snapshot, connection);
  return (
    <section className={`banner banner-${summary.tone}`} role="status" aria-live="polite">
      <img className="banner-img" src={deviceImage(summary.image)} alt="" />
      <div>
        <div className="banner-title">
          <span aria-hidden>{ICON[summary.tone]}</span> {summary.title}
        </div>
        <div className="banner-detail">{summary.detail}</div>
      </div>
    </section>
  );
}
