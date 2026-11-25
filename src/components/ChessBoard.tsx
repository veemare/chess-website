import { memo, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
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
  evalCp: number | null;
  showEvalBar: boolean;
  armedTroll: TrollArmedAction;
  canTroll: boolean;
  cursesReceived: OpponentCurseState | null;
  onAttemptMove: (from: string, to: string) => void;
  onSelectPromotion: (piece: Exclude<PieceType, 'p' | 'k'>) => void;
  onCancelPromotion: () => void;
  onTrollSquareClick: (square: string) => void;
}

interface DragState {
  fromSq: string;
  color: PieceColor;
  type: PieceType;
  startX: number;
  startY: number;
  x: number;
  y: number;
  size: number;
  active: boolean;
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

export const ChessBoard = memo(function ChessBoard({
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
  evalCp,
  showEvalBar,
  armedTroll,
  canTroll,
  cursesReceived,
  onAttemptMove,
  onSelectPromotion,
  onCancelPromotion,
  onTrollSquareClick,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [dodgeOffsets, setDodgeOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);

  const boardMap = useMemo(() => getBoardMap(fen), [fen]);

  const forcedFlip = Boolean(!canTroll && cursesReceived?.boardFlippedForced);
  const effectiveOrientation: PieceColor = forcedFlip
    ? orientation === 'w'
      ? 'b'
      : 'w'
    : orientation;
  const isFlipped = effectiveOrientation === 'b';

  const displayFiles = useMemo(() => (isFlipped ? [...FILES].reverse() : FILES), [isFlipped]);
  const displayRanks = useMemo(() => (isFlipped ? [...RANKS].reverse() : RANKS), [isFlipped]);

  const effectiveLastMove =
    !canTroll && cursesReceived?.gaslightLastMove
      ? cursesReceived.gaslightLastMove
      : lastMove;

  const now = Date.now();
  const isFakeReconnecting =
    !canTroll &&
    Boolean(cursesReceived?.fakeReconnectUntil && cursesReceived.fakeReconnectUntil > now);

  const isGhostActive =
    !canTroll &&
    Boolean(cursesReceived?.ghostPiecesUntil && cursesReceived.ghostPiecesUntil > now);

  const isFakeOutcome =
    !canTroll &&
    Boolean(cursesReceived?.fakeOutcomeUntil && cursesReceived.fakeOutcomeUntil > now);

  const isDrunk = Boolean(!canTroll && cursesReceived?.drunkPieces);
  const isButterfingers = Boolean(!canTroll && cursesReceived?.butterfingers);

  const isTrollTargetMode =
    canTroll && armedTroll !== null && armedTroll.type !== 'double_move';

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return new Set<string>();
    if (canTroll && (armedTroll?.type === 'teleport' || armedTroll?.type === 'steal_piece')) {
      const targets = new Set<string>();
      for (const r of RANKS) {
        for (const f of FILES) {
          const sq = `${f}${r}`;
          if (sq === selectedSquare) continue;
          if (boardMap[sq]?.type === 'k') continue;
          targets.add(sq);
        }
      }
      return targets;
    }
    return new Set(getLegalMovesFromSquare(fen, selectedSquare, variant));
  }, [selectedSquare, canTroll, armedTroll, boardMap, fen, variant]);

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

  function isSquareActionMode(action: TrollArmedAction): boolean {
    if (!action) return false;
    return (
      action.type === 'transform' ||
      action.type === 'resurrect' ||
      action.type === 'disguise' ||
      action.type === 'gaslight' ||
      action.type === 'snipe' ||
      action.type === 'clone' ||
      action.type === 'swap'
    );
  }

  function canDragSquare(sq: string): boolean {
    const piece = boardMap[sq];
    if (!piece || isGameOver || isFakeReconnecting) return false;
    if (canTroll && isSquareActionMode(armedTroll)) return false;

    const allowSteal = canTroll && armedTroll?.type === 'steal_piece';
    const allowTeleport = canTroll && armedTroll?.type === 'teleport';
    return Boolean(
      (allowSteal && piece.color !== playerColor && piece.type !== 'k') ||
        (allowTeleport && piece.color === playerColor) ||
        (canInteract && turnColor === playerColor && piece.color === playerColor)
    );
  }

  function pointToSquare(clientX: number, clientY: number): string | null {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }
    const col = Math.min(7, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 8)));
    const row = Math.min(7, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 8)));
    return `${displayFiles[col]}${displayRanks[row]}`;
  }

  const callbacksRef = useRef({
    onAttemptMove,
    displayFiles,
    displayRanks,
    legalTargets,
    canTroll,
    armedTroll,
  });
  callbacksRef.current = {
    onAttemptMove,
    displayFiles,
    displayRanks,
    legalTargets,
    canTroll,
    armedTroll,
  };

  // Smooth custom pointer drag (renders ONLY the SVG piece with zero background!)
  useEffect(() => {
    const handlePointerMove = (e: globalThis.PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const dist = Math.hypot(e.clientX - current.startX, e.clientY - current.startY);
      const active = current.active || dist >= 5;
      const updated: DragState = {
        ...current,
        x: e.clientX,
        y: e.clientY,
        active,
      };
      dragRef.current = updated;
      setDragState(updated);
    };

    const handlePointerUp = (e: globalThis.PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      dragRef.current = null;
      setDragState(null);

      if (!current.active) return;
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 40);

      const el = boardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      const col = Math.min(7, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * 8)));
      const row = Math.min(7, Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * 8)));
      const { displayFiles: df, displayRanks: dr, onAttemptMove: attempt } = callbacksRef.current;
      const targetSq = `${df[col]}${dr[row]}`;

      if (targetSq && targetSq !== current.fromSq) {
        setSelectedSquare(null);
        attempt(current.fromSq, targetSq);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  function handleSquarePointerDown(e: PointerEvent<HTMLButtonElement>, sq: string) {
    if (e.button !== 0) return;
    if (!canDragSquare(sq)) return;
    const piece = getDisplayedPiece(sq);
    if (!piece) return;

    const boardRect = boardRef.current?.getBoundingClientRect();
    const sqSize = boardRect ? boardRect.width / 8 : 64;

    const initial: DragState = {
      fromSq: sq,
      color: piece.color,
      type: piece.type,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      size: sqSize * 0.88,
      active: false,
    };
    dragRef.current = initial;
  }

  function handleSquareClick(sq: string) {
    if (suppressNextClickRef.current) return;
    if (isGameOver || isFakeReconnecting) return;

    if (canTroll && isSquareActionMode(armedTroll)) {
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
    }, 320);
  }

  const arrowPts =
    canTroll && hintArrow
      ? {
          from: squareToPercent(hintArrow.from, isFlipped),
          to: squareToPercent(hintArrow.to, isFlipped),
        }
      : null;

  const hoverSq = dragState?.active ? pointToSquare(dragState.x, dragState.y) : null;

  const whiteEvalPct = (() => {
    if (evalCp === null) return 50;
    const clamped = Math.max(-1000, Math.min(1000, evalCp));
    const pct = 50 + (clamped / 1000) * 45;
    return isFlipped ? 100 - pct : pct;
  })();

  return (
    <div className={`board-shell ${canTroll && showEvalBar ? 'has-eval-bar' : ''}`}>
      {canTroll && showEvalBar && (
        <div className="eval-bar" aria-label="Private engine evaluation bar">
          <div className="eval-bar-fill" style={{ height: `${whiteEvalPct}%` }} />
          <span className="eval-bar-num">
            {evalCp !== null ? (evalCp / 100).toFixed(1) : '0.0'}
          </span>
        </div>
      )}

      <div
        ref={boardRef}
        className={`chess-board ${isTrollTargetMode ? 'is-armed' : ''} ${forcedFlip ? 'is-cursed-flip' : ''}`}
        role="grid"
        aria-label="Chessboard"
      >
        {displayRanks.map((rank, rIdx) =>
          displayFiles.map((file, fIdx) => {
            const sq = `${file}${rank}`;
            const originalRankIdx = RANKS.indexOf(rank);
            const originalFileIdx = FILES.indexOf(file);
            const isLight = (originalRankIdx + originalFileIdx) % 2 === 0;
            const piece = getDisplayedPiece(sq);
            const isSelected = selectedSquare === sq;
            const isDragOrigin = dragState?.active && dragState.fromSq === sq;
            const isDragHover = hoverSq === sq && legalTargets.has(sq);
            const isLast =
              effectiveLastMove?.from === sq || effectiveLastMove?.to === sq;
            const isTarget = legalTargets.has(sq);
            const isCaptureTarget = isTarget && Boolean(boardMap[sq]);
            const isKingInCheck =
              inCheckColor !== null &&
              boardMap[sq]?.type === 'k' &&
              boardMap[sq]?.color === inCheckColor;
            const isKothHill = variant === 'king_of_hill' && KOTH_HILL.has(sq);

            const showRankLabel = fIdx === 0;
            const showFileLabel = rIdx === 7;
            const dodge = dodgeOffsets[sq];
            const hideAsGhost = isGhostActive && piece && piece.color !== playerColor;

            const pieceDesc = piece
              ? `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type.toUpperCase()}`
              : 'Empty';

            return (
              <button
                key={sq}
                type="button"
                role="gridcell"
                data-square={sq}
                aria-label={`Square ${sq}, ${pieceDesc}`}
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => handleSquarePointerDown(e, sq)}
                onClick={() => handleSquareClick(sq)}
                onMouseEnter={() => handleHoverDodge(sq)}
                className={[
                  'board-sq',
                  isLight ? 'sq-light' : 'sq-dark',
                  isSelected ? 'sq-selected' : '',
                  isLast ? 'sq-last' : '',
                  isKingInCheck ? 'sq-check' : '',
                  isCaptureTarget ? 'sq-capture' : '',
                  isKothHill ? 'sq-koth' : '',
                  isDragHover ? 'sq-drag-hover' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {showRankLabel && <span className="sq-coord sq-coord-rank">{rank}</span>}
                {showFileLabel && <span className="sq-coord sq-coord-file">{file}</span>}

                {isTarget && !isCaptureTarget && (
                  <span className="legal-dot" aria-hidden="true" />
                )}

                {piece && (
                  <span
                    className={`piece-wrap ${isDrunk ? 'is-drunk' : ''} ${hideAsGhost ? 'is-ghost' : ''} ${isDragOrigin ? 'is-dragging-origin' : ''}`}
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
                <path d="M0,0 L4,2 L0,4 Z" fill="rgba(255, 170, 0, 0.92)" />
              </marker>
            </defs>
            <line
              x1={arrowPts.from.x}
              y1={arrowPts.from.y}
              x2={arrowPts.to.x}
              y2={arrowPts.to.y}
              stroke="rgba(255, 170, 0, 0.88)"
              strokeWidth="2.1"
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
                <div className="reconnect-title">Reconnecting to server</div>
                <div className="reconnect-sub">Synchronizing move state…</div>
              </div>
            </div>
          </div>
        )}

        {isFakeOutcome && (
          <div className="reconnect-overlay" aria-live="polite">
            <div className="fake-outcome-card">
              <div className="fake-outcome-title">
                {cursesReceived?.fakeOutcomeTitle || 'Checkmate — Opponent Won'}
              </div>
              <div className="reconnect-sub">Match concluded by server adjudication</div>
            </div>
          </div>
        )}
      </div>

      {/* Pure transparent piece floating under cursor — ZERO square background! */}
      {dragState?.active && (
        <div
          className="floating-drag-piece"
          style={{
            width: `${dragState.size}px`,
            height: `${dragState.size}px`,
            transform: `translate3d(${dragState.x - dragState.size / 2}px, ${dragState.y - dragState.size / 2}px, 0)`,
          }}
          aria-hidden="true"
        >
          <ChessPiece color={dragState.color} type={dragState.type} />
        </div>
      )}
    </div>
  );
});
