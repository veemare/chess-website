import { Chess, type PieceSymbol, type Square } from 'chess.js';
import type { PieceColor, PieceType } from '../types/chess';

export interface BoardSquarePiece {
  square: string;
  color: PieceColor;
  type: PieceType;
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables from White's perspective (rank 8 at index 0, rank 1 at index 7)
const PAWN_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 27, 27, 10, 5, 5,
  0, 0, 0, 24, 24, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -22, -22, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_PST = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_PST = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

function loadSafe(fen: string): Chess {
  const c = new Chess();
  c.load(fen, { skipValidation: true });
  return c;
}

export function sanitizeCastlingInFen(fen: string): string {
  const c = loadSafe(fen);
  const parts = c.fen().split(' ');
  const wk = c.get('e1');
  const wrh = c.get('h1');
  const wra = c.get('a1');
  const bk = c.get('e8');
  const brh = c.get('h8');
  const bra = c.get('a8');

  let castling = '';
  const orig = parts[2] || '-';
  if (orig.includes('K') && wk?.type === 'k' && wk.color === 'w' && wrh?.type === 'r' && wrh.color === 'w') {
    castling += 'K';
  }
  if (orig.includes('Q') && wk?.type === 'k' && wk.color === 'w' && wra?.type === 'r' && wra.color === 'w') {
    castling += 'Q';
  }
  if (orig.includes('k') && bk?.type === 'k' && bk.color === 'b' && brh?.type === 'r' && brh.color === 'b') {
    castling += 'k';
  }
  if (orig.includes('q') && bk?.type === 'k' && bk.color === 'b' && bra?.type === 'r' && bra.color === 'b') {
    castling += 'q';
  }

  parts[2] = castling || '-';
  return parts.join(' ');
}

export function forceTurnInFen(fen: string, turn: PieceColor): string {
  const parts = sanitizeCastlingInFen(fen).split(' ');
  parts[1] = turn;
  parts[3] = '-';
  return parts.join(' ');
}

export function getTurnFromFen(fen: string): PieceColor {
  const part = fen.split(' ')[1];
  return part === 'b' ? 'b' : 'w';
}

export function getBoardMap(fen: string): Record<string, BoardSquarePiece> {
  const c = loadSafe(fen);
  const board = c.board();
  const map: Record<string, BoardSquarePiece> = {};
  const files = 'abcdefgh';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece) {
        const sq = `${files[f]}${8 - r}`;
        map[sq] = { square: sq, color: piece.color, type: piece.type };
      }
    }
  }
  return map;
}

export function getLegalMovesFromSquare(fen: string, square: string): string[] {
  const c = loadSafe(fen);
  try {
    return c
      .moves({ square: square as Square, verbose: true })
      .map((m) => m.to);
  } catch {
    return [];
  }
}

