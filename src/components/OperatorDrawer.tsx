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
  cursesSent: OpponentCurseState;
  showEngineHint: boolean;
  evalDisplay: string;
  hintMoveLabel: string | null;
  isMultiplayer: boolean;
  capturedOwnPieces: PieceType[];
  onClose: () => void;
  onPanicHide: () => void;
  onSetArmed: (action: TrollArmedAction) => void;
  onStealTime: (seconds: number) => void;
  onHalveOpponentTime: () => void;
  onToggleFreezeClock: () => void;
  onSkipOpponentTurn: () => void;
  onForceUndoOpponent: () => void;
  onToggleFlipOpponent: () => void;
  onTriggerFakeLag: () => void;
  onTriggerButterfingers: () => void;
  onClearCurses: () => void;
  onToggleEngineHint: () => void;
  onPlayEngineMove: () => void;
}

type DrawerTab = 'rules' | 'clocks' | 'mind' | 'engine';

function describeArmed(armed: TrollArmedAction): string | null {
  if (!armed) return null;
  switch (armed.type) {
    case 'double_move':
      return 'Double Move armed — your next move keeps the turn.';
    case 'teleport':
      return 'Teleport armed — click any of your pieces, then click any non-king square.';
    case 'steal_piece':
      return 'Mind Control armed — click any opponent non-king piece and move it.';
    case 'transform':
      return `Transform armed — click any of your non-king pieces to morph into ${armed.targetPiece.toUpperCase()}.`;
    case 'resurrect':
      return `Resurrect armed — click any empty square to drop a ${armed.targetPiece.toUpperCase()}.`;
    case 'disguise':
      return `Phantom Disguise armed — click your piece to mask it as a ${armed.disguiseAs.toUpperCase()} on opponent's screen.`;
    case 'gaslight':
      return armed.firstSquare
        ? `Gaslight highlight — select second square (origin ${armed.firstSquare}).`
        : 'Gaslight highlight — select fake origin square.';
  }
}

