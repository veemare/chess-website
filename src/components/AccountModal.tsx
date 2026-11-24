import { useEffect, useState, type FormEvent } from 'react';
import {
  claimOwnerAccount,
  fetchOwnerUsers,
  grantTrollAccess,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '../services/api';
import type { PublicUser } from '../types/chess';
import { CloseIcon, ShieldIcon, UserIcon } from './Icons';

interface AccountModalProps {
  open: boolean;
  guestName: string;
  user: PublicUser | null;
  hasOwner: boolean;
  requiresClaimCode: boolean;
  onClose: () => void;
  onGuestNameChange: (name: string) => void;
  onUserUpdated: (user: PublicUser | null, hasOwner?: boolean) => void;
  onOpenOperatorDrawer: () => void;
}

type ModalTab = 'account' | 'owner';
type AuthMode = 'login' | 'register' | 'claim';

function formatCountdown(expiresAt: number | null): string {
  if (!expiresAt) return 'Permanent';
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  const remM = mins % 60;
  if (hrs < 24) return remM > 0 ? `${hrs}h ${remM}m left` : `${hrs}h left`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h left`;
}

export function AccountModal({
  open,
  guestName,
  user,
  hasOwner,
  requiresClaimCode,
  onClose,
  onGuestNameChange,
  onUserUpdated,
  onOpenOperatorDrawer,
}: AccountModalProps) {
  const [tab, setTab] = useState<ModalTab>('account');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [localGuest, setLocalGuest] = useState(guestName);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Owner management state
  const [managedUsers, setManagedUsers] = useState<PublicUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [targetUser, setTargetUser] = useState('');
  const [tempMinutes, setTempMinutes] = useState(60);

  useEffect(() => {
    setLocalGuest(guestName);
  }, [guestName]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNotice(null);
    if (user?.role === 'owner' && tab === 'owner') {
      void loadUsers();
    }
  }, [open, tab, user?.role]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function loadUsers() {
    setUsersLoading(true);
    setError(null);
    try {
      const res = await fetchOwnerUsers();
      setManagedUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load accounts.');
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (authMode === 'login') {
        const res = await loginAccount(username, password);
        onUserUpdated(res.user);
        setPassword('');
        setNotice(`Signed in as @${res.user.username}.`);
      } else if (authMode === 'register') {
        const res = await registerAccount(username, password);
        onUserUpdated(res.user);
        setPassword('');
        setNotice(`Account @${res.user.username} created.`);
      } else {
        const res = await claimOwnerAccount({
          username: user ? undefined : username,
          password: user ? undefined : password,
          claimCode: requiresClaimCode ? claimCode : undefined,
        });
        onUserUpdated(res.user, res.hasOwner);
        setPassword('');
        setClaimCode('');
        setNotice(`Owner privileges bound to @${res.user.username}.`);
        setTab('owner');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError(null);
    try {
      await logoutAccount();
      onUserUpdated(null);
      setTab('account');
      setNotice('Signed out. Playing as Guest.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGrant(
    targetUsername: string,
    mode: 'permanent' | 'temporary' | 'revoke',
    durationMinutes?: number
  ) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await grantTrollAccess({
        username: targetUsername,
        mode,
        durationMinutes,
      });
      setManagedUsers(res.users);
      setTargetUser('');
      if (mode === 'permanent') {
        setNotice(`Granted permanent access to @${res.updated.username}.`);
      } else if (mode === 'temporary') {
        setNotice(`Granted ${durationMinutes}m temporary access to @${res.updated.username}.`);
      } else {
        setNotice(`Revoked access for @${res.updated.username}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permission.');
    } finally {
      setBusy(false);
    }
  }

  function saveGuestName(e: FormEvent) {
    e.preventDefault();
    const cleaned = localGuest.trim().slice(0, 24) || 'Guest';
    onGuestNameChange(cleaned);
    setNotice(`Display name updated to ${cleaned}.`);
  }

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
        <div className="modal-header">
          <div className="modal-title-row">
            <UserIcon size={18} />
            <h2 id="account-modal-title">
              {user ? `@${user.username}` : 'Guest & Optional Account'}
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close account panel"
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {user?.role === 'owner' && (
          <div className="segmented-tabs modal-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'account'}
              className={`seg-tab ${tab === 'account' ? 'is-active' : ''}`}
              onClick={() => setTab('account')}
            >
              Profile
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'owner'}
              className={`seg-tab ${tab === 'owner' ? 'is-active' : ''}`}
              onClick={() => setTab('owner')}
            >
              Owner Console
            </button>
          </div>
        )}

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

        {tab === 'account' && (
          <div className="modal-body">
            {!user ? (
              <>
                <form className="form-section" onSubmit={saveGuestName}>
                  <label className="field-label" htmlFor="guest-callsign-input">
                    Guest display name (no account required)
                  </label>
                  <div className="inline-input-row">
                    <input
                      id="guest-callsign-input"
                      type="text"
                      className="text-input"
                      value={localGuest}
                      maxLength={24}
                      onChange={(e) => setLocalGuest(e.target.value)}
                      placeholder="Guest"
                    />
                    <button type="submit" className="btn btn-secondary">
                      Update
                    </button>
                  </div>
                </form>

                <div className="hairline-divider" />

                <div className="segmented-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'login'}
                    className={`seg-tab ${authMode === 'login' ? 'is-active' : ''}`}
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === 'register'}
                    className={`seg-tab ${authMode === 'register' ? 'is-active' : ''}`}
                    onClick={() => {
                      setAuthMode('register');
                      setError(null);
                    }}
                  >
                    Create Account
                  </button>
                  {!hasOwner && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={authMode === 'claim'}
                      className={`seg-tab ${authMode === 'claim' ? 'is-active' : ''}`}
                      onClick={() => {
                        setAuthMode('claim');
                        setError(null);
                      }}
                    >
                      Claim Owner
                    </button>
                  )}
                </div>

                <form className="form-stack" onSubmit={handleAuthSubmit}>
                  <div>
                    <label className="field-label" htmlFor="auth-username">
                      Username
                    </label>
                    <input
                      id="auth-username"
                      type="text"
                      className="text-input"
                      required
                      minLength={3}
                      maxLength={24}
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="3–24 letters or numbers"
                    />
                  </div>

                  <div>
                    <label className="field-label" htmlFor="auth-password">
                      Password
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      className="text-input"
                      required
                      minLength={6}
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>

                  {authMode === 'claim' && requiresClaimCode && (
                    <div>
                      <label className="field-label" htmlFor="auth-claim-code">
                        Owner setup code
                      </label>
                      <input
                        id="auth-claim-code"
                        type="password"
                        className="text-input"
                        required
                        value={claimCode}
                        onChange={(e) => setClaimCode(e.target.value)}
                        placeholder="Matches OWNER_CLAIM_CODE env var"
                      />
                    </div>
                  )}

                  {authMode === 'claim' && (
                    <p className="muted-copy">
                      Creates the site&apos;s permanent Owner account. Once claimed, no other user can claim ownership.
                    </p>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy
                      ? 'Working…'
                      : authMode === 'login'
                        ? 'Sign In'
                        : authMode === 'register'
                          ? 'Create Optional Account'
                          : 'Claim Owner Account'}
                  </button>
                </form>
              </>
            ) : (
              <div className="profile-summary">
                <div className="profile-row">
                  <span className="muted-copy">Signed in as</span>
                  <strong>@{user.username}</strong>
                </div>
                <div className="profile-row">
                  <span className="muted-copy">Role</span>
                  <span className="mono-badge">
                    {user.role === 'owner' ? 'Owner' : 'Member'}
                  </span>
                </div>

                {user.trollAccess.active && (
                  <div className="profile-row">
                    <span className="muted-copy">Operator privilege</span>
                    <span className="mono-badge is-accent">
                      {user.trollAccess.permanent
                        ? 'Permanent'
                        : formatCountdown(user.trollAccess.expiresAt)}
                    </span>
                  </div>
                )}

                {!hasOwner && (
                  <form className="form-stack" onSubmit={handleAuthSubmit}>
                    {requiresClaimCode && (
                      <input
                        type="password"
                        className="text-input"
                        required
                        value={claimCode}
                        onChange={(e) => setClaimCode(e.target.value)}
                        placeholder="Owner claim code"
                      />
                    )}
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => setAuthMode('claim')}
                    >
                      Claim Site Ownership
                    </button>
                  </form>
                )}

                <div className="profile-actions">
                  {user.trollAccess.active && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        onClose();
                        onOpenOperatorDrawer();
                      }}
                    >
                      <ShieldIcon size={15} />
                      <span>Open Operator Console (Ctrl+Shift+T)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={handleLogout}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'owner' && user?.role === 'owner' && (
          <div className="modal-body">
            <form
              className="owner-grant-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!targetUser.trim()) return;
                void handleGrant(targetUser, 'temporary', tempMinutes);
              }}
            >
              <label className="field-label" htmlFor="grant-target-username">
                Grant troll access by username
              </label>
              <div className="inline-input-row">
                <input
                  id="grant-target-username"
                  type="text"
                  className="text-input"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder="Friend's username"
                />
                <input
                  type="number"
                  className="text-input duration-input"
                  min={1}
                  max={525600}
                  value={tempMinutes}
                  onChange={(e) => setTempMinutes(Math.max(1, Number(e.target.value) || 60))}
                  aria-label="Temporary duration in minutes"
                />
                <span className="muted-unit">min</span>
              </div>
              <div className="grant-preset-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy || !targetUser.trim()}
                  onClick={() => void handleGrant(targetUser, 'permanent')}
                >
                  Grant Permanent
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={busy || !targetUser.trim()}
                >
                  Grant {tempMinutes}m
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy || !targetUser.trim()}
                  onClick={() => void handleGrant(targetUser, 'revoke')}
                >
                  Revoke
                </button>
              </div>
            </form>

            <div className="hairline-divider" />

            <div className="owner-users-header">
              <span className="field-label">Registered accounts ({managedUsers.length})</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void loadUsers()}
                disabled={usersLoading}
              >
                {usersLoading ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            <div className="owner-user-list">
              {managedUsers.map((u) => (
                <div key={u.id} className="owner-user-row">
                  <div className="owner-user-meta">
                    <span className="owner-username">@{u.username}</span>
                    <span
                      className={`mono-badge ${u.trollAccess.active ? 'is-accent' : ''}`}
                    >
                      {u.role === 'owner'
                        ? 'Owner (Perm)'
                        : u.trollAccess.active
                          ? formatCountdown(u.trollAccess.expiresAt)
                          : 'Standard'}
                    </span>
                  </div>
                  {u.role !== 'owner' && (
                    <div className="owner-row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled={busy}
                        onClick={() => void handleGrant(u.username, 'temporary', 60)}
                      >
                        1h
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        disabled={busy}
                        onClick={() => void handleGrant(u.username, 'temporary', 1440)}
                      >
                        24h
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        disabled={busy}
                        onClick={() => void handleGrant(u.username, 'permanent')}
                      >
                        Perm
                      </button>
                      {u.trollAccess.active && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs is-danger"
                          disabled={busy}
                          onClick={() => void handleGrant(u.username, 'revoke')}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {managedUsers.length === 0 && !usersLoading && (
                <div className="muted-copy">No registered accounts yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
