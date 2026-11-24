import { Chess, type PieceSymbol, type Square } from 'chess.js';
import type { GameStatus, GameVariant, PieceColor, PieceType } from '../types/chess';

export interface BoardSquarePiece {
  square: string;
  color: PieceColor;
  type: PieceType;
}

const FILES = 'abcdefgh';
const KOTH_SQUARES = new Set(['d4', 'e4', 'd5', 'e5']);

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

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

export function generateChess960StartFen(): string {
  const rank: Array<string | null> = Array(8).fill(null);

  // Light square bishop (indices 1, 3, 5, 7) & Dark square bishop (0, 2, 4, 6)
  const lightIdx = [1, 3, 5, 7][Math.floor(Math.random() * 4)];
  const darkIdx = [0, 2, 4, 6][Math.floor(Math.random() * 4)];
  rank[lightIdx] = 'B';
  rank[darkIdx] = 'B';

  const emptyIndices = () =>
    rank.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);

  // Queen
  const qPool = emptyIndices();
  rank[qPool[Math.floor(Math.random() * qPool.length)]] = 'Q';

  // Two Knights
  for (let n = 0; n < 2; n++) {
    const nPool = emptyIndices();
    rank[nPool[Math.floor(Math.random() * nPool.length)]] = 'N';
  }

  // Remaining 3 squares MUST be R - K - R left to right
  const rem = emptyIndices();
  rank[rem[0]] = 'R';
  rank[rem[1]] = 'K';
  rank[rem[2]] = 'R';

  const whiteBack = rank.join('');
  const blackBack = whiteBack.toLowerCase();
  // Keep castling flags only if K is on e-file and Rooks on corners; Chess960 otherwise starts '-'
  const castling = whiteBack === 'RNBQKBNR' ? 'KQkq' : '-';
  return `${blackBack}/pppppppp/8/8/8/8/PPPPPPPP/${whiteBack} w ${castling} - 0 1`;
}

export function generateStartFenForVariant(variant: GameVariant): string {
  if (variant === 'chess960') {
    return generateChess960StartFen();
  }
  return new Chess().fen();
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
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece) {
        const sq = `${FILES[f]}${8 - r}`;
        map[sq] = { square: sq, color: piece.color, type: piece.type };
      }
    }
  }
  return map;
}

function findKings(c: Chess): { w: string | null; b: string | null } {
  const board = c.board();
  let w: string | null = null;
  let b: string | null = null;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece?.type === 'k') {
        const sq = `${FILES[f]}${8 - r}`;
        if (piece.color === 'w') w = sq;
        else b = sq;
      }
    }
  }
  return { w, b };
}

function wouldAtomicMoveExplodeOwnKing(cBefore: Chess, from: string, to: string, mover: PieceColor): boolean {
  const target = cBefore.get(to as Square);
  const epSquare = cBefore.fen().split(' ')[3];
  const movingPiece = cBefore.get(from as Square);
  const isCapture = Boolean(target) || (movingPiece?.type === 'p' && epSquare === to);
  if (!isCapture) return false;

  // Moving king cannot capture in Atomic (own king is at explosion center)
  if (movingPiece?.type === 'k') return true;

  const kings = findKings(cBefore);
  const ownKingSq = mover === 'w' ? kings.w : kings.b;
  if (!ownKingSq) return false;

  const df = Math.abs(FILES.indexOf(ownKingSq[0]) - FILES.indexOf(to[0]));
  const dr = Math.abs(Number(ownKingSq[1]) - Number(to[1]));
  return df <= 1 && dr <= 1;
}

