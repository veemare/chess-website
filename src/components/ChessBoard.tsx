import { useState, type DragEvent } from 'react';
import { getBoardMap, getLegalMovesFromSquare } from '../engine/chessCore';
import type {
  GameVariant,
  LastMoveHighlight,
  OpponentCurseState,
  PieceColor,
  PieceType,
  TrollArmedAction,
} from '../types/chess';
import { ChessPiece } from './ChessPiece';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const KOTH_HILL = new Set(['d4', 'e4', 'd5', 'e5']);

interface ChessBoardProps {
  fen: string;
  variant?: GameVariant;
  orientation: PieceColor;
  playerColor: PieceColor;
  turnColor: PieceColor;
  canInteract: boolean;
  isGameOver: boolean;
  inCheckColor: PieceColor | null;
  lastMove: LastMoveHighlight | null;
  pendingPromotion: { from: string; to: string; color: PieceColor } | null;
  hintArrow: { from: string; to: string } | null;
  armedTroll: TrollArmedAction;
  canTroll: boolean;
  cursesReceived: OpponentCurseState | null;
  onAttemptMove: (from: string, to: string) => void;
  onSelectPromotion: (piece: Exclude<PieceType, 'p' | 'k'>) => void;
  onCancelPromotion: () => void;
  onTrollSquareClick: (square: string) => void;
}

function squareToPercent(square: string, flipped: boolean): { x: number; y: number } {
  const fileIdx = FILES.indexOf(square[0]);
  const rankIdx = RANKS.indexOf(square[1]);
  const col = flipped ? 7 - fileIdx : fileIdx;
  const row = flipped ? 7 - rankIdx : rankIdx;
  return {
    x: (col + 0.5) * 12.5,
    y: (row + 0.5) * 12.5,
  };
}

