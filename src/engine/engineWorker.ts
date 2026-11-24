import { findBestMove, findWorstMove } from './chessCore';

export interface EngineWorkerRequest {
  id: number;
  type: 'best' | 'worst';
  fen: string;
  depth?: number;
}

export interface EngineWorkerResponse {
  id: number;
  move: ReturnType<typeof findBestMove>;
}

self.onmessage = (event: MessageEvent<EngineWorkerRequest>) => {
  const { id, type, fen, depth = 3 } = event.data;
  const move = type === 'worst' ? findWorstMove(fen) : findBestMove(fen, depth);
  const res: EngineWorkerResponse = { id, move };
  self.postMessage(res);
};
