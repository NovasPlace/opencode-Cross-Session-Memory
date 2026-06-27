import { queueDocUpdate, flushDocUpdates, getPendingUpdates, resetFlushedFlag } from './dist/hooks/auto-docs.js';

resetFlushedFlag();
queueDocUpdate('IMPLEMENTATION_AGENT_PROTOCOL.md', 'write');
console.log('Pending:', getPendingUpdates());
await flushDocUpdates();
console.log('Flushed');