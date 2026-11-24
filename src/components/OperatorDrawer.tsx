import { useState } from 'react';
import type {
  OpponentCurseState,
  PieceType,
  TrollAccessSummary,
  TrollArmedAction,
} from '../types/chess';
import { BoltIcon, ClockIcon, CloseIcon, EyeOffIcon, ShieldIcon, UndoIcon } from './Icons';

interface OperatorDrawerProps {
  open: boolean;
  trollAccess: TrollAccessSummary;
  armed: TrollArmedAction;
  clockFrozen: boolean;
  opponentClockSpeed: number;
  cursesSent: OpponentCurseState;
  showEngineHint: boolean;
  showEvalBar: boolean;
  evalDisplay: string;
  hintMoveLabel: string | null;
  isMultiplayer: boolean;
  isOpponentTurn: boolean;
  capturedOwnPieces: PieceType[];
  onClose: () => void;
  onPanicHide: () => void;
  onSetArmed: (action: TrollArmedAction) => void;
  onStealTime: (seconds: number) => void;
  onHalveOpponentTime: () => void;
  onToggleFreezeClock: () => void;
  onToggleDoubleDrain: () => void;
  onSkipOpponentTurn: () => void;
  onForceUndoOpponent: () => void;
  onSpawnShieldWall: () => void;
  onScrambleOpponent: () => void;
  onToggleFlipOpponent: () => void;
  onToggleDrunkPieces: () => void;
  onTriggerGhostPieces: () => void;
  onTriggerFakeLag: () => void;
  onTriggerFakeVictory: () => void;
  onTriggerButterfingers: () => void;
  onClearCurses: () => void;
  onToggleEngineHint: () => void;
  onToggleEvalBar: () => void;
  onPlayEngineMove: () => void;
  onForceOpponentBlunder: () => void;
}

type DrawerTab = 'rules' | 'clocks' | 'mind' | 'engine';

function describeArmed(armed: TrollArmedAction): string | null {
  if (!armed) return null;
  switch (armed.type) {
    case 'double_move':
      return 'Double Move armed — next move keeps your turn.';
    case 'teleport':
      return 'Teleport armed — click your piece, then any non-king square.';
    case 'steal_piece':
      return 'Mind Control armed — move any opponent non-king piece.';
    case 'snipe':
      return 'Snipe armed — click any enemy non-king piece to erase it.';
    case 'clone':
      return armed.sourceSquare
        ? `Clone (${armed.sourceSquare}) — click an empty square to spawn copy.`
        : 'Clone armed — click one of your non-king pieces to duplicate.';
    case 'swap':
      return armed.firstSquare
        ? `Swap (${armed.firstSquare}) — click a second non-king piece.`
        : 'Swap armed — click any first non-king piece.';
    case 'transform':
      return `Transform armed — click your piece to morph into ${armed.targetPiece.toUpperCase()}.`;
    case 'resurrect':
      return `Resurrect armed — click an empty square to drop a ${armed.targetPiece.toUpperCase()}.`;
    case 'disguise':
      return `Disguise armed — click your piece to mask it as ${armed.disguiseAs.toUpperCase()}.`;
    case 'gaslight':
      return armed.firstSquare
        ? `Fake Highlight — click destination square (from ${armed.firstSquare}).`
        : 'Fake Highlight — click fake origin square.';
  }
}