export function OperatorDrawer({
  open,
  trollAccess,
  armed,
  clockFrozen,
  cursesSent,
  showEngineHint,
  evalDisplay,
  hintMoveLabel,
  isMultiplayer,
  capturedOwnPieces,
  onClose,
  onPanicHide,
  onSetArmed,
  onStealTime,
  onHalveOpponentTime,
  onToggleFreezeClock,
  onSkipOpponentTurn,
  onForceUndoOpponent,
  onToggleFlipOpponent,
  onTriggerFakeLag,
  onTriggerButterfingers,
  onClearCurses,
  onToggleEngineHint,
  onPlayEngineMove,
}: OperatorDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('rules');
  const [resurrectChoice, setResurrectChoice] = useState<Exclude<PieceType, 'k'>>('q');
  const [transformChoice, setTransformChoice] = useState<Exclude<PieceType, 'k'>>('q');

  if (!open || !trollAccess.active) return null;

  const armedMessage = describeArmed(armed);
  const accessLabel = trollAccess.permanent
    ? 'Permanent access'
    : trollAccess.expiresAt
      ? `Temp · ${Math.max(1, Math.ceil((trollAccess.expiresAt - Date.now()) / 60_000))}m left`
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
            title="Hide drawer and private engine arrows immediately (Esc)"
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
          Rules
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
          Mind
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'engine'}
          className={`seg-tab ${tab === 'engine' ? 'is-active' : ''}`}
          onClick={() => setTab('engine')}
        >
          Arbiter
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
                <BoltIcon size={15} />
                <span>Double Move</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'teleport' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'teleport' ? null : { type: 'teleport' })
                }
              >
                <BoltIcon size={15} />
                <span>Teleport Piece</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'steal_piece' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'steal_piece' ? null : { type: 'steal_piece' })
                }
              >
                <BoltIcon size={15} />
                <span>Steal Enemy Move</span>
              </button>

              <button
                type="button"
                className="op-cell"
                onClick={onForceUndoOpponent}
              >
                <UndoIcon size={15} />
                <span>Veto Last Move</span>
              </button>
            </div>

            <div className="op-subpanel">
              <div className="op-subhead">
                <span>Transform own piece into</span>
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
                  : `Arm Transform → ${transformChoice.toUpperCase()}`}
              </button>
            </div>

            <div className="op-subpanel">
              <div className="op-subhead">
                <span>
                  Resurrect piece ({capturedOwnPieces.length} lost)
                </span>
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
                  : `Arm Resurrect ${resurrectChoice.toUpperCase()}`}
              </button>
            </div>
          </div>
        )}

        {tab === 'clocks' && (
          <div className="op-section">
            <div className="op-grid">
              <button type="button" className="op-cell" onClick={() => onStealTime(15)}>
                <ClockIcon size={15} />
                <span>Steal +15s</span>
              </button>
              <button type="button" className="op-cell" onClick={() => onStealTime(30)}>
                <ClockIcon size={15} />
                <span>Steal +30s</span>
              </button>
              <button type="button" className="op-cell" onClick={onHalveOpponentTime}>
                <ClockIcon size={15} />
                <span>Halve Friend Clock</span>
              </button>
              <button type="button" className="op-cell" onClick={onSkipOpponentTurn}>
                <BoltIcon size={15} />
                <span>Skip Friend Turn</span>
              </button>
            </div>

            <button
              type="button"
              className={`btn op-full-btn ${clockFrozen ? 'btn-primary' : 'btn-secondary'}`}
              onClick={onToggleFreezeClock}
            >
              {clockFrozen ? 'My Clock Frozen (Click to Unfreeze)' : 'Freeze My Clock'}
            </button>
          </div>
        )}

        {tab === 'mind' && (
          <div className="op-section">
            {!isMultiplayer && (
              <p className="muted-copy">
                Mind-game overlays target your friend&apos;s browser in online rooms.
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
                <EyeOffIcon size={15} />
                <span>Disguise as Pawn</span>
              </button>

              <button
                type="button"
                className={`op-cell ${cursesSent.boardFlippedForced ? 'is-armed' : ''}`}
                onClick={onToggleFlipOpponent}
              >
                <BoltIcon size={15} />
                <span>
                  {cursesSent.boardFlippedForced ? 'Unflip Friend Board' : 'Flip Friend Board'}
                </span>
              </button>

              <button type="button" className="op-cell" onClick={onTriggerFakeLag}>
                <ClockIcon size={15} />
                <span>Fake Lag (3.5s)</span>
              </button>

              <button
                type="button"
                className={`op-cell ${cursesSent.butterfingers ? 'is-armed' : ''}`}
                onClick={onTriggerButterfingers}
              >
                <BoltIcon size={15} />
                <span>Butterfingers Hover</span>
              </button>

              <button
                type="button"
                className={`op-cell ${armed?.type === 'gaslight' ? 'is-armed' : ''}`}
                onClick={() =>
                  onSetArmed(armed?.type === 'gaslight' ? null : { type: 'gaslight' })
                }
              >
                <BoltIcon size={15} />
                <span>Fake Last-Move</span>
              </button>

              <button type="button" className="op-cell" onClick={onClearCurses}>
                <UndoIcon size={15} />
                <span>Clear All Illusions</span>
              </button>
            </div>
          </div>
        )}

        {tab === 'engine' && (
          <div className="op-section">
            <div className="eval-readout-card">
              <div className="eval-row">
                <span className="muted-copy">Private Arbiter Eval</span>
                <strong className="mono-val">{evalDisplay}</strong>
              </div>
              <div className="eval-row">
                <span className="muted-copy">Recommended line</span>
                <strong className="mono-val">{hintMoveLabel || '—'}</strong>
              </div>
            </div>

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
              Auto-Play Best Move Now
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
