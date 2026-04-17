import { EventEmitter } from 'events';

export type DealsEvent = {
  action: 'created' | 'updated' | 'moved' | 'deleted';
  source?: 'app' | 'integration';
};

class DealsBus extends EventEmitter {}

export const dealsBus = new DealsBus();
dealsBus.setMaxListeners(0);

export function emitDealsChanged(event: DealsEvent) {
  dealsBus.emit('changed', event);
}
