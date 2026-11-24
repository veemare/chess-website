import type { PublicUser } from '../types/chess';

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
  password: string
): Promise<{ user: PublicUser }> {
  const res = await apiFetch<{ user: PublicUser; token?: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
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

export async function fetchOwnerUsers(): Promise<{ users: PublicUser[] }> {
  return apiFetch<{ users: PublicUser[] }>('/owner/users');
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
