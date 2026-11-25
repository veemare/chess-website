import type {
  DirectChallengeSummary,
  GameVariant,
  LiveWatchGameFull,
  LiveWatchGameSummary,
  PieceColor,
  PublicUser,
  SocialStateResponse,
  WatchFilterMode,
} from '../types/chess';

const TOKEN_STORAGE_KEY = 'vesper64_session_token';

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !headers['content-type']) {
    headers['content-type'] = 'application/json';
  }
  if (token && !headers['authorization']) {
    headers['authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export interface AuthMeResponse {
  user: PublicUser | null;
  hasOwner: boolean;
  requiresClaimCode: boolean;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  return apiFetch<AuthMeResponse>('/auth/me');
}

export async function registerAccount(
  username: string,
  password: string,
  skillLevel: import('../types/chess').SkillLevel = 'basics'
): Promise<{ user: PublicUser }> {
  const res = await apiFetch<{ user: PublicUser; token?: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, skillLevel }),
  });
  if (res.token) setStoredToken(res.token);
  return { user: res.user };
}

export async function loginAccount(
  username: string,
  password: string
): Promise<{ user: PublicUser }> {
  const res = await apiFetch<{ user: PublicUser; token?: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (res.token) setStoredToken(res.token);
  return { user: res.user };
}

export async function logoutAccount(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
  setStoredToken(null);
}

export async function claimOwnerAccount(input: {
  username?: string;
  password?: string;
  claimCode?: string;
}): Promise<{ user: PublicUser; hasOwner: boolean }> {
  const res = await apiFetch<{ user: PublicUser; hasOwner: boolean; token?: string }>(
    '/auth/claim-owner',
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  if (res.token) setStoredToken(res.token);
  return { user: res.user, hasOwner: res.hasOwner };
}

export async function fetchOwnerUsers(query?: string): Promise<{ users: PublicUser[] }> {
  const qs = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  return apiFetch<{ users: PublicUser[] }>(`/owner/users${qs}`);
}

export async function setOwnerUserTitle(
  username: string,
  title: string | null
): Promise<{ updated: PublicUser; users: PublicUser[] }> {
  return apiFetch<{ updated: PublicUser; users: PublicUser[] }>('/owner/title', {
    method: 'POST',
    body: JSON.stringify({ username, title }),
  });
}

export async function fetchUserProfile(username: string): Promise<{ profile: import('../types/chess').UserProfile }> {
  return apiFetch<{ profile: import('../types/chess').UserProfile }>(
    `/profile?username=${encodeURIComponent(username.trim())}`
  );
}

export async function updateMyProfile(input: {
  bio?: string;
  displayName?: string;
}): Promise<{ user: PublicUser }> {
  return apiFetch<{ user: PublicUser }>('/profile/update', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function setOwnerUserStaff(
  username: string,
  role: 'staff' | 'user'
): Promise<{ updated: PublicUser; users: PublicUser[] }> {
  return apiFetch<{ updated: PublicUser; users: PublicUser[] }>('/owner/staff', {
    method: 'POST',
    body: JSON.stringify({ username, role }),
  });
}

export async function saveCompletedGame(
  payload: Omit<import('../types/chess').SavedGameRecord, 'createdAt'>
): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>('/games/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchGroups(): Promise<{ groups: import('../types/chess').GroupRecord[] }> {
  return apiFetch<{ groups: import('../types/chess').GroupRecord[] }>('/groups');
}

export async function createGroup(
  name: string,
  description: string
): Promise<{ group: import('../types/chess').GroupRecord; groups: import('../types/chess').GroupRecord[] }> {
  return apiFetch('/groups/create', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export async function joinGroup(groupId: string): Promise<{ groups: import('../types/chess').GroupRecord[] }> {
  return apiFetch('/groups/join', {
    method: 'POST',
    body: JSON.stringify({ groupId }),
  });
}

export async function leaveGroup(groupId: string): Promise<{ groups: import('../types/chess').GroupRecord[] }> {
  return apiFetch('/groups/leave', {
    method: 'POST',
    body: JSON.stringify({ groupId }),
  });
}

export async function deleteGroup(groupId: string): Promise<{ groups: import('../types/chess').GroupRecord[] }> {
  return apiFetch('/groups/delete', {
    method: 'POST',
    body: JSON.stringify({ groupId }),
  });
}

export async function grantTrollAccess(input: {
  username: string;
  mode: 'permanent' | 'temporary' | 'revoke';
  durationMinutes?: number;
}): Promise<{ updated: PublicUser; users: PublicUser[] }> {
  return apiFetch<{ updated: PublicUser; users: PublicUser[] }>('/owner/troll-grant', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function postRoomRelayEvent(
  code: string,
  senderId: string,
  payload: unknown
): Promise<void> {
  await apiFetch('/room', {
    method: 'POST',
    body: JSON.stringify({ code, senderId, payload }),
  });
}

export async function fetchRoomRelayEvents(
  code: string,
  after: number
): Promise<{ events: Array<{ seq: number; senderId: string; payload: unknown }>; nextSeq: number }> {
  const params = new URLSearchParams({ code, after: String(after) });
  return apiFetch(`/room?${params.toString()}`);
}

export async function fetchSocialState(): Promise<SocialStateResponse> {
  return apiFetch<SocialStateResponse>('/social/state');
}

export async function sendFriendRequest(
  username: string
): Promise<{ autoAccepted?: boolean; targetUsername?: string }> {
  return apiFetch('/social/friend-request', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export async function respondFriendRequest(
  requestId: string,
  action: 'accept' | 'decline'
): Promise<void> {
  await apiFetch('/social/friend-respond', {
    method: 'POST',
    body: JSON.stringify({ requestId, action }),
  });
}

export async function removeFriend(friendUserId: string): Promise<void> {
  await apiFetch('/social/friend-remove', {
    method: 'POST',
    body: JSON.stringify({ friendUserId }),
  });
}

export async function sendDirectChallenge(input: {
  toUserId: string;
  roomCode: string;
  variant: GameVariant;
  timeControlId: string;
  timeControlLabel: string;
  baseMs: number;
  incMs: number;
  hostColor: PieceColor;
}): Promise<{ challenge: DirectChallengeSummary }> {
  return apiFetch<{ challenge: DirectChallengeSummary }>('/social/challenge', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function respondDirectChallenge(
  challengeId: string,
  action: 'accept' | 'decline' | 'cancel'
): Promise<{ challenge: DirectChallengeSummary }> {
  return apiFetch<{ challenge: DirectChallengeSummary }>('/social/challenge-respond', {
    method: 'POST',
    body: JSON.stringify({ challengeId, action }),
  });
}

export async function publishWatchGame(payload: {
  gameId: string;
  mode: 'pvp' | 'bot';
  whiteName: string;
  blackName: string;
  variant: GameVariant;
  timeControlLabel: string;
  baseMs: number;
  incMs: number;
  fen: string;
  moves: unknown[];
  lastMove: { from: string; to: string } | null;
  whiteMs: number;
  blackMs: number;
  whiteChecks: number;
  blackChecks: number;
  lastTickAt: number | null;
  status: string;
  statusReason: string | null;
}): Promise<void> {
  await apiFetch('/watch/publish', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchWatchGames(
  filter: WatchFilterMode
): Promise<{ games: LiveWatchGameSummary[] }> {
  const params = new URLSearchParams({ filter });
  return apiFetch(`/watch/list?${params.toString()}`);
}

export async function fetchWatchGame(gameId: string): Promise<{ game: LiveWatchGameFull }> {
  const params = new URLSearchParams({ id: gameId });
  return apiFetch(`/watch/game?${params.toString()}`);
}

export async function removeWatchGame(gameId: string): Promise<void> {
  await apiFetch('/watch/remove', {
    method: 'POST',
    body: JSON.stringify({ gameId }),
  });
}
