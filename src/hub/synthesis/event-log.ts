import type { HubEvent } from './snapshot';

/** Journal borné des derniers événements notables (les plus récents en premier). */
export class EventLog {
  private readonly capacity: number;
  private readonly events: HubEvent[] = [];

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  push(event: HubEvent): void {
    this.events.unshift(event);
    if (this.events.length > this.capacity) this.events.pop();
  }

  recent(): HubEvent[] {
    return [...this.events];
  }
}