export function needsPromotion(fen: string, from: string, to: string): boolean {
  const c = loadSafe(fen);
  const piece = c.get(from as Square);
  if (!piece || piece.type !== 'p') return false;
  const targetRank = to[1];
  return (piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1');
}

export function getOutcomeFromFen(fen: string): {
  status: 'active' | 'checkmate' | 'stalemate' | 'draw';
  winner: PieceColor | 'draw' | null;
  reason: string | null;
  inCheckColor: PieceColor | null;
} {
  const c = loadSafe(fen);
  const turn = c.turn();
  const inCheck = c.inCheck();

  let hasMoves = false;
  try {
    hasMoves = c.moves().length > 0;
  } catch {
    hasMoves = false;
  }

  if (!hasMoves) {
    if (inCheck) {
      return {
        status: 'checkmate',
        winner: turn === 'w' ? 'b' : 'w',
        reason: `Checkmate — ${turn === 'w' ? 'Black' : 'White'} wins`,
        inCheckColor: turn,
      };
    }
    return {
      status: 'stalemate',
      winner: 'draw',
      reason: 'Stalemate — Draw',
      inCheckColor: null,
    };
  }

  if (c.isInsufficientMaterial()) {
    return {
      status: 'draw',
      winner: 'draw',
      reason: 'Draw by insufficient material',
      inCheckColor: inCheck ? turn : null,
    };
  }

  return {
    status: 'active',
    winner: null,
    reason: null,
    inCheckColor: inCheck ? turn : null,
  };
}

export function applyStandardMove(
  fen: string,
  from: string,
  to: string,
  promotion: Exclude<PieceType, 'p' | 'k'> = 'q',
  keepTurnAfter = false
): { fenAfter: string; san: string } | null {
  const c = loadSafe(fen);
  try {
    const movingColor = c.turn();
    const move = c.move({
      from: from as Square,
      to: to as Square,
      promotion,
    });
    if (!move) return null;
    let fenAfter = sanitizeCastlingInFen(c.fen());
    if (keepTurnAfter) {
      fenAfter = forceTurnInFen(fenAfter, movingColor);
    }
    return { fenAfter, san: move.san };
  } catch {
    return null;
  }
}

export function applyTrollMovePiece(
  fen: string,
  from: string,
  to: string,
  keepTurnAfter: boolean
): { fenAfter: string; san: string } | null {
  if (from === to) return null;
  const c = loadSafe(fen);
  const piece = c.get(from as Square);
  if (!piece) return null;
  const target = c.get(to as Square);
  if (target?.type === 'k') return null; // Keep kings on board for real checkmates

  c.remove(from as Square);
  c.put({ type: piece.type as PieceSymbol, color: piece.color }, to as Square);

  const sym = piece.type === 'p' ? '' : piece.type.toUpperCase();
  const san = `${sym}${target ? 'x' : ''}${to}`;
  const currentTurn = c.turn();
  const nextTurn: PieceColor = keepTurnAfter ? currentTurn : currentTurn === 'w' ? 'b' : 'w';
  const fenAfter = forceTurnInFen(c.fen(), nextTurn);
  return { fenAfter, san };
}

export function applyTransformPiece(
  fen: string,
  square: string,
  color: PieceColor,
  newType: Exclude<PieceType, 'k'>
): { fenAfter: string; san: string } | null {
  const c = loadSafe(fen);
  const existing = c.get(square as Square);
  if (!existing || existing.color !== color || existing.type === 'k') return null;
  c.put({ type: newType as PieceSymbol, color }, square as Square);
  const fenAfter = sanitizeCastlingInFen(c.fen());
  return { fenAfter, san: `${square}=${newType.toUpperCase()}` };
}

export function applyResurrectPiece(
  fen: string,
  square: string,
  color: PieceColor,
  pieceType: Exclude<PieceType, 'k'>
): { fenAfter: string; san: string } | null {
  const c = loadSafe(fen);
  if (c.get(square as Square)) return null;
  c.put({ type: pieceType as PieceSymbol, color }, square as Square);
  const fenAfter = sanitizeCastlingInFen(c.fen());
  const label = pieceType === 'p' ? '' : pieceType.toUpperCase();
  return { fenAfter, san: `${label}@${square}` };
}

export function getCapturedPieces(fen: string): {
  whiteCaptured: PieceType[];
  blackCaptured: PieceType[];
  whiteAdvantage: number;
} {
  const startCounts: Record<Exclude<PieceType, 'k'>, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
  const current: Record<PieceColor, Record<Exclude<PieceType, 'k'>, number>> = {
    w: { q: 0, r: 0, b: 0, n: 0, p: 0 },
    b: { q: 0, r: 0, b: 0, n: 0, p: 0 },
  };
  const map = getBoardMap(fen);
  let whitePts = 0;
  let blackPts = 0;

  for (const p of Object.values(map)) {
    if (p.type === 'k') continue;
    current[p.color][p.type] += 1;
    const val = PIECE_VALUES[p.type] / 100;
    if (p.color === 'w') whitePts += val;
    else blackPts += val;
  }

  const order: Array<Exclude<PieceType, 'k'>> = ['q', 'r', 'b', 'n', 'p'];
  const whiteCaptured: PieceType[] = [];
  const blackCaptured: PieceType[] = [];

  for (const t of order) {
    const missingBlack = Math.max(0, startCounts[t] - current.b[t]);
    for (let i = 0; i < missingBlack; i++) whiteCaptured.push(t);
    const missingWhite = Math.max(0, startCounts[t] - current.w[t]);
    for (let i = 0; i < missingWhite; i++) blackCaptured.push(t);
  }

  return {
    whiteCaptured,
    blackCaptured,
    whiteAdvantage: Math.round(whitePts - blackPts),
  };
}

function getPstValue(type: PieceType, color: PieceColor, row: number, col: number): number {
  const r = color === 'w' ? row : 7 - row;
  const idx = r * 8 + col;
  switch (type) {
    case 'p':
      return PAWN_PST[idx];
    case 'n':
      return KNIGHT_PST[idx];
    case 'b':
      return BISHOP_PST[idx];
    case 'r':
      return ROOK_PST[idx];
    case 'q':
      return QUEEN_PST[idx];
    case 'k':
      return KING_PST[idx];
  }
}

export function evaluatePositionCp(fen: string): number {
  const c = loadSafe(fen);
  const board = c.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const val = PIECE_VALUES[piece.type] + getPstValue(piece.type, piece.color, r, f);
      score += piece.color === 'w' ? val : -val;
    }
  }
  return score;
}