export function OperatorDrawer({
  open,
  trollAccess,
  armed,
  clockFrozen,
  opponentClockSpeed,
  cursesSent,
  showEngineHint,
  showEvalBar,
  evalDisplay,
  hintMoveLabel,
  isMultiplayer,
  isOpponentTurn,
  capturedOwnPieces,
  onClose,
  onPanicHide,
  onSetArmed,
  onStealTime,
  onHalveOpponentTime,
  onToggleFreezeClock,
  onToggleDoubleDrain,
  onSkipOpponentTurn,
  onForceUndoOpponent,
  onSpawnShieldWall,
  onScrambleOpponent,
  onToggleFlipOpponent,
  onToggleDrunkPieces,
  onTriggerGhostPieces,
  onTriggerFakeLag,
  onTriggerFakeVictory,
  onTriggerButterfingers,
  onClearCurses,
  onToggleEngineHint,
  onToggleEvalBar,
  onPlayEngineMove,
  onForceOpponentBlunder,
}: OperatorDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('rules');
  const [resurrectChoice, setResurrectChoice] = useState<Exclude<PieceType, 'k'>>('q');
  const [transformChoice, setTransformChoice] = useState<Exclude<PieceType, 'k'>>('q');

  if (!open || !trollAccess.active) return null;

  const armedMessage = describeArmed(armed);
  const accessLabel = trollAccess.permanent
    ? 'Permanent'
    : trollAccess.expiresAt
      ? `Temp · ${Math.max(1, Math.ceil((trollAccess.expiresAt - Date.now()) / 60_000))}m`
      : 'Active';

  return (
    <aside className="operator-drawer" aria-label="Operator Console">
      <div className="operator-header">
        <div className="operator-title">
          <ShieldIcon size={15} />
          <span>Operator Console</span>
        </div>
        <div className="operator-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-xs"
            onClick={onPanicHide}
            title="Hide drawer and private arrows immediately (Esc)"
          >
            <EyeOffIcon size={13} />
            <span>Panic (Esc)</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close operator console"
            onClick={onClose}
          >
            <CloseIcon size={15} />
          </button>
        </div>
      </div>

      <div className="segmented-tabs operator-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'rules'}
          className={`seg-tab ${tab === 'rules' ? 'is-active' : ''}`}
          onClick={() => setTab('rules')}
        >
          Cheats
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'clocks'}
          className={`seg-tab ${tab === 'clocks' ? 'is-active' : ''}`}
          onClick={() => setTab('clocks')}
        >
          Clocks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'mind'}
          className={`seg-tab ${tab === 'mind' ? 'is-active' : ''}`}
          onClick={() => setTab('mind')}
        >
          Trolls
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'engine'}
          className={`seg-tab ${tab === 'engine' ? 'is-active' : ''}`}
          onClick={() => setTab('engine')}
        >
          Engine
        </button>
      </div>

      {armedMessage && (
        <div className="armed-banner">
          <span>{armedMessage}</span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => onSetArmed(null)}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="operator-body">
        {tab === 'rules' && (
          <div className="op-section">
            <div className="op-grid">
              <button
                type="button"
                className={`op-cell ${armed?.type === 'double_move' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'double_move' ? null : { type: 'double_move' })
                }
              >
                <BoltIcon size={14} />
                <span>Double Move</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'teleport' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'teleport' ? null : { type: 'teleport' })
                }
              >
                <BoltIcon size={14} />
                <span>Teleport Any Piece</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'steal_piece' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'steal_piece' ? null : { type: 'steal_piece' })
                }
              >
                <BoltIcon size={14} />
                <span>Steal Enemy Move</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'snipe' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'snipe' ? null : { type: 'snipe' })
                }
              >
                <BoltIcon size={14} />
                <span>Snipe Enemy Piece</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'clone' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'clone' ? null : { type: 'clone' })
                }
              >
                <BoltIcon size={14} />
                <span>Clone Own Piece</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'swap' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'swap' ? null : { type: 'swap' })
                }
              >
                <BoltIcon size={14} />
                <span>Swap 2 Pieces</span>
              </button>

              <button
                type="button"
                className="op-cell"
                onClick={onSpawnShieldWall}
              >
                <ShieldIcon size={14} />
                <span>King Pawn Wall</span>
              </button>

              <button
                type="button"
                className="op-cell"
                onClick={onScrambleOpponent}
              >
                <BoltIcon size={14} />
                <span>Scramble Back Rank</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm op-full-btn"
              onClick={onForceUndoOpponent}
            >
              <UndoIcon size={14} />
              <span>Veto / Undo Opponent Move</span>
            </button>

            <div className="op-subpanel">
              <div className="op-subhead">
                <span>Morph piece into</span>
                <div className="piece-pill-row">
                  {(['q', 'r', 'n', 'b'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`mini-pill ${transformChoice === p ? 'is-active' : ''}`}
                      onClick={() => setTransformChoice(p)}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={`btn btn-secondary btn-sm op-full-btn ${armed?.type === 'transform' ? 'is-armed-btn' : ''}`}
                onClick={() =>
                  onSetArmed(
                    armed?.type === 'transform'
                      ? null
                      : { type: 'transform', targetPiece: transformChoice }
                  )
                }
              >
                {armed?.type === 'transform'
                  ? 'Click your piece on board…'
                  : `Arm Morph → ${transformChoice.toUpperCase()}`}
              </button>
            </div>

            <div className="op-subpanel">
              <div className="op-subhead">
                <span>Revive piece ({capturedOwnPieces.length} lost)</span>
                <div className="piece-pill-row">
                  {(['q', 'r', 'n', 'b', 'p'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`mini-pill ${resurrectChoice === p ? 'is-active' : ''}`}
                      onClick={() => setResurrectChoice(p)}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={`btn btn-secondary btn-sm op-full-btn ${armed?.type === 'resurrect' ? 'is-armed-btn' : ''}`}
                onClick={() =>
                  onSetArmed(
                    armed?.type === 'resurrect'
                      ? null
                      : { type: 'resurrect', targetPiece: resurrectChoice }
                  )
                }
              >
                {armed?.type === 'resurrect'
                  ? 'Click empty square on board…'
                  : `Arm Revive ${resurrectChoice.toUpperCase()}`}
              </button>
            </div>
          </div>
        )}

        {tab === 'clocks' && (
          <div className="op-section">
            <div className="op-grid">
              <button type="button" className="op-cell" onClick={() => onStealTime(15)}>
                <ClockIcon size={14} />
                <span>Steal +15s</span>
              </button>
              <button type="button" className="op-cell" onClick={() => onStealTime(30)}>
                <ClockIcon size={14} />
                <span>Steal +30s</span>
              </button>
              <button type="button" className="op-cell" onClick={onHalveOpponentTime}>
                <ClockIcon size={14} />
                <span>Halve Friend Clock</span>
              </button>
              <button type="button" className="op-cell" onClick={onSkipOpponentTurn}>
                <BoltIcon size={14} />
                <span>Skip Friend Turn</span>
              </button>
            </div>

            <button
              type="button"
              className={`btn op-full-btn ${opponentClockSpeed > 1 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onToggleDoubleDrain}
            >
              {opponentClockSpeed > 1 ? '2x Drain Active on Friend' : '2x Speed Up Friend Clock'}
            </button>

            <button
              type="button"
              className={`btn op-full-btn ${clockFrozen ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onToggleFreezeClock}
            >
              {clockFrozen ? 'My Clock Frozen (Unfreeze)' : 'Freeze My Clock'}
            </button>
          </div>
        )}

        {tab === 'mind' && (
          <div className="op-section">
            {!isMultiplayer && (
              <p className="muted-copy">
                Visual trolls target your friend&apos;s screen in online matches.
              </p>
            )}
            <div className="op-grid">
              <button
                type="button"
                className={`op-cell ${armed?.type === 'disguise' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(
                    armed?.type === 'disguise'
                      ? null
                      : { type: 'disguise', disguiseAs: 'p' }
                  )
                }
              >
                <EyeOffIcon size={14} />
                <span>Disguise as Pawn</span>
              </button>

              <button
                type="button"
                className={`op-cell ${cursesSent.boardFlippedForced ? 'is-armed' : ''}`}
                onClick={onToggleFlipOpponent}
              >
                <BoltIcon size={14} />
                <span>{cursesSent.boardFlippedForced ? 'Unflip Board' : 'Flip Friend Board'}</span>
              </button>

              <button
                type="button"
                className={`op-cell ${cursesSent.drunkPieces ? 'is-armed' : ''}`}
                onClick={onToggleDrunkPieces}
              >
                <BoltIcon size={14} />
                <span>{cursesSent.drunkPieces ? 'Fix Upside-Down' : 'Drunk Pieces (180°)'}</span>
              </button>

              <button type="button" className="op-cell" onClick={onTriggerGhostPieces}>
                <EyeOffIcon size={14} />
                <span>Ghost Pieces (6s)</span>
              </button>

              <button type="button" className="op-cell" onClick={onTriggerFakeLag}>
                <ClockIcon size={14} />
                <span>Fake Lag (3.5s)</span>
              </button>

              <button type="button" className="op-cell" onClick={onTriggerFakeVictory}>
                <BoltIcon size={14} />
                <span>Fake Checkmate Popup</span>
              </button>

              <button
                type="button"
                className={`op-cell ${cursesSent.butterfingers ? 'is-armed' : ''}`}
                onClick={onTriggerButterfingers}
              >
                <BoltIcon size={14} />
                <span>Butterfingers Hover</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'gaslight' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'gaslight' ? null : { type: 'gaslight' })
                }
              >
                <BoltIcon size={14} />
                <span>Fake Last-Move</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm op-full-btn"
              onClick={onClearCurses}
            >
              <UndoIcon size={14} />
              <span>Clear All Visual Trolls</span>
            </button>
          </div>
        )}

        {tab === 'engine' && (
          <div className="op-section">
            <div className="eval-readout-card">
              <div className="eval-row">
                <span className="muted-copy">Engine Eval</span>
                <strong className="mono-val">{evalDisplay}</strong>
              </div>
              <div className="eval-row">
                <span className="muted-copy">Best Move</span>
                <strong className="mono-val">{hintMoveLabel || '—'}</strong>
              </div>
            </div>

            <button
              type="button"
              className={`btn op-full-btn ${showEvalBar ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onToggleEvalBar}
            >
              {showEvalBar ? 'Hide Live Eval Bar' : 'Show Live Eval Bar'}
            </button>

            <button
              type="button"
              className={`btn op-full-btn ${showEngineHint ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onToggleEngineHint}
            >
              {showEngineHint ? 'Hide Best-Move Arrow' : 'Show Best-Move Arrow'}
            </button>

            <button
              type="button"
              className="btn btn-secondary op-full-btn"
              onClick={onPlayEngineMove}
              disabled={!hintMoveLabel}
            >
              Auto-Play Best Move
            </button>

            <button
              type="button"
              className="btn btn-primary op-full-btn"
              onClick={onForceOpponentBlunder}
              disabled={!isOpponentTurn}
              title="Only usable on your opponent's turn"
            >
              Sabotage: Force Friend Blunder
            </button>
          </div>
        )}
      </div>

      <div className="operator-footer">
        <span className="mono-badge">{accessLabel}</span>
        <span className="muted-copy">Ctrl+Shift+T toggle</span>
      </div>
    </aside>
  );
}