export function getLegalMovesFromSquare(
  fen: string,
  square: string,
  variant: GameVariant = 'standard'
): string[] {
  const c = loadSafe(fen);
  try {
    const raw = c.moves({ square: square as Square, verbose: true });
    if (variant !== 'atomic') {
      return raw.map((m) => m.to);
    }
    const mover = c.turn();
    return raw
      .filter((m) => !wouldAtomicMoveExplodeOwnKing(c, m.from, m.to, mover))
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

export function getOutcomeFromFen(
  fen: string,
  variant: GameVariant = 'standard',
  whiteChecks = 0,
  blackChecks = 0
): {
  status: GameStatus;
  winner: PieceColor | 'draw' | null;
  reason: string | null;
  inCheckColor: PieceColor | null;
} {
  const c = loadSafe(fen);
  const kings = findKings(c);

  if (!kings.w && kings.b) {
    return {
      status: 'variant_win',
      winner: 'b',
      reason: 'Atomic explosion — Black wins',
      inCheckColor: null,
    };
  }
  if (!kings.b && kings.w) {
    return {
      status: 'variant_win',
      winner: 'w',
      reason: 'Atomic explosion — White wins',
      inCheckColor: null,
    };
  }

  if (variant === 'king_of_hill') {
    if (kings.w && KOTH_SQUARES.has(kings.w)) {
      return {
        status: 'variant_win',
        winner: 'w',
        reason: 'King of the Hill — White reached the hill',
        inCheckColor: null,
      };
    }
    if (kings.b && KOTH_SQUARES.has(kings.b)) {
      return {
        status: 'variant_win',
        winner: 'b',
        reason: 'King of the Hill — Black reached the hill',
        inCheckColor: null,
      };
    }
  }

  if (variant === 'three_check') {
    if (whiteChecks >= 3) {
      return {
        status: 'variant_win',
        winner: 'w',
        reason: 'Three-Check — White delivered 3 checks',
        inCheckColor: c.inCheck() ? c.turn() : null,
      };
    }
    if (blackChecks >= 3) {
      return {
        status: 'variant_win',
        winner: 'b',
        reason: 'Three-Check — Black delivered 3 checks',
        inCheckColor: c.inCheck() ? c.turn() : null,
      };
    }
  }

  const turn = c.turn();
  const inCheck = kings.w && kings.b ? c.inCheck() : false;

  let hasMoves = false;
  try {
    if (variant === 'atomic') {
      const all = c.moves({ verbose: true });
      hasMoves = all.some((m) => !wouldAtomicMoveExplodeOwnKing(c, m.from, m.to, turn));
    } else {
      hasMoves = c.moves().length > 0;
    }
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

  if (variant === 'standard' && c.isInsufficientMaterial()) {
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
  keepTurnAfter = false,
  variant: GameVariant = 'standard'
): { fenAfter: string; san: string; deliveredCheck: boolean } | null {
  const c = loadSafe(fen);
  const movingColor = c.turn();

  if (variant === 'atomic' && wouldAtomicMoveExplodeOwnKing(c, from, to, movingColor)) {
    return null;
  }

  try {
    const move = c.move({
      from: from as Square,
      to: to as Square,
      promotion,
    });
    if (!move) return null;

    if (variant === 'atomic' && move.captured) {
      // Remove capturing piece on `to` and all non-pawn pieces in 3x3 blast radius
      c.remove(to as Square);
      const tf = FILES.indexOf(to[0]);
      const tr = Number(to[1]);
      for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
          const nf = tf + df;
          const nr = tr + dr;
          if (nf < 0 || nf > 7 || nr < 1 || nr > 8) continue;
          const adjSq = `${FILES[nf]}${nr}` as Square;
          const adjPiece = c.get(adjSq);
          if (adjPiece && adjPiece.type !== 'p') {
            c.remove(adjSq);
          }
        }
      }
    }

    let fenAfter = sanitizeCastlingInFen(c.fen());
    if (keepTurnAfter) {
      fenAfter = forceTurnInFen(fenAfter, movingColor);
    }

    const post = loadSafe(fenAfter);
    const kings = findKings(post);
    const deliveredCheck =
      Boolean(kings.w && kings.b) && post.turn() !== movingColor && post.inCheck();

    return { fenAfter, san: move.san, deliveredCheck };
  } catch {
    return null;
  }
}

export function applyTrollMovePiece(
  fen: string,
  from: string,
  to: string,
  keepTurnAfter: boolean
): { fenAfter: string; san: string; deliveredCheck: boolean } | null {
  if (from === to) return null;
  const c = loadSafe(fen);
  const piece = c.get(from as Square);
  if (!piece) return null;
  const target = c.get(to as Square);
  if (target?.type === 'k') return null;

  c.remove(from as Square);
  c.put({ type: piece.type as PieceSymbol, color: piece.color }, to as Square);

  const sym = piece.type === 'p' ? '' : piece.type.toUpperCase();
  const san = `${sym}${target ? 'x' : ''}${to}`;
  const currentTurn = c.turn();
  const nextTurn: PieceColor = keepTurnAfter ? currentTurn : currentTurn === 'w' ? 'b' : 'w';
  const fenAfter = forceTurnInFen(c.fen(), nextTurn);

  const post = loadSafe(fenAfter);
  const deliveredCheck = post.turn() !== currentTurn && post.inCheck();
  return { fenAfter, san, deliveredCheck };
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
  const kings = findKings(c);
  if (!kings.w || !kings.b) return null;

  const moves = c.moves({ verbose: true });
  if (moves.length === 0) return null;

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
