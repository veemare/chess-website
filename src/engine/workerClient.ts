import type { EngineWorkerRequest, EngineWorkerResponse } from './engineWorker';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (move: EngineWorkerResponse['move']) => void>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    worker = new Worker(new URL('./engineWorker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (ev: MessageEvent<EngineWorkerResponse>) => {
      const cb = pending.get(ev.data.id);
      if (cb) {
        pending.delete(ev.data.id);
        cb(ev.data.move);
      }
    };
    worker.onerror = () => {
      for (const cb of pending.values()) cb(null);
      pending.clear();
    };
  }
  return worker;
}

export function queryEngineAsync(
  fen: string,
  mode: 'best' | 'worst' = 'best',
  depth = 3
): Promise<EngineWorkerResponse['move']> {
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    const req: EngineWorkerRequest = { id, type: mode, fen, depth };
    w.postMessage(req);
  });
}
