import { memo, useEffect, useRef, useState } from 'react';
import type { PieceColor, PieceType } from '../types/chess';
import { ChessPiece } from './ChessPiece';
import { TitleBadge } from './TitleBadge';

interface PlayerClockStripProps {
  playerName: string;
  playerTitle?: string | null;
  color: PieceColor;
  baseMs: number;
  syncedMs: number;
  lastTickAt: number | null;
  isRunning: boolean;
  isFrozen: boolean;
  speedMultiplier: number;
  capturedPieces: PieceType[];
  materialAdvantage: number;
  checksCount?: number;
  showChecks?: boolean;
  onTimeout: (timedOutColor: PieceColor) => void;
}

function formatChessComClock(ms: number, untimed: boolean): string {
  if (untimed) return '∞';
  const clamped = Math.max(0, ms);
  const totalTenths = Math.floor(clamped / 100);
  const mins = Math.floor(totalTenths / 600);
  const secs = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  const mm = String(mins);
  const ss = String(secs).padStart(2, '0');
  if (clamped < 20_000) {
    return `${mm}:${ss}.${tenths}`;
  }
  return `${mm.padStart(2, '0')}:${ss}`;
}

export const PlayerClockStrip = memo(function PlayerClockStrip({
  playerName,
  playerTitle,
  color,
  baseMs,
  syncedMs,
  lastTickAt,
  isRunning,
  isFrozen,
  speedMultiplier,
  capturedPieces,
  materialAdvantage,
  checksCount = 0,
  showChecks = false,
  onTimeout,
}: PlayerClockStripProps) {
  const untimed = baseMs === 0;
  const [displayMs, setDisplayMs] = useState(syncedMs);
  const timedOutRef = useRef(false);

  useEffect(() => {
    timedOutRef.current = false;
    if (!isRunning || untimed || isFrozen) {
      setDisplayMs(syncedMs);
      return;
    }

    const computeNow = () => {
      const elapsed = lastTickAt ? Math.max(0, Date.now() - lastTickAt) : 0;
      const next = Math.max(0, syncedMs - elapsed * speedMultiplier);
      setDisplayMs(next);
      if (next <= 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        onTimeout(color);
      }
      return next;
    };

    const initial = computeNow();
    const intervalMs = initial < 20_000 ? 100 : 250;
    const id = window.setInterval(() => {
      const rem = computeNow();
      if (rem <= 0) window.clearInterval(id);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [syncedMs, lastTickAt, isRunning, isFrozen, speedMultiplier, untimed, color, onTimeout]);

  const urgent = !untimed && isRunning && displayMs < 20_000;
  const initial = playerName.replace(/^@/, '').charAt(0).toUpperCase() || 'P';

  return (
    <div className="player-strip">
      <div className="player-strip-left">
        <div className={`player-avatar ${color === 'w' ? 'is-white' : 'is-black'}`} aria-hidden="true">
          {initial}
        </div>
        <div className="player-info">
          <div className="player-name-row">
            <TitleBadge title={playerTitle} />
            <span className="player-name">{playerName}</span>
            {showChecks && (
              <span className="checks-badge">Checks {checksCount}/3</span>
            )}
          </div>
          <div className="captures-strip">
            <div className="captures-icons">
              {capturedPieces.map((p, idx) => (
                <span key={`${p}-${idx}`} className="mini-piece">
                  <ChessPiece color={color === 'w' ? 'b' : 'w'} type={p} />
                </span>
              ))}
            </div>
            {materialAdvantage > 0 && (
              <span className="adv-val">+{materialAdvantage}</span>
            )}
          </div>
        </div>
      </div>

      <div
        className={[
          'chesscom-clock',
          isRunning ? 'is-running' : '',
          urgent ? 'is-urgent' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {formatChessComClock(displayMs, untimed)}
      </div>
    </div>
  );
});
