import { useEffect, useState, type FormEvent } from 'react';
import {
  removeFriend,
  respondDirectChallenge,
  respondFriendRequest,
  sendFriendRequest,
} from '../services/api';
import {
  GAME_VARIANTS,
  TIME_CONTROLS,
  type DirectChallengeSummary,
  type FriendSummary,
  type GameVariant,
  type PieceColor,
  type PublicUser,
  type SocialStateResponse,
} from '../types/chess';
import { CloseIcon, UsersIcon } from './Icons';

interface FriendsModalProps {
  open: boolean;
  user: PublicUser | null;
  social: SocialStateResponse;
  onClose: () => void;
  onRefreshSocial: () => Promise<void>;
  onOpenAccount: () => void;
  onLaunchChallenge: (input: {
    friend: FriendSummary;
    variant: GameVariant;
    timeControlId: string;
    timeControlLabel: string;
    baseMs: number;
    incMs: number;
    preferredColor: 'random' | PieceColor;
  }) => Promise<void>;
  onAcceptChallenge: (challenge: DirectChallengeSummary) => Promise<void>;
}

type TimerCategory = 'Bullet' | 'Blitz' | 'Rapid' | 'Custom';

export function FriendsModal({
  open,
  user,
  social,
  onClose,
  onRefreshSocial,
  onOpenAccount,
  onLaunchChallenge,
  onAcceptChallenge,
}: FriendsModalProps) {
  const [friendUsername, setFriendUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Direct challenge composer state
  const [challengingFriend, setChallengingFriend] = useState<FriendSummary | null>(null);
  const [variant, setVariant] = useState<GameVariant>('standard');
  const [timerCat, setTimerCat] = useState<TimerCategory>('Blitz');
  const [timeControlId, setTimeControlId] = useState('5+0');
  const [customMin, setCustomMin] = useState(7);
  const [customInc, setCustomInc] = useState(3);
  const [preferredColor, setPreferredColor] = useState<'random' | PieceColor>('random');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNotice(null);
    if (user) {
      void onRefreshSocial();
    }
  }, [open, user, onRefreshSocial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleAddFriend(e: FormEvent) {
    e.preventDefault();
    if (!friendUsername.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await sendFriendRequest(friendUsername.trim());
      setFriendUsername('');
      if (res.autoAccepted) {
        setNotice(`You and @${res.targetUsername} are now friends.`);
      } else {
        setNotice('Friend request sent.');
      }
      await onRefreshSocial();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRespondRequest(id: string, action: 'accept' | 'decline') {
    setBusy(true);
    setError(null);
    try {
      await respondFriendRequest(id, action);
      await onRefreshSocial();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(friend: FriendSummary) {
    setBusy(true);
    setError(null);
    try {
      await removeFriend(friend.id);
      if (challengingFriend?.id === friend.id) setChallengingFriend(null);
      await onRefreshSocial();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove friend.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendChallenge(e: FormEvent) {
    e.preventDefault();
    if (!challengingFriend) return;
    setBusy(true);
    setError(null);
    try {
      let tcId = timeControlId;
      let tcLabel = TIME_CONTROLS.find((t) => t.id === timeControlId)?.label || '5 | 0';
      let baseMs = TIME_CONTROLS.find((t) => t.id === timeControlId)?.baseMs ?? 300_000;
      let incMs = TIME_CONTROLS.find((t) => t.id === timeControlId)?.incMs ?? 0;

      if (timerCat === 'Custom') {
        const mins = Math.max(1, Math.min(180, Math.round(customMin)));
        const inc = Math.max(0, Math.min(60, Math.round(customInc)));
        tcId = `custom-${mins}+${inc}`;
        tcLabel = `${mins} | ${inc}`;
        baseMs = mins * 60_000;
        incMs = inc * 1_000;
      }

      await onLaunchChallenge({
        friend: challengingFriend,
        variant,
        timeControlId: tcId,
        timeControlLabel: tcLabel,
        baseMs,
        incMs,
        preferredColor,
      });
      setChallengingFriend(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send challenge.');
    } finally {
      setBusy(false);
    }
  }

  const visiblePresets = TIME_CONTROLS.filter((t) => {
    if (timerCat === 'Bullet') return t.category === 'Bullet';
    if (timerCat === 'Blitz') return t.category === 'Blitz';
    if (timerCat === 'Rapid') return t.category === 'Rapid' || t.category === 'Untimed';
    return false;
  });

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel modal-wide" role="dialog" aria-modal="true" aria-labelledby="friends-modal-title">
        <div className="modal-header">
          <div className="modal-title-row">
            <UsersIcon size={18} />
            <h2 id="friends-modal-title">Friends &amp; Challenges</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close friends panel"
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {!user ? (
          <div className="modal-body">
            <div className="empty-social-box">
              <p className="muted-copy">
                Guests can always play via shareable invite links. Sign in or create a free optional account to save friends and send direct challenges.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onOpenAccount();
                }}
              >
                Sign In or Create Account
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            {error && (
              <div className="inline-alert is-error" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="inline-alert is-info" role="status">
                {notice}
              </div>
            )}

            {social.incomingChallenges.length > 0 && (
              <div className="challenge-inbox">
                <span className="field-label">Incoming Challenges</span>
                {social.incomingChallenges.map((c) => {
                  const vLabel = GAME_VARIANTS.find((v) => v.id === c.variant)?.label || c.variant;
                  return (
                    <div key={c.id} className="social-row is-highlighted">
                      <div className="social-meta">
                        <strong>@{c.fromUsername}</strong>
                        <span className="mono-muted">
                          {vLabel} · {c.timeControlLabel}
                        </span>
                      </div>
                      <div className="social-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          disabled={busy}
                          onClick={() => {
                            void onAcceptChallenge(c).then(onClose);
                          }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          disabled={busy}
                          onClick={() => {
                            void respondDirectChallenge(c.id, 'decline').then(onRefreshSocial);
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <form className="inline-input-row" onSubmit={handleAddFriend}>
              <input
                type="text"
                className="text-input"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                placeholder="Add friend by username"
                aria-label="Friend username"
              />
              <button type="submit" className="btn btn-secondary" disabled={busy || !friendUsername.trim()}>
                Add Friend
              </button>
            </form>

            {social.incomingRequests.length > 0 && (
              <div className="social-block">
                <span className="field-label">Friend Requests</span>
                {social.incomingRequests.map((r) => (
                  <div key={r.id} className="social-row">
                    <span>@{r.fromUsername}</span>
                    <div className="social-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        disabled={busy}
                        onClick={() => void handleRespondRequest(r.id, 'accept')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled={busy}
                        onClick={() => void handleRespondRequest(r.id, 'decline')}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {challengingFriend ? (
              <form className="challenge-composer" onSubmit={handleSendChallenge}>
                <div className="composer-head">
                  <strong>Challenge @{challengingFriend.username}</strong>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setChallengingFriend(null)}
                  >
                    Back
                  </button>
                </div>

                <div className="control-group">
                  <span className="field-label">Game mode</span>
                  <div className="variant-grid">
                    {GAME_VARIANTS.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`preset-btn ${variant === v.id ? 'is-selected' : ''}`}
                        onClick={() => setVariant(v.id)}
                        title={v.shortDesc}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-group">
                  <span className="field-label">Timer</span>
                  <div className="segmented-tabs">
                    {(['Bullet', 'Blitz', 'Rapid', 'Custom'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`seg-tab ${timerCat === cat ? 'is-active' : ''}`}
                        onClick={() => {
                          setTimerCat(cat);
                          if (cat === 'Bullet') setTimeControlId('1+0');
                          if (cat === 'Blitz') setTimeControlId('5+0');
                          if (cat === 'Rapid') setTimeControlId('10+0');
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {timerCat === 'Custom' ? (
                    <div className="custom-timer-row">
                      <label className="custom-timer-field">
                        <span>Minutes</span>
                        <input
                          type="number"
                          className="text-input"
                          min={1}
                          max={180}
                          value={customMin}
                          onChange={(e) => setCustomMin(Number(e.target.value) || 5)}
                        />
                      </label>
                      <label className="custom-timer-field">
                        <span>Increment (s)</span>
                        <input
                          type="number"
                          className="text-input"
                          min={0}
                          max={60}
                          value={customInc}
                          onChange={(e) => setCustomInc(Number(e.target.value) || 0)}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="preset-grid timer-subgrid">
                      {visiblePresets.map((tc) => (
                        <button
                          key={tc.id}
                          type="button"
                          className={`preset-btn ${timeControlId === tc.id ? 'is-selected' : ''}`}
                          onClick={() => setTimeControlId(tc.id)}
                        >
                          {tc.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="control-group">
                  <span className="field-label">Your side</span>
                  <div className="segmented-tabs">
                    {(['random', 'w', 'b'] as const).map((side) => (
                      <button
                        key={side}
                        type="button"
                        className={`seg-tab ${preferredColor === side ? 'is-active' : ''}`}
                        onClick={() => setPreferredColor(side)}
                      >
                        {side === 'random' ? 'Random' : side === 'w' ? 'White' : 'Black'}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Send Challenge &amp; Wait for Friend
                </button>
              </form>
            ) : (
              <div className="social-block">
                <div className="owner-users-header">
                  <span className="field-label">Friends ({social.friends.length})</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => void onRefreshSocial()}
                  >
                    Refresh
                  </button>
                </div>

                <div className="owner-user-list">
                  {social.friends.map((f) => (
                    <div key={f.id} className="social-row">
                      <div className="social-meta">
                        <span className={`status-dot ${f.online ? 'is-live' : 'is-offline'}`} />
                        <strong>@{f.username}</strong>
                        <span className="mono-muted">{f.online ? 'Online' : 'Offline'}</span>
                      </div>
                      <div className="social-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => setChallengingFriend(f)}
                        >
                          Challenge
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs is-danger"
                          disabled={busy}
                          onClick={() => void handleRemove(f)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {social.friends.length === 0 && (
                    <div className="muted-copy">
                      No friends added yet. Enter a friend&apos;s username above to connect.
                    </div>
                  )}
                </div>

                {social.outgoingRequests.length > 0 && (
                  <div className="muted-copy">
                    Pending sent requests: {social.outgoingRequests.map((r) => `@${r.toUsername}`).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
