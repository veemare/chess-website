import { useEffect, useState, type FormEvent } from 'react';
import { queryEngineAsync } from '../engine/workerClient';
import {
  createGroup,
  deleteGroup,
  fetchGroups,
  fetchUserProfile,
  joinGroup,
  leaveGroup,
  updateMyProfile,
} from '../services/api';
import type { GroupRecord, PublicUser, SavedGameRecord, UserProfile } from '../types/chess';
import { ChessBoard } from './ChessBoard';
import { TitleBadge } from './TitleBadge';
import { CloseIcon, ShieldIcon, UsersIcon } from './Icons';

interface ProfileModalProps {
  open: boolean;
  initialUsername: string | null;
  currentUser: PublicUser | null;
  onClose: () => void;
  onCurrentUserUpdated: (user: PublicUser) => void;
}

type ProfileTab = 'overview' | 'games' | 'groups';

interface MoveFeedback {
  ply: number;
  san: string;
  label: 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  evalCp: number;
  bestMove: string;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function ProfileModal({
  open,
  initialUsername,
  currentUser,
  onClose,
  onCurrentUserUpdated,
}: ProfileModalProps) {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [searchInput, setSearchInput] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioInput, setBioInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  // Game Review state
  const [reviewGame, setReviewGame] = useState<SavedGameRecord | null>(null);
  const [reviewPly, setReviewPly] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState<MoveFeedback[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Groups state
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupsBusy, setGroupsBusy] = useState(false);

  async function loadProfile(username: string) {
    const clean = username.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setSaveNote(null);
    try {
      const res = await fetchUserProfile(clean);
      setProfile(res.profile);
      setBioInput(res.profile.bio || '');
      setDisplayNameInput(res.profile.displayName || res.profile.username);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : 'Profile not found.');
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupsList() {
    try {
      const res = await fetchGroups();
      setGroups(res.groups);
    } catch {
      // Ignore transient group load error
    }
  }

  useEffect(() => {
    if (!open) return;
    setReviewGame(null);
    setReviewFeedback([]);
    const target = initialUsername || currentUser?.username || '';
    setSearchInput(target);
    if (target) {
      void loadProfile(target);
    } else {
      setProfile(null);
      setError(null);
    }
    void loadGroupsList();
  }, [open, initialUsername, currentUser?.username]);

  if (!open) return null;

  const isOwnProfile = Boolean(currentUser && profile && currentUser.id === profile.id);

  async function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setReviewGame(null);
    await loadProfile(searchInput);
  }

  async function handleSaveOwnProfile(e: FormEvent) {
    e.preventDefault();
    if (!isOwnProfile) return;
    setSaving(true);
    setSaveNote(null);
    setError(null);
    try {
      const res = await updateMyProfile({
        bio: bioInput,
        displayName: displayNameInput,
      });
      onCurrentUserUpdated(res.user);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              bio: res.user.bio,
              displayName: res.user.displayName,
            }
          : prev
      );
      setSaveNote('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRunStockfishReview() {
    if (!reviewGame || analyzing) return;
    setAnalyzing(true);
    setReviewFeedback([]);
    try {
      const results: MoveFeedback[] = [];
      let prevEval = 0;
      for (let i = 0; i < reviewGame.moves.length; i++) {
        const move = reviewGame.moves[i];
        const fenBefore = i === 0 ? START_FEN : reviewGame.moves[i - 1].fen;
        const bestBefore = await queryEngineAsync(fenBefore, 'best', 2);
        const afterEvalRes = await queryEngineAsync(move.fen, 'best', 2);
        const rawEval = afterEvalRes?.evalCp ?? prevEval;
        const isWhiteMove = i % 2 === 0;
        const delta = isWhiteMove ? rawEval - prevEval : prevEval - rawEval;

        let label: MoveFeedback['label'] = 'Good';
        if (bestBefore && bestBefore.from === move.from && bestBefore.to === move.to) {
          label = 'Best';
        } else if (delta <= -220) {
          label = 'Blunder';
        } else if (delta <= -110) {
          label = 'Mistake';
        } else if (delta <= -50) {
          label = 'Inaccuracy';
        }

        results.push({
          ply: i + 1,
          san: move.san,
          label,
          evalCp: rawEval,
          bestMove: bestBefore ? `${bestBefore.from}->${bestBefore.to}` : move.san,
        });
        prevEval = rawEval;
      }
      setReviewFeedback(results);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setGroupsBusy(true);
    setError(null);
    try {
      const res = await createGroup(groupName, groupDesc);
      setGroups(res.groups);
      setGroupName('');
      setGroupDesc('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create group.');
    } finally {
      setGroupsBusy(false);
    }
  }

  const currentReviewFen =
    reviewGame && reviewPly > 0
      ? reviewGame.moves[reviewPly - 1]?.fen || START_FEN
      : START_FEN;
  const currentReviewMove =
    reviewGame && reviewPly > 0 ? reviewGame.moves[reviewPly - 1] : null;
  const activeFeedback = reviewFeedback.find((f) => f.ply === reviewPly) || null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Player Profile">
      <div className="modal-card profile-modal-card is-wide">
        <div className="modal-header">
          <div className="modal-title-group">
            <UsersIcon size={18} />
            <h2>Player Profile</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close profile"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <form className="owner-search-row" onSubmit={(e) => void handleSearchSubmit(e)}>
          <input
            type="text"
            className="text-input"
            placeholder="Look up any username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={24}
          />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'overview'}
            className={`seg-tab ${tab === 'overview' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('overview');
              setReviewGame(null);
            }}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'games'}
            className={`seg-tab ${tab === 'games' ? 'is-active' : ''}`}
            onClick={() => setTab('games')}
          >
            Games ({profile?.stats.total ?? 0})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'groups'}
            className={`seg-tab ${tab === 'groups' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('groups');
              setReviewGame(null);
            }}
          >
            Groups ({groups.length})
          </button>
        </div>

        {error && <div className="inline-alert is-error">{error}</div>}
        {saveNote && <div className="inline-alert is-info">{saveNote}</div>}

        {tab === 'overview' && profile && (
          <div className="profile-detail-card">
            <div className="profile-hero-row">
              <div className="profile-avatar-lg">
                {(profile.displayName || profile.username).slice(0, 1).toUpperCase()}
              </div>
              <div className="profile-hero-meta">
                <div className="profile-name-line">
                  <TitleBadge title={profile.title} />
                  <strong>{profile.displayName}</strong>
                  {profile.role === 'owner' && (
                    <span className="mono-badge is-accent">
                      <ShieldIcon size={11} /> Owner
                    </span>
                  )}
                  {profile.role === 'staff' && (
                    <span className="mono-badge is-accent">Staff</span>
                  )}
                </div>
                <div className="muted-copy">
                  @{profile.username} · {profile.online ? 'Online now' : 'Offline'} · Joined{' '}
                  {new Date(profile.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="stat-box">
                <span className="stat-val">{profile.stats.total}</span>
                <span className="muted-copy">Games</span>
              </div>
              <div className="stat-box">
                <span className="stat-val">{profile.stats.wins}</span>
                <span className="muted-copy">Wins</span>
              </div>
              <div className="stat-box">
                <span className="stat-val">{profile.stats.losses}</span>
                <span className="muted-copy">Losses</span>
              </div>
              <div className="stat-box">
                <span className="stat-val">{profile.stats.draws}</span>
                <span className="muted-copy">Draws</span>
              </div>
            </div>

            {isOwnProfile ? (
              <form className="auth-form" onSubmit={(e) => void handleSaveOwnProfile(e)}>
                <label className="field-label">
                  Display Name
                  <input
                    type="text"
                    className="text-input"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    minLength={2}
                    maxLength={24}
                  />
                </label>
                <label className="field-label">
                  Bio
                  <textarea
                    className="text-input profile-bio-input"
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={240}
                    rows={3}
                    placeholder="Write a short bio for your profile..."
                  />
                </label>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </form>
            ) : (
              <div className="profile-bio-box">
                <span className="field-label">Bio</span>
                <p className="muted-copy">
                  {profile.bio ? profile.bio : 'No bio added yet.'}
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'games' && profile && !reviewGame && (
          <div className="profile-games-list">
            {profile.recentGames.length === 0 ? (
              <div className="muted-copy">No completed games recorded yet.</div>
            ) : (
              profile.recentGames.map((g) => (
                <div key={g.gameId} className="social-row">
                  <div className="social-meta">
                    <TitleBadge title={g.whiteTitle} />
                    <strong>{g.whiteUsername}</strong>
                    <span className="muted-copy">vs</span>
                    <TitleBadge title={g.blackTitle} />
                    <strong>{g.blackUsername}</strong>
                    <span className="mono-muted">
                      {g.moves.length} ply · {g.timeControlLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => {
                      setReviewGame(g);
                      setReviewPly(0);
                      setReviewFeedback([]);
                    }}
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'games' && reviewGame && (
          <div className="review-layout">
            <div className="review-board-wrap">
              <ChessBoard
                fen={currentReviewFen}
                orientation="w"
                playerColor="w"
                turnColor={reviewPly % 2 === 0 ? 'w' : 'b'}
                canInteract={false}
                isGameOver={true}
                inCheckColor={null}
                lastMove={
                  currentReviewMove
                    ? { from: currentReviewMove.from, to: currentReviewMove.to }
                    : null
                }
                pendingPromotion={null}
                hintArrow={null}
                evalCp={activeFeedback ? activeFeedback.evalCp : null}
                showEvalBar={Boolean(activeFeedback)}
                armedTroll={null}
                canTroll={false}
                cursesReceived={null}
                onAttemptMove={() => undefined}
                onSelectPromotion={() => undefined}
                onCancelPromotion={() => undefined}
                onTrollSquareClick={() => undefined}
              />
            </div>

            <div className="review-controls-col">
              <div className="review-nav-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setReviewPly(0)}
                >
                  |&lt;
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setReviewPly((p) => Math.max(0, p - 1))}
                >
                  &lt;
                </button>
                <span className="mono-muted">
                  Move {reviewPly}/{reviewGame.moves.length}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() =>
                    setReviewPly((p) => Math.min(reviewGame.moves.length, p + 1))
                  }
                >
                  &gt;
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setReviewPly(reviewGame.moves.length)}
                >
                  &gt;|
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={analyzing}
                onClick={() => void handleRunStockfishReview()}
              >
                {analyzing ? 'Analyzing with Stockfish…' : 'Run Stockfish Review'}
              </button>

              {activeFeedback && (
                <div className="inline-alert is-info">
                  <strong>
                    {activeFeedback.san}: {activeFeedback.label}
                  </strong>{' '}
                  (Eval: {(activeFeedback.evalCp / 100).toFixed(2)}, Best:{' '}
                  {activeFeedback.bestMove})
                </div>
              )}

              <div className="review-moves-scroll">
                {reviewGame.moves.map((m, idx) => {
                  const fb = reviewFeedback.find((f) => f.ply === idx + 1);
                  return (
                    <button
                      key={`${idx}-${m.san}`}
                      type="button"
                      className={`review-move-chip ${reviewPly === idx + 1 ? 'is-active' : ''}`}
                      onClick={() => setReviewPly(idx + 1)}
                    >
                      <span>
                        {Math.floor(idx / 2) + 1}
                        {idx % 2 === 0 ? '.' : '...'} {m.san}
                      </span>
                      {fb && (
                        <span className={`fb-tag fb-${fb.label.toLowerCase()}`}>
                          {fb.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setReviewGame(null)}
              >
                Back to Games
              </button>
            </div>
          </div>
        )}

        {tab === 'groups' && (
          <div className="groups-tab">
            {currentUser && (
              <form className="owner-grant-form" onSubmit={(e) => void handleCreateGroup(e)}>
                <div className="inline-input-row">
                  <input
                    type="text"
                    className="text-input"
                    placeholder="New group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={40}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={groupsBusy || groupName.trim().length < 2}
                  >
                    Create Group
                  </button>
                </div>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Short group description (optional)"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  maxLength={180}
                />
              </form>
            )}

            <div className="owner-user-list">
              {groups.map((g) => {
                const isMember = currentUser ? g.members.includes(currentUser.username) : false;
                const canDelete =
                  currentUser &&
                  (currentUser.role === 'owner' ||
                    currentUser.role === 'staff' ||
                    g.ownerUsername === currentUser.username);
                return (
                  <div key={g.id} className="owner-user-row">
                    <div className="owner-user-meta">
                      <strong>{g.name}</strong>
                      <span className="mono-muted">{g.members.length} members</span>
                    </div>
                    <div className="owner-row-actions">
                      {currentUser &&
                        (isMember ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => void leaveGroup(g.id).then((r) => setGroups(r.groups))}
                          >
                            Leave
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => void joinGroup(g.id).then((r) => setGroups(r.groups))}
                          >
                            Join
                          </button>
                        ))}
                      {canDelete && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs is-danger"
                          onClick={() => void deleteGroup(g.id).then((r) => setGroups(r.groups))}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {groups.length === 0 && <div className="muted-copy">No groups created yet.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
