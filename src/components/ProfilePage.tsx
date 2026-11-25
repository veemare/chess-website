import { useEffect, useState, type FormEvent } from 'react';
import { queryEngineAsync } from '../engine/workerClient';
import {
  createGroup,
  deleteGroup,
  fetchGroups,
  fetchLeaderboard,
  fetchUserProfile,
  inviteToGroup,
  joinGroup,
  leaveGroup,
  updateMyProfile,
} from '../services/api';
import type {
  EloCategory,
  GroupRecord,
  LeaderboardEntry,
  PublicUser,
  SavedGameRecord,
  UserProfile,
} from '../types/chess';
import { ChessBoard } from './ChessBoard';
import { TitleBadge } from './TitleBadge';
import { ShieldIcon } from './Icons';

interface ProfilePageProps {
  initialUsername: string | null;
  currentUser: PublicUser | null;
  onCurrentUserUpdated: (user: PublicUser) => void;
  onBackToPlay: () => void;
}

type ProfileTab = 'overview' | 'games' | 'stats' | 'groups' | 'leaderboard';

interface MoveFeedback {
  ply: number;
  san: string;
  label: 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  evalCp: number;
  bestMove: string;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function ProfilePage({
  initialUsername,
  currentUser,
  onCurrentUserUpdated,
  onBackToPlay,
}: ProfilePageProps) {
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [searchInput, setSearchInput] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBio, setEditingBio] = useState(false);
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
  const [groupVisibility, setGroupVisibility] = useState<'public' | 'private'>('public');
  const [inviteInputs, setInviteInputs] = useState<Record<string, string>>({});
  const [groupsBusy, setGroupsBusy] = useState(false);