export function ChessBoard({
  fen,
  variant = 'standard',
  orientation,
  playerColor,
  turnColor,
  canInteract,
  isGameOver,
  inCheckColor,
  lastMove,
  pendingPromotion,
  hintArrow,
  armedTroll,
  canTroll,
  cursesReceived,
  onAttemptMove,
  onSelectPromotion,
  onCancelPromotion,
  onTrollSquareClick,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [dodgeOffsets, setDodgeOffsets] = useState<Record<string, { x: number; y: number }>>({});

  const boardMap = getBoardMap(fen);
  const forcedFlip = Boolean(!canTroll && cursesReceived?.boardFlippedForced);
  const effectiveOrientation: PieceColor = forcedFlip
    ? orientation === 'w'
      ? 'b'
      : 'w'
    : orientation;
  const isFlipped = effectiveOrientation === 'b';

  const displayFiles = isFlipped ? [...FILES].reverse() : FILES;
  const displayRanks = isFlipped ? [...RANKS].reverse() : RANKS;

  const effectiveLastMove =
    !canTroll && cursesReceived?.gaslightLastMove
      ? cursesReceived.gaslightLastMove
      : lastMove;

  const isFakeReconnecting =
    !canTroll &&
    cursesReceived?.fakeReconnectUntil !== null &&
    cursesReceived?.fakeReconnectUntil !== undefined &&
    cursesReceived.fakeReconnectUntil > Date.now();

  const isButterfingers = Boolean(!canTroll && cursesReceived?.butterfingers);

  const isTrollTargetMode =
    canTroll &&
    armedTroll !== null &&
    armedTroll.type !== 'double_move';

  const legalTargets = (() => {
    if (!selectedSquare) return new Set<string>();
    if (canTroll && (armedTroll?.type === 'teleport' || armedTroll?.type === 'steal_piece')) {
      const targets = new Set<string>();
      for (const r of RANKS) {
        for (const f of FILES) {
          const sq = `${f}${r}`;
          if (sq === selectedSquare) continue;
          const occupant = boardMap[sq];
          if (occupant?.type === 'k') continue;
          targets.add(sq);
        }
      }
      return targets;
    }
    return new Set(getLegalMovesFromSquare(fen, selectedSquare, variant));
  })();

  function getDisplayedPiece(sq: string) {
    const piece = boardMap[sq];
    if (!piece) return null;
    if (!canTroll && cursesReceived?.disguisedSquares[sq]) {
      return {
        ...piece,
        type: cursesReceived.disguisedSquares[sq],
      };
    }
    return piece;
  }

  function handleSquareClick(sq: string) {
    if (isGameOver || isFakeReconnecting) return;

    // Troll single-square actions (transform, resurrect, disguise, gaslight)
    if (
      canTroll &&
      armedTroll &&
      (armedTroll.type === 'transform' ||
        armedTroll.type === 'resurrect' ||
        armedTroll.type === 'disguise' ||
        armedTroll.type === 'gaslight')
    ) {
      setSelectedSquare(null);
      onTrollSquareClick(sq);
      return;
    }

    const piece = boardMap[sq];
    const allowSteal = canTroll && armedTroll?.type === 'steal_piece';
    const allowTeleport = canTroll && armedTroll?.type === 'teleport';

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }

      if (allowTeleport || allowSteal || legalTargets.has(sq)) {
        const from = selectedSquare;
        setSelectedSquare(null);
        onAttemptMove(from, sq);
        return;
      }

      // Switch selection if clicking own movable piece
      if (allowSteal && piece && piece.color !== playerColor && piece.type !== 'k') {
        setSelectedSquare(sq);
        return;
      }
      if (
        piece &&
        piece.color === playerColor &&
        (allowTeleport || (canInteract && turnColor === playerColor))
      ) {
        setSelectedSquare(sq);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    // No square selected yet
    if (!piece) return;
    if (allowSteal) {
      if (piece.color !== playerColor && piece.type !== 'k') {
        setSelectedSquare(sq);
      }
      return;
    }

    if (allowTeleport) {
      if (piece.color === playerColor) {
        setSelectedSquare(sq);
      }
      return;
    }

    if (canInteract && turnColor === playerColor && piece.color === playerColor) {
      setSelectedSquare(sq);
    }
  }

  function handleDragStart(e: DragEvent<HTMLButtonElement>, sq: string) {
    const piece = boardMap[sq];
    if (!piece || isGameOver || isFakeReconnecting) {
      e.preventDefault();
      return;
    }
    const allowSteal = canTroll && armedTroll?.type === 'steal_piece';
    const allowTeleport = canTroll && armedTroll?.type === 'teleport';
    const canDragPiece =
      (allowSteal && piece.color !== playerColor && piece.type !== 'k') ||
      (allowTeleport && piece.color === playerColor) ||
      (canInteract && turnColor === playerColor && piece.color === playerColor);

    if (!canDragPiece) {
      e.preventDefault();
      return;
    }

    setSelectedSquare(sq);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sq);
  }

  function handleDrop(e: DragEvent<HTMLButtonElement>, targetSq: string) {
    e.preventDefault();
    const fromSq = e.dataTransfer.getData('text/plain') || selectedSquare;
    if (!fromSq || fromSq === targetSq) return;
    setSelectedSquare(null);
    onAttemptMove(fromSq, targetSq);
  }

  function handleHoverDodge(sq: string) {
    if (!isButterfingers) return;
    const piece = boardMap[sq];
    if (!piece || piece.color !== playerColor) return;
    const dx = (Math.random() > 0.5 ? 1 : -1) * 14;
    const dy = (Math.random() > 0.5 ? 1 : -1) * 10;
    setDodgeOffsets((prev) => ({ ...prev, [sq]: { x: dx, y: dy } }));
    window.setTimeout(() => {
      setDodgeOffsets((prev) => {
        const next = { ...prev };
        delete next[sq];
        return next;
      });
    }, 340);
  }

  const arrowPts =
    canTroll && hintArrow
      ? {
          from: squareToPercent(hintArrow.from, isFlipped),
          to: squareToPercent(hintArrow.to, isFlipped),
        }
      : null;

  return (
    <div className="board-shell">
      <div className="board-frame">
        <div className="coord-rail-ranks" aria-hidden="true">
          {displayRanks.map((rank) => (
            <span key={rank} className="coord-cell">
              {rank}
            </span>
          ))}
        </div>

        <div
          className={`chess-board ${isTrollTargetMode ? 'is-armed' : ''} ${forcedFlip ? 'is-cursed-flip' : ''}`}
          role="grid"
          aria-label="Chessboard"
        >
          {displayRanks.map((rank) =>
            displayFiles.map((file) => {
              const sq = `${file}${rank}`;
              const originalRankIdx = RANKS.indexOf(rank);
              const originalFileIdx = FILES.indexOf(file);
              const isLight = (originalRankIdx + originalFileIdx) % 2 === 0;
              const piece = getDisplayedPiece(sq);
              const isSelected = selectedSquare === sq;
              const isLast =
                effectiveLastMove?.from === sq || effectiveLastMove?.to === sq;
              const isTarget = legalTargets.has(sq);
              const isCaptureTarget = isTarget && Boolean(boardMap[sq]);
              const isKingInCheck =
                inCheckColor !== null &&
                boardMap[sq]?.type === 'k' &&
                boardMap[sq]?.color === inCheckColor;
              const isKothHill = variant === 'king_of_hill' && KOTH_HILL.has(sq);

              const dodge = dodgeOffsets[sq];

              const pieceDesc = piece
                ? `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type.toUpperCase()}`
                : 'Empty';

              return (
                <button
                  key={sq}
                  type="button"
                  role="gridcell"
                  aria-label={`Square ${sq}, ${pieceDesc}`}
                  onClick={() => handleSquareClick(sq)}
                  onMouseEnter={() => handleHoverDodge(sq)}
                  draggable={Boolean(piece)}
                  onDragStart={(e) => handleDragStart(e, sq)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, sq)}
                  className={[
                    'board-sq',
                    isLight ? 'sq-light' : 'sq-dark',
                    isSelected ? 'sq-selected' : '',
                    isLast ? 'sq-last' : '',
                    isKingInCheck ? 'sq-check' : '',
                    isCaptureTarget ? 'sq-capture' : '',
                    isKothHill ? 'sq-koth' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isTarget && !isCaptureTarget && (
                    <span className="legal-dot" aria-hidden="true" />
                  )}

                  {piece && (
                    <span
                      className="piece-wrap"
                      style={
                        dodge
                          ? { transform: `translate(${dodge.x}px, ${dodge.y}px)` }
                          : undefined
                      }
                    >
                      <ChessPiece color={piece.color} type={piece.type} />
                    </span>
                  )}
                </button>
              );
            })
          )}

          {arrowPts && (
            <svg className="board-arrow-layer" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <marker
                  id="vesper-hint-head"
                  markerWidth="4"
                  markerHeight="4"
                  refX="2.5"
                  refY="2"
                  orient="auto"
                >
                  <path d="M0,0 L4,2 L0,4 Z" fill="rgba(225, 29, 72, 0.9)" />
                </marker>
              </defs>
              <line
                x1={arrowPts.from.x}
                y1={arrowPts.from.y}
                x2={arrowPts.to.x}
                y2={arrowPts.to.y}
                stroke="rgba(225, 29, 72, 0.85)"
                strokeWidth="1.9"
                strokeLinecap="round"
                markerEnd="url(#vesper-hint-head)"
              />
            </svg>
          )}

          {pendingPromotion && (
            <div className="promotion-overlay" role="dialog" aria-label="Choose promotion piece">
              <div className="promotion-panel">
                <div className="promotion-title">Promote pawn</div>
                <div className="promotion-choices">
                  {(['q', 'r', 'b', 'n'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="promotion-btn"
                      aria-label={`Promote to ${p}`}
                      onClick={() => onSelectPromotion(p)}
                    >
                      <ChessPiece color={pendingPromotion.color} type={p} />
                    </button>
                  ))}
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelPromotion}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isFakeReconnecting && (
            <div className="reconnect-overlay" aria-live="polite">
              <div className="reconnect-card">
                <span className="spinner-ring" aria-hidden="true" />
                <div>
                  <div className="reconnect-title">Reconnecting to arbiter</div>
                  <div className="reconnect-sub">Synchronizing P2P board state…</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="coord-corner" aria-hidden="true" />

        <div className="coord-rail-files" aria-hidden="true">
          {displayFiles.map((file) => (
            <span key={file} className="coord-cell">
              {file}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
