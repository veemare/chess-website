import { useEffect, useState, type FormEvent } from 'react';
import { fetchUserProfile, updateMyProfile } from '../services/api';
import type { PublicUser, UserProfile } from '../types/chess';
import { TitleBadge } from './TitleBadge';
import { CloseIcon, ShieldIcon, UsersIcon } from './Icons';

interface ProfileModalProps {
  open: boolean;
  initialUsername: string | null;
  currentUser: PublicUser | null;
  onClose: () => void;
  onCurrentUserUpdated: (user: PublicUser) => void;
}

export function ProfileModal({
  open,
  initialUsername,
  currentUser,
  onClose,
  onCurrentUserUpdated,
}: ProfileModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioInput, setBioInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

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

  useEffect(() => {
    if (!open) return;
    const target = initialUsername || currentUser?.username || '';
    setSearchInput(target);
    if (target) {
      void loadProfile(target);
    } else {
      setProfile(null);
      setError(null);
    }
  }, [open, initialUsername, currentUser?.username]);

  if (!open) return null;

  const isOwnProfile = Boolean(currentUser && profile && currentUser.id === profile.id);

  async function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
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

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Player Profile">
      <div className="modal-card profile-modal-card">
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

        {error && <div className="inline-alert is-error">{error}</div>}
        {saveNote && <div className="inline-alert is-info">{saveNote}</div>}

        {profile && (
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
                </div>
                <div className="muted-copy">
                  @{profile.username} · {profile.online ? 'Online now' : 'Offline'} · Joined{' '}
                  {new Date(profile.createdAt).toLocaleDateString()}
                </div>
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
      </div>
    </div>
  );
}