  // Leaderboard state
  const [lbCategory, setLbCategory] = useState<EloCategory>('rapid');
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);

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
    void fetchLeaderboard(lbCategory).then((r) => setLbEntries(r.entries)).catch(() => undefined);
  }, [initialUsername, currentUser?.username, lbCategory]);

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
      setEditingBio(false);
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
      const res = await createGroup(groupName, groupDesc, groupVisibility);
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

  function renderGameHistoryTable(games: SavedGameRecord[]) {
    if (games.length === 0) {
      return <div className="muted-copy">No completed games recorded yet.</div>;
    }
    return (
      <div className="game-history-table">
        <div className="gh-head">
          <span>Players</span>
          <span>Result</span>
          <span>Review</span>
          <span>Moves</span>
          <span>Date</span>
        </div>
        {games.map((g) => {
          const whiteRes = g.winner === 'w' ? '1' : g.winner === 'b' ? '0' : '½';
          const blackRes = g.winner === 'b' ? '1' : g.winner === 'w' ? '0' : '½';
          return (
            <div key={g.gameId} className="gh-row">
              <div className="gh-players">
                <div className="gh-player-line">
                  <span className="gh-dot is-white" />
                  <TitleBadge title={g.whiteTitle} />
                  <span>{g.whiteUsername}</span>
                </div>
                <div className="gh-player-line">
                  <span className="gh-dot is-black" />
                  <TitleBadge title={g.blackTitle} />
                  <span>{g.blackUsername}</span>
                </div>
              </div>
              <div className="gh-result">
                <span>{whiteRes}</span>
                <span>{blackRes}</span>
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => {
                    setReviewGame(g);
                    setReviewPly(0);
                    setReviewFeedback([]);
                    setTab('games');
                  }}
                >
                  Review
                </button>
              </div>
              <span className="mono-muted">{Math.ceil(g.moves.length / 2)}</span>
              <span className="muted-copy">
                {new Date(g.createdAt).toLocaleDateString()}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-page-inner">
        <div className="profile-topbar">
          <form className="owner-search-row" onSubmit={(e) => void handleSearchSubmit(e)}>
            <input
              type="text"
              className="text-input"
              placeholder="Search any player by username..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              maxLength={24}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBackToPlay}>
            Back to Board
          </button>
        </div>

        {error && <div className="inline-alert is-error">{error}</div>}
        {saveNote && <div className="inline-alert is-info">{saveNote}</div>}

        {profile && (
          <>
            <section className="profile-header-card">
              <div className="profile-avatar-xl">
                {(profile.displayName || profile.username).slice(0, 1).toUpperCase()}
              </div>
              <div className="profile-header-info">
                <div className="profile-name-line">
                  <TitleBadge title={profile.title} />
                  <h1 className="profile-display-name">{profile.displayName}</h1>
                  {profile.role === 'owner' && (
                    <span className="mono-badge is-accent">
                      <ShieldIcon size={11} /> Owner
                    </span>
                  )}
                  {profile.role === 'staff' && (
                    <span className="mono-badge is-accent">Staff</span>
                  )}
                </div>
                <p className="muted-copy">
                  {profile.bio || `@${profile.username}`}
                </p>
                <div className="profile-meta-strip">
                  <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>@{profile.username}</span>
                  <span>·</span>
                  <span>{profile.online ? 'Online now' : 'Offline'}</span>
                </div>
              </div>
              {isOwnProfile && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingBio((v) => !v)}
                >
                  {editingBio ? 'Cancel' : 'Edit Profile'}
                </button>
              )}
            </section>

            {editingBio && isOwnProfile && (
              <form className="profile-edit-card" onSubmit={(e) => void handleSaveOwnProfile(e)}>
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
                    rows={2}
                    placeholder="Write a short bio..."
                  />
                </label>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Profile'}
                </button>
              </form>
            )}

            <nav className="profile-underline-tabs" role="tablist">
              {(['overview', 'games', 'stats', 'groups', 'leaderboard'] as ProfileTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={`profile-utab ${tab === t ? 'is-active' : ''}`}
                  onClick={() => {
                    setTab(t);
                    if (t !== 'games') setReviewGame(null);
                  }}
                >
                  {t === 'overview'
                    ? 'Overview'
                    : t === 'games'
                      ? `Games (${profile.stats.total})`
                      : t === 'stats'
                        ? 'Stats'
                        : t === 'groups'
                          ? `Clans (${groups.length})`
                          : 'Leaderboard'}
                </button>
              ))}
            </nav>

            {tab === 'overview' && (
              <div className="profile-overview-stack">
                <div className="profile-stats-grid">
                  <div className="stat-box">
                    <span className="stat-val">{profile.elo?.bullet ?? 800}</span>
                    <span className="muted-copy">Bullet</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val">{profile.elo?.blitz ?? 800}</span>
                    <span className="muted-copy">Blitz</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val">{profile.elo?.rapid ?? 800}</span>
                    <span className="muted-copy">Rapid</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val">{profile.stats.wins}W / {profile.stats.losses}L</span>
                    <span className="muted-copy">{profile.stats.total} Games</span>
                  </div>
                </div>

                <section className="profile-section-card">
                  <h2>Game History ({profile.recentGames.length})</h2>
                  {renderGameHistoryTable(profile.recentGames)}
                </section>
              </div>
            )}

            {tab === 'games' && !reviewGame && (
              <section className="profile-section-card">
                <h2>Game History ({profile.recentGames.length})</h2>
                {renderGameHistoryTable(profile.recentGames)}
              </section>
            )}

            {tab === 'games' && reviewGame && (
              <section className="profile-section-card">
                <div className="review-layout-full">
                  <div className="review-board-full">
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
              </section>
            )}

            {tab === 'stats' && (
              <section className="profile-section-card">
                <h2>Player Statistics</h2>
                <div className="profile-stats-grid">
                  <div className="stat-box">
                    <span className="stat-val">{profile.stats.total}</span>
                    <span className="muted-copy">Total Games</span>
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
              </section>
            )}

            {tab === 'groups' && (
              <section className="profile-section-card">
                <h2>Clans &amp; Groups (Join Multiple)</h2>
                {currentUser && (
                  <form className="owner-grant-form" onSubmit={(e) => void handleCreateGroup(e)}>
                    <div className="inline-input-row">
                      <input
                        type="text"
                        className="text-input"
                        placeholder="New clan name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        maxLength={40}
                      />
                      <select
                        className="select-input"
                        value={groupVisibility}
                        onChange={(e) =>
                          setGroupVisibility(e.target.value as 'public' | 'private')
                        }
                        aria-label="Clan visibility"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private (Invite Only)</option>
                      </select>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={groupsBusy || groupName.trim().length < 2}
                      >
                        Create Clan
                      </button>
                    </div>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Short clan description (optional)"
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      maxLength={180}
                    />
                  </form>
                )}

                <div className="owner-user-list">
                  {groups.map((g) => {
                    const isMember = currentUser
                      ? g.members.includes(currentUser.username)
                      : false;
                    const isInvited = currentUser
                      ? (g.invites || []).includes(currentUser.username)
                      : false;
                    const canDelete =
                      currentUser &&
                      (currentUser.role === 'owner' ||
                        currentUser.role === 'staff' ||
                        g.ownerUsername === currentUser.username);
                    return (
                      <div key={g.id} className="owner-user-row">
                        <div className="owner-user-meta">
                          <strong>{g.name}</strong>
                          <span className="mono-badge">
                            {g.visibility === 'private' ? 'Private' : 'Public'}
                          </span>
                          <span className="mono-muted">{g.members.length} members</span>
                          {isInvited && <span className="mono-badge is-accent">Invited</span>}
                        </div>
                        <div className="owner-row-actions">
                          {isMember && (
                            <form
                              className="inline-input-row"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const target = (inviteInputs[g.id] || '').trim();
                                if (!target) return;
                                void inviteToGroup(g.id, target)
                                  .then((r) => {
                                    setGroups(r.groups);
                                    setInviteInputs((prev) => ({ ...prev, [g.id]: '' }));
                                  })
                                  .catch((err) =>
                                    setError(
                                      err instanceof Error ? err.message : 'Invite failed.'
                                    )
                                  );
                              }}
                            >
                              <input
                                type="text"
                                className="text-input"
                                placeholder="Invite @user"
                                value={inviteInputs[g.id] || ''}
                                onChange={(e) =>
                                  setInviteInputs((prev) => ({
                                    ...prev,
                                    [g.id]: e.target.value,
                                  }))
                                }
                              />
                              <button type="submit" className="btn btn-secondary btn-xs">
                                Invite
                              </button>
                            </form>
                          )}
                          {currentUser &&
                            (isMember ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() =>
                                  void leaveGroup(g.id).then((r) => setGroups(r.groups))
                                }
                              >
                                Leave
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={() =>
                                  void joinGroup(g.id)
                                    .then((r) => setGroups(r.groups))
                                    .catch((err) =>
                                      setError(
                                        err instanceof Error ? err.message : 'Could not join.'
                                      )
                                    )
                                }
                              >
                                {isInvited ? 'Accept Invite' : 'Join'}
                              </button>
                            ))}
                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs is-danger"
                              onClick={() =>
                                void deleteGroup(g.id).then((r) => setGroups(r.groups))
                              }
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {groups.length === 0 && (
                    <div className="muted-copy">No clans created yet.</div>
                  )}
                </div>
              </section>
            )}

            {tab === 'leaderboard' && (
              <section className="profile-section-card">
                <h2>Elo Leaderboard</h2>
                <div className="segmented-tabs" role="tablist">
                  {(['bullet', 'blitz', 'rapid', 'classical'] as EloCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={lbCategory === cat}
                      className={`seg-tab ${lbCategory === cat ? 'is-active' : ''}`}
                      onClick={() => setLbCategory(cat)}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="leaderboard-table">
                  {lbEntries.map((entry, idx) => (
                    <div key={entry.username} className="lb-row">
                      <span className="lb-rank">#{idx + 1}</span>
                      <div className="gh-player-line">
                        <TitleBadge title={entry.title} />
                        <strong>{entry.displayName}</strong>
                        <span className="muted-copy">@{entry.username}</span>
                      </div>
                      <span className="lb-rating">{entry.rating}</span>
                    </div>
                  ))}
                  {lbEntries.length === 0 && (
                    <div className="muted-copy">No ranked players yet.</div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
