import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteGroup,
  fetchGroups,
  fetchOwnerUsers,
  setOwnerUserStaff,
  setOwnerUserTitle,
} from '../services/api';
import type { GroupRecord, PublicUser } from '../types/chess';
import { CloseIcon, ShieldIcon } from './Icons';
import { TitleBadge } from './TitleBadge';

interface StaffModalProps {
  open: boolean;
  user: PublicUser | null;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
}

export function StaffModal({ open, user, onClose, onOpenProfile }: StaffModalProps) {
  const [tab, setTab] = useState<'users' | 'clans'>('users');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadUsers(q = search) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOwnerUsers(q);
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  async function loadClans() {
    try {
      const res = await fetchGroups();
      setGroups(res.groups);
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadUsers('');
    void loadClans();
  }, [open]);

  if (!open || !user || (user.role !== 'owner' && user.role !== 'staff')) return null;

  const isOwner = user.role === 'owner';

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    await loadUsers(search);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Staff Dashboard">
      <div className="modal-card profile-modal-card is-wide">
        <div className="modal-header">
          <div className="modal-title-group">
            <ShieldIcon size={18} />
            <h2>Staff Dashboard</h2>
            <span className="mono-badge is-accent">
              {isOwner ? 'Owner' : 'Staff'}
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close staff dashboard">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'users'}
            className={`seg-tab ${tab === 'users' ? 'is-active' : ''}`}
            onClick={() => setTab('users')}
          >
            User Directory ({users.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'clans'}
            className={`seg-tab ${tab === 'clans' ? 'is-active' : ''}`}
            onClick={() => setTab('clans')}
          >
            Clan Moderation ({groups.length})
          </button>
        </div>

        {error && <div className="inline-alert is-error">{error}</div>}
        {notice && <div className="inline-alert is-info">{notice}</div>}

        {tab === 'users' && (
          <div className="modal-body">
            <form className="owner-search-row" onSubmit={(e) => void handleSearch(e)}>
              <input
                type="text"
                className="text-input"
                placeholder="Search users by username or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
                {loading ? 'Searching…' : 'Search'}
              </button>
            </form>

            <div className="owner-user-list">
              {users.map((u) => (
                <div key={u.id} className="owner-user-row">
                  <div className="owner-user-meta">
                    <TitleBadge title={u.title} />
                    <strong>@{u.username}</strong>
                    <span className="mono-badge">{u.role}</span>
                    <span className="mono-muted">R:{u.elo?.rapid ?? 800}</span>
                  </div>
                  <div className="owner-row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        onClose();
                        onOpenProfile(u.username);
                      }}
                    >
                      Profile
                    </button>
                    {isOwner && u.role !== 'owner' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() =>
                            void setOwnerUserStaff(
                              u.username,
                              u.role === 'staff' ? 'user' : 'staff'
                            ).then((r) => {
                              setUsers(r.users);
                              setNotice(`Updated @${u.username} role.`);
                            })
                          }
                        >
                          {u.role === 'staff' ? 'Unstaff' : 'Make Staff'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() =>
                            void setOwnerUserTitle(u.username, u.title ? null : 'VIP').then((r) => {
                              setUsers(r.users);
                              setNotice(`Updated @${u.username} title.`);
                            })
                          }
                        >
                          {u.title ? 'Clear Title' : 'Give VIP'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'clans' && (
          <div className="modal-body">
            <div className="owner-user-list">
              {groups.map((g) => (
                <div key={g.id} className="owner-user-row">
                  <div className="owner-user-meta">
                    <strong>{g.name}</strong>
                    <span className="mono-badge">{g.visibility}</span>
                    <span className="mono-muted">{g.members.length} members</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs is-danger"
                    onClick={() =>
                      void deleteGroup(g.id).then((r) => {
                        setGroups(r.groups);
                        setNotice(`Deleted clan "${g.name}".`);
                      })
                    }
                  >
                    Delete Clan
                  </button>
                </div>
              ))}
              {groups.length === 0 && <div className="muted-copy">No clans found.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