export function findBestMove(
  fen: string,
  depth = 3
): { from: string; to: string; san: string; promotion?: Exclude<PieceType, 'p' | 'k'>; evalCp: number } | null {
  const c = loadSafe(fen);
  const moves = c.moves({ verbose: true });
  if (moves.length === 0) return null;

  // MVV-LVA ordering for quick alpha-beta pruning
  moves.sort((a, b) => {
    const aScore = (a.captured ? PIECE_VALUES[a.captured] * 10 : 0) + (a.promotion ? 800 : 0);
    const bScore = (b.captured ? PIECE_VALUES[b.captured] * 10 : 0) + (b.promotion ? 800 : 0);
    return bScore - aScore;
  });

  const maximizing = c.turn() === 'w';
  let bestMove = moves[0];
  let bestEval = maximizing ? -Infinity : Infinity;

  function alphabeta(node: Chess, d: number, alpha: number, beta: number, isMax: boolean): number {
    if (d === 0) return evaluatePositionCp(node.fen());
    const legal = node.moves({ verbose: true });
    if (legal.length === 0) {
      if (node.inCheck()) return isMax ? -99999 - d : 99999 + d;
      return 0;
    }

    legal.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

    if (isMax) {
      let maxEv = -Infinity;
      for (const m of legal) {
        node.move(m);
        const ev = alphabeta(node, d - 1, alpha, beta, false);
        node.undo();
        if (ev > maxEv) maxEv = ev;
        if (ev > alpha) alpha = ev;
        if (beta <= alpha) break;
      }
      return maxEv;
    } else {
      let minEv = Infinity;
      for (const m of legal) {
        node.move(m);
        const ev = alphabeta(node, d - 1, alpha, beta, true);
        node.undo();
        if (ev < minEv) minEv = ev;
        if (ev < beta) beta = ev;
        if (beta <= alpha) break;
      }
      return minEv;
    }
  }

  for (const m of moves) {
    c.move(m);
    const ev = alphabeta(c, Math.max(0, depth - 1), -Infinity, Infinity, !maximizing);
    c.undo();
    if (maximizing ? ev > bestEval : ev < bestEval) {
      bestEval = ev;
      bestMove = m;
    }
  }

  return {
    from: bestMove.from,
    to: bestMove.to,
    san: bestMove.san,
    promotion: bestMove.promotion as Exclude<PieceType, 'p' | 'k'> | undefined,
    evalCp: bestEval,
  };
}
