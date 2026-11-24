import crypto from 'node:crypto';

export interface TrollGrant {
  permanent: boolean;
  expiresAt: number | null;
  grantedBy: string | null;
  grantedAt: number | null;
}

export interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  role: 'owner' | 'user';
  title?: string | null;
  bio?: string;
  createdAt: number;
  trollGrant: TrollGrant;
}

export interface TrollAccessSummary {
  active: boolean;
  permanent: boolean;
  expiresAt: number | null;
  grantedBy: string | null;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: 'owner' | 'user';
  title: string | null;
  bio: string;
  createdAt: number;
  trollAccess: TrollAccessSummary;
}

export interface FriendRequestRecord {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  createdAt: number;
}

export interface DirectChallengeRecord {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  roomCode: string;
  variant: string;
  timeControlId: string;
  timeControlLabel: string;
  baseMs: number;
  incMs: number;
  hostColor: 'w' | 'b';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: number;
}

export interface DatabaseState {
  secret: string;
  ownerId: string | null;
  users: Record<string, StoredUser>;
  friends: Record<string, string[]>;
  friendRequests: FriendRequestRecord[];
  challenges: DirectChallengeRecord[];
  presence: Record<string, number>;
}

export interface RoomEventRecord {
  seq: number;
  senderId: string;
  ts: number;
  payload: unknown;
}

export interface RoomRelayState {
  updatedAt: number;
  nextSeq: number;
  events: RoomEventRecord[];
}

export interface StoreAdapter {
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T): Promise<void>;
}

export interface ApiRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string | undefined>;
  bodyText: string;
  isHttps: boolean;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const DB_KEY = 'db_v1';
const WATCH_KEY = 'watch_v1';
const SESSION_COOKIE = 'vesper_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const WATCH_ACTIVE_TTL_MS = 5 * 60 * 1000;
const WATCH_ENDED_TTL_MS = 90 * 1000;
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;

export interface LiveWatchGameRecord {
  gameId: string;
  mode: 'pvp' | 'bot';
  whiteName: string;
  blackName: string;
  variant: string;
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
  updatedAt: number;
}

function jsonResponse(
  status: number,
  data: unknown,
  extraHeaders: Record<string, string> = {}
): ApiResponse {
  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHex: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function signSession(uid: string, secret: string): string {
  const payloadObj = { uid, exp: Date.now() + SESSION_TTL_MS };
  const payload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySession(token: string, secret: string): { uid: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqualString(sig, expectedSig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) return null;
    return { uid: parsed.uid };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function makeCookieHeader(token: string | null, isHttps: boolean): string {
  const attrs = [
    `${SESSION_COOKIE}=${token ? encodeURIComponent(token) : ''}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    token ? `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}` : 'Max-Age=0',
  ];
  if (isHttps) attrs.push('Secure');
  return attrs.join('; ');
}

export function resolveTrollAccess(user: StoredUser, now = Date.now()): TrollAccessSummary {
  if (user.role === 'owner') {
    return {
      active: true,
      permanent: true,
      expiresAt: null,
      grantedBy: 'system',
    };
  }
  if (user.trollGrant.permanent) {
    return {
      active: true,
      permanent: true,
      expiresAt: null,
      grantedBy: user.trollGrant.grantedBy,
    };
  }
  if (user.trollGrant.expiresAt !== null && user.trollGrant.expiresAt > now) {
    return {
      active: true,
      permanent: false,
      expiresAt: user.trollGrant.expiresAt,
      grantedBy: user.trollGrant.grantedBy,
    };
  }
  return {
    active: false,
    permanent: false,
    expiresAt: null,
    grantedBy: null,
  };
}

function toPublicUser(user: StoredUser, now = Date.now()): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    title: user.title?.trim() || null,
    bio: user.bio || '',
    createdAt: user.createdAt,
    trollAccess: resolveTrollAccess(user, now),
  };
}

async function loadDatabase(store: StoreAdapter): Promise<DatabaseState> {
  let db = await store.getJson<DatabaseState>(DB_KEY);
  let dirty = false;

  if (!db) {
    db = {
      secret: crypto.randomBytes(32).toString('hex'),
      ownerId: null,
      users: {},
      friends: {},
      friendRequests: [],
      challenges: [],
      presence: {},
    };
    dirty = true;
  }

  if (!db.friends) {
    db.friends = {};
    dirty = true;
  }
  if (!db.friendRequests) {
    db.friendRequests = [];
    dirty = true;
  }
  if (!db.challenges) {
    db.challenges = [];
    dirty = true;
  }
  if (!db.presence) {
    db.presence = {};
    dirty = true;
  }

  const envOwnerUser = process.env.OWNER_USERNAME?.trim();
  const envOwnerPass = process.env.OWNER_PASSWORD;
  if (!db.ownerId && envOwnerUser && envOwnerPass && envOwnerPass.length >= 6) {
    const key = normalizeUsername(envOwnerUser);
    if (USERNAME_RE.test(key) && !db.users[key]) {
      const salt = crypto.randomBytes(16).toString('hex');
      const id = crypto.randomUUID();
      db.users[key] = {
        id,
        username: key,
        displayName: envOwnerUser,
        passwordHash: hashPassword(envOwnerPass, salt),
        salt,
        role: 'owner',
        createdAt: Date.now(),
        trollGrant: {
          permanent: true,
          expiresAt: null,
          grantedBy: 'env',
          grantedAt: Date.now(),
        },
      };
      db.ownerId = id;
      dirty = true;
    }
  }

  if (dirty) {
    await store.setJson(DB_KEY, db);
  }
  return db;
}

function getEffectiveSecret(db: DatabaseState): string {
  return process.env.AUTH_SECRET?.trim() || db.secret;
}

function findUserBySession(db: DatabaseState, req: ApiRequest): StoredUser | null {
  const cookies = parseCookies(req.headers['cookie']);
  const bearer = req.headers['authorization']?.replace(/^Bearer\s+/i, '').trim();
  const token = cookies[SESSION_COOKIE] || bearer;
  if (!token) return null;
  const verified = verifySession(token, getEffectiveSecret(db));
  if (!verified) return null;
  return Object.values(db.users).find((u) => u.id === verified.uid) || null;
}

function parseBody<T>(req: ApiRequest): T | null {
  if (!req.bodyText) return {} as T;
  try {
    return JSON.parse(req.bodyText) as T;
  } catch {
    return null;
  }
}

function createStoredUser(
  rawUsername: string,
  password: string,
  role: 'owner' | 'user'
): StoredUser {
  const username = normalizeUsername(rawUsername);
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    id: crypto.randomUUID(),
    username,
    displayName: rawUsername.trim(),
    passwordHash: hashPassword(password, salt),
    salt,
    role,
    createdAt: Date.now(),
    trollGrant: {
      permanent: role === 'owner',
      expiresAt: null,
      grantedBy: role === 'owner' ? 'system' : null,
      grantedAt: role === 'owner' ? Date.now() : null,
    },
  };
}

export async function handleApiRequest(
  req: ApiRequest,
  store: StoreAdapter
): Promise<ApiResponse> {
  const path = req.path.replace(/\/+$/, '') || '/';
  const method = req.method.toUpperCase();

  if (method === 'OPTIONS') {
    return { status: 204, headers: { 'cache-control': 'no-store' }, body: '' };
  }

  if (method === 'GET' && path === '/health') {
    return jsonResponse(200, { ok: true, timestamp: Date.now() });
  }

  if (path === '/room') {
    const code = (req.query.get('code') || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (method === 'GET') {
      if (!code || code.length < 4 || code.length > 24) {
        return jsonResponse(400, { error: 'Invalid room code.' });
      }
      const after = Number(req.query.get('after') || '0') || 0;
      const roomKey = `room_${code}`;
      const room = await store.getJson<RoomRelayState>(roomKey);
      if (!room || Date.now() - room.updatedAt > ROOM_TTL_MS) {
        return jsonResponse(200, { events: [], nextSeq: 0 });
      }
      return jsonResponse(200, {
        events: room.events.filter((ev) => ev.seq > after),
        nextSeq: room.nextSeq,
      });
    }

    if (method === 'POST') {
      const body = parseBody<{ code?: string; senderId?: string; payload?: unknown }>(req);
      if (!body) return jsonResponse(400, { error: 'Invalid JSON payload.' });
      const postCode = (body.code || code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!postCode || postCode.length < 4 || postCode.length > 24 || !body.senderId) {
        return jsonResponse(400, { error: 'Room code and senderId are required.' });
      }
      const roomKey = `room_${postCode}`;
      const existing = await store.getJson<RoomRelayState>(roomKey);
      const now = Date.now();
      const room: RoomRelayState =
        existing && now - existing.updatedAt <= ROOM_TTL_MS
          ? existing
          : { updatedAt: now, nextSeq: 0, events: [] };

      room.nextSeq += 1;
      room.updatedAt = now;
      room.events.push({
        seq: room.nextSeq,
        senderId: body.senderId,
        ts: now,
        payload: body.payload,
      });
      if (room.events.length > 180) {
        room.events = room.events.slice(-180);
      }
      await store.setJson(roomKey, room);
      return jsonResponse(200, { seq: room.nextSeq });
    }
  }

  if (path.startsWith('/watch')) {
    const now = Date.now();
    const rawMap = (await store.getJson<Record<string, LiveWatchGameRecord>>(WATCH_KEY)) || {};
    const pruned: Record<string, LiveWatchGameRecord> = {};
    let prunedDirty = false;
    for (const [gid, g] of Object.entries(rawMap)) {
      const ttl = g.status === 'active' ? WATCH_ACTIVE_TTL_MS : WATCH_ENDED_TTL_MS;
      if (now - g.updatedAt <= ttl) {
        pruned[gid] = g;
      } else {
        prunedDirty = true;
      }
    }

    if (method === 'GET' && path === '/watch/list') {
      if (prunedDirty) await store.setJson(WATCH_KEY, pruned);
      const filter = (req.query.get('filter') || 'all').toLowerCase();
      const games = Object.values(pruned)
        .filter((g) => (filter === 'pvp' || filter === 'bot' ? g.mode === filter : true))
        .sort((a, b) => {
          const aLive = a.status === 'active' ? 1 : 0;
          const bLive = b.status === 'active' ? 1 : 0;
          if (aLive !== bLive) return bLive - aLive;
          return b.updatedAt - a.updatedAt;
        })
        .map((g) => ({
          gameId: g.gameId,
          mode: g.mode,
          whiteName: g.whiteName,
          blackName: g.blackName,
          variant: g.variant,
          timeControlLabel: g.timeControlLabel,
          moveCount: Array.isArray(g.moves) ? g.moves.length : 0,
          status: g.status,
          statusReason: g.statusReason,
          updatedAt: g.updatedAt,
          fen: g.fen,
        }));
      return jsonResponse(200, { games });
    }

    if (method === 'GET' && path === '/watch/game') {
      if (prunedDirty) await store.setJson(WATCH_KEY, pruned);
      const id = (req.query.get('id') || '').trim();
      const game = pruned[id];
      if (!game) {
        return jsonResponse(404, { error: 'Live game not found or already closed.' });
      }
      return jsonResponse(200, { game });
    }

    if (method === 'POST' && path === '/watch/publish') {
      const body = parseBody<Partial<LiveWatchGameRecord>>(req);
      if (!body?.gameId || !body.fen || !body.mode) {
        return jsonResponse(400, { error: 'gameId, mode, and fen are required.' });
      }
      pruned[body.gameId] = {
        gameId: body.gameId,
        mode: body.mode === 'bot' ? 'bot' : 'pvp',
        whiteName: (body.whiteName || 'White').slice(0, 32),
        blackName: (body.blackName || 'Black').slice(0, 32),
        variant: body.variant || 'standard',
        timeControlLabel: body.timeControlLabel || '5 | 0',
        baseMs: Number(body.baseMs) || 0,
        incMs: Number(body.incMs) || 0,
        fen: body.fen,
        moves: Array.isArray(body.moves) ? body.moves.slice(-200) : [],
        lastMove: body.lastMove ?? null,
        whiteMs: Number(body.whiteMs) || 0,
        blackMs: Number(body.blackMs) || 0,
        whiteChecks: Number(body.whiteChecks) || 0,
        blackChecks: Number(body.blackChecks) || 0,
        lastTickAt: body.lastTickAt ?? null,
        status: body.status || 'active',
        statusReason: body.statusReason ?? null,
        updatedAt: now,
      };
      await store.setJson(WATCH_KEY, pruned);
      return jsonResponse(200, { ok: true });
    }

    if (method === 'POST' && path === '/watch/remove') {
      const body = parseBody<{ gameId?: string }>(req);
      if (body?.gameId && pruned[body.gameId]) {
        delete pruned[body.gameId];
        await store.setJson(WATCH_KEY, pruned);
      } else if (prunedDirty) {
        await store.setJson(WATCH_KEY, pruned);
      }
      return jsonResponse(200, { ok: true });
    }
  }

  const db = await loadDatabase(store);
  const currentUser = findUserBySession(db, req);
  const requiresClaimCode = Boolean(process.env.OWNER_CLAIM_CODE?.trim());

  if (method === 'GET' && path === '/auth/me') {
    return jsonResponse(200, {
      user: currentUser ? toPublicUser(currentUser) : null,
      hasOwner: db.ownerId !== null,
      requiresClaimCode,
    });
  }

  if (method === 'POST' && path === '/auth/logout') {
    return jsonResponse(
      200,
      { ok: true },
      { 'set-cookie': makeCookieHeader(null, req.isHttps) }
    );
  }

  if (method === 'POST' && path === '/auth/register') {
    const body = parseBody<{ username?: string; password?: string }>(req);
    if (!body) return jsonResponse(400, { error: 'Invalid request body.' });
    const rawUsername = (body.username || '').trim();
    const password = body.password || '';
    if (!USERNAME_RE.test(rawUsername)) {
      return jsonResponse(400, {
        error: 'Username must be 3–24 characters using letters, numbers, underscores, or hyphens.',
      });
    }
    if (password.length < 6 || password.length > 128) {
      return jsonResponse(400, { error: 'Password must be at least 6 characters.' });
    }
    const key = normalizeUsername(rawUsername);
    if (db.users[key]) {
      return jsonResponse(409, { error: 'That username is already registered.' });
    }
    const user = createStoredUser(rawUsername, password, 'user');
    db.users[key] = user;
    await store.setJson(DB_KEY, db);
    const token = signSession(user.id, getEffectiveSecret(db));
    return jsonResponse(
      201,
      { user: toPublicUser(user), token },
      { 'set-cookie': makeCookieHeader(token, req.isHttps) }
    );
  }

  if (method === 'POST' && path === '/auth/login') {
    const body = parseBody<{ username?: string; password?: string }>(req);
    if (!body) return jsonResponse(400, { error: 'Invalid request body.' });
    const key = normalizeUsername(body.username || '');
    const password = body.password || '';
    const user = db.users[key];
    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      return jsonResponse(401, { error: 'Invalid username or password.' });
    }
    const token = signSession(user.id, getEffectiveSecret(db));
    return jsonResponse(
      200,
      { user: toPublicUser(user), token },
      { 'set-cookie': makeCookieHeader(token, req.isHttps) }
    );
  }

  if (method === 'POST' && path === '/auth/claim-owner') {
    if (db.ownerId !== null) {
      return jsonResponse(403, { error: 'An Owner account is already configured on this site.' });
    }
    const body = parseBody<{ username?: string; password?: string; claimCode?: string }>(req);
    if (!body) return jsonResponse(400, { error: 'Invalid request body.' });

    const expectedClaim = process.env.OWNER_CLAIM_CODE?.trim();
    if (expectedClaim) {
      const provided = (body.claimCode || '').trim();
      if (!provided || !safeEqualString(provided, expectedClaim)) {
        return jsonResponse(403, { error: 'Invalid owner claim code.' });
      }
    }

    let ownerUser: StoredUser;
    if (currentUser) {
      currentUser.role = 'owner';
      currentUser.trollGrant = {
        permanent: true,
        expiresAt: null,
        grantedBy: 'system',
        grantedAt: Date.now(),
      };
      ownerUser = currentUser;
    } else {
      const rawUsername = (body.username || '').trim();
      const password = body.password || '';
      if (!USERNAME_RE.test(rawUsername)) {
        return jsonResponse(400, {
          error: 'Username must be 3–24 characters using letters, numbers, underscores, or hyphens.',
        });
      }
      if (password.length < 6 || password.length > 128) {
        return jsonResponse(400, { error: 'Password must be at least 6 characters.' });
      }
      const key = normalizeUsername(rawUsername);
      if (db.users[key]) {
        return jsonResponse(409, { error: 'Username exists. Sign in first or pick a new name.' });
      }
      ownerUser = createStoredUser(rawUsername, password, 'owner');
      db.users[key] = ownerUser;
    }

    db.ownerId = ownerUser.id;
    await store.setJson(DB_KEY, db);
    const token = signSession(ownerUser.id, getEffectiveSecret(db));
    return jsonResponse(
      200,
      { user: toPublicUser(ownerUser), hasOwner: true, token },
      { 'set-cookie': makeCookieHeader(token, req.isHttps) }
    );
  }

  if (method === 'GET' && path === '/owner/users') {
    if (!currentUser || currentUser.role !== 'owner') {
      return jsonResponse(403, { error: 'Owner account required.' });
    }
    const now = Date.now();
    const q = (req.query.get('q') || '').trim().toLowerCase();
    const users = Object.values(db.users)
      .filter((u) => {
        if (!q) return true;
        return (
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          (u.title || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (b.role === 'owner' && a.role !== 'owner') return 1;
        return b.createdAt - a.createdAt;
      })
      .map((u) => toPublicUser(u, now));
    return jsonResponse(200, { users });
  }

  if (method === 'POST' && path === '/owner/title') {
    if (!currentUser || currentUser.role !== 'owner') {
      return jsonResponse(403, { error: 'Owner account required.' });
    }
    const body = parseBody<{ username?: string; title?: string | null }>(req);
    if (!body || !body.username) {
      return jsonResponse(400, { error: 'Target username is required.' });
    }
    const target = db.users[normalizeUsername(body.username)];
    if (!target) {
      return jsonResponse(404, { error: `No account found for "${body.username.trim()}".` });
    }
    const cleanTitle = typeof body.title === 'string' ? body.title.trim().slice(0, 16) : '';
    target.title = cleanTitle || null;
    await store.setJson(DB_KEY, db);
    const now = Date.now();
    const users = Object.values(db.users)
      .sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (b.role === 'owner' && a.role !== 'owner') return 1;
        return b.createdAt - a.createdAt;
      })
      .map((u) => toPublicUser(u, now));
    return jsonResponse(200, { updated: toPublicUser(target, now), users });
  }

  if (method === 'GET' && path === '/profile') {
    const rawUsername = (req.query.get('username') || '').trim();
    if (!rawUsername) {
      return jsonResponse(400, { error: 'Username is required.' });
    }
    const target = db.users[normalizeUsername(rawUsername)];
    if (!target) {
      return jsonResponse(404, { error: `No profile found for "${rawUsername}".` });
    }
    const now = Date.now();
    const lastSeen = db.presence[target.id] ?? null;
    const online = lastSeen !== null && now - lastSeen <= 45_000;
    return jsonResponse(200, {
      profile: {
        id: target.id,
        username: target.username,
        displayName: target.displayName,
        role: target.role,
        title: target.title?.trim() || null,
        bio: target.bio || '',
        createdAt: target.createdAt,
        online,
      },
    });
  }

  if (method === 'POST' && path === '/profile/update') {
    if (!currentUser) {
      return jsonResponse(401, { error: 'Sign in to update your profile.' });
    }
    const body = parseBody<{ bio?: string; displayName?: string }>(req);
    if (!body) {
      return jsonResponse(400, { error: 'Invalid request body.' });
    }
    if (typeof body.bio === 'string') {
      currentUser.bio = body.bio.trim().slice(0, 240);
    }
    if (typeof body.displayName === 'string') {
      const cleanName = body.displayName.trim().slice(0, 24);
      if (cleanName.length >= 2) {
        currentUser.displayName = cleanName;
      }
    }
    await store.setJson(DB_KEY, db);
    return jsonResponse(200, { user: toPublicUser(currentUser) });
  }

  if (method === 'POST' && path === '/owner/troll-grant') {
    if (!currentUser || currentUser.role !== 'owner') {
      return jsonResponse(403, { error: 'Owner account required.' });
    }
    const body = parseBody<{
      username?: string;
      mode?: 'permanent' | 'temporary' | 'revoke';
      durationMinutes?: number;
    }>(req);
    if (!body || !body.username || !body.mode) {
      return jsonResponse(400, { error: 'Target username and grant mode are required.' });
    }
    const target = db.users[normalizeUsername(body.username)];
    if (!target) {
      return jsonResponse(404, { error: `No account found for "${body.username.trim()}".` });
    }
    if (target.role === 'owner') {
      return jsonResponse(400, { error: 'Owner account always retains permanent troll access.' });
    }

    const now = Date.now();
    if (body.mode === 'permanent') {
      target.trollGrant = {
        permanent: true,
        expiresAt: null,
        grantedBy: currentUser.username,
        grantedAt: now,
      };
    } else if (body.mode === 'temporary') {
      const mins = Number(body.durationMinutes);
      if (!Number.isFinite(mins) || mins < 1 || mins > 525600) {
        return jsonResponse(400, { error: 'Duration must be between 1 minute and 365 days.' });
      }
      target.trollGrant = {
        permanent: false,
        expiresAt: now + Math.round(mins * 60_000),
        grantedBy: currentUser.username,
        grantedAt: now,
      };
    } else if (body.mode === 'revoke') {
      target.trollGrant = {
        permanent: false,
        expiresAt: null,
        grantedBy: null,
        grantedAt: null,
      };
    } else {
      return jsonResponse(400, { error: 'Invalid grant mode.' });
    }

    await store.setJson(DB_KEY, db);
    const users = Object.values(db.users)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((u) => toPublicUser(u, now));
    return jsonResponse(200, { updated: toPublicUser(target, now), users });
  }

  if (method === 'GET' && path === '/social/state') {
    if (!currentUser) {
      return jsonResponse(401, { error: 'Sign in to access your friends list.' });
    }
    const now = Date.now();
    const prevSeen = db.presence[currentUser.id] || 0;
    let dirty = false;
    if (now - prevSeen > 12_000) {
      db.presence[currentUser.id] = now;
      dirty = true;
    }

    const activeChallenges = db.challenges.filter((c) => now - c.createdAt < 30 * 60_000);
    if (activeChallenges.length !== db.challenges.length) {
      db.challenges = activeChallenges;
      dirty = true;
    }

    if (dirty) {
      await store.setJson(DB_KEY, db);
    }

    const usersById = new Map<string, StoredUser>();
    for (const u of Object.values(db.users)) usersById.set(u.id, u);

    const friendIds = db.friends[currentUser.id] || [];
    const friends = friendIds
      .map((fid) => usersById.get(fid))
      .filter((u): u is StoredUser => Boolean(u))
      .map((u) => {
        const lastSeenAt = db.presence[u.id] ?? null;
        const online = lastSeenAt !== null && now - lastSeenAt <= 45_000;
        return {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          online,
          lastSeenAt,
        };
      })
      .sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));

    const incomingRequests = db.friendRequests.filter((r) => r.toUserId === currentUser.id);
    const outgoingRequests = db.friendRequests.filter((r) => r.fromUserId === currentUser.id);
    const incomingChallenges = db.challenges.filter(
      (c) => c.toUserId === currentUser.id && c.status === 'pending'
    );
    const outgoingChallenges = db.challenges.filter(
      (c) => c.fromUserId === currentUser.id && (c.status === 'pending' || c.status === 'accepted')
    );

    return jsonResponse(200, {
      friends,
      incomingRequests,
      outgoingRequests,
      incomingChallenges,
      outgoingChallenges,
    });
  }

  if (method === 'POST' && path === '/social/friend-request') {
    if (!currentUser) {
      return jsonResponse(401, { error: 'Sign in to add friends.' });
    }
    const body = parseBody<{ username?: string }>(req);
    const targetKey = normalizeUsername(body?.username || '');
    if (!targetKey) {
      return jsonResponse(400, { error: 'Enter a username to add.' });
    }
    const target = db.users[targetKey];
    if (!target) {
      return jsonResponse(404, { error: `No account found for "${body?.username?.trim()}".` });
    }
    if (target.id === currentUser.id) {
      return jsonResponse(400, { error: 'You cannot add yourself as a friend.' });
    }

    const myFriends = db.friends[currentUser.id] || [];
    if (myFriends.includes(target.id)) {
      return jsonResponse(409, { error: `@${target.username} is already in your friends list.` });
    }

    // If they already sent us a request, accept immediately!
    const reverseReq = db.friendRequests.find(
      (r) => r.fromUserId === target.id && r.toUserId === currentUser.id
    );
    if (reverseReq) {
      db.friendRequests = db.friendRequests.filter((r) => r.id !== reverseReq.id);
      db.friends[currentUser.id] = [...new Set([...(db.friends[currentUser.id] || []), target.id])];
      db.friends[target.id] = [...new Set([...(db.friends[target.id] || []), currentUser.id])];
      await store.setJson(DB_KEY, db);
      return jsonResponse(200, { autoAccepted: true, targetUsername: target.username });
    }

    const existing = db.friendRequests.find(
      (r) => r.fromUserId === currentUser.id && r.toUserId === target.id
    );
    if (existing) {
      return jsonResponse(409, { error: `Friend request to @${target.username} is already pending.` });
    }

    const record: FriendRequestRecord = {
      id: crypto.randomUUID(),
      fromUserId: currentUser.id,
      fromUsername: currentUser.username,
      toUserId: target.id,
      toUsername: target.username,
      createdAt: Date.now(),
    };
    db.friendRequests.push(record);
    await store.setJson(DB_KEY, db);
    return jsonResponse(201, { request: record });
  }

  if (method === 'POST' && path === '/social/friend-respond') {
    if (!currentUser) {
      return jsonResponse(401, { error: 'Sign in required.' });
    }
    const body = parseBody<{ requestId?: string; action?: 'accept' | 'decline' }>(req);
    if (!body?.requestId || !body.action) {
      return jsonResponse(400, { error: 'requestId and action are required.' });
    }
    const idx = db.friendRequests.findIndex((r) => r.id === body.requestId);
    if (idx === -1) {
      return jsonResponse(404, { error: 'Friend request not found.' });
    }
    const reqRecord = db.friendRequests[idx];
    if (reqRecord.toUserId !== currentUser.id && reqRecord.fromUserId !== currentUser.id) {
      return jsonResponse(403, { error: 'Not authorized for this request.' });
    }
    if (body.action === 'accept' && reqRecord.toUserId !== currentUser.id) {
      return jsonResponse(403, { error: 'Only the recipient can accept a request.' });
    }

    db.friendRequests.splice(idx, 1);
    if (body.action === 'accept') {
      db.friends[reqRecord.fromUserId] = [
        ...new Set([...(db.friends[reqRecord.fromUserId] || []), reqRecord.toUserId]),
      ];
      db.friends[reqRecord.toUserId] = [
        ...new Set([...(db.friends[reqRecord.toUserId] || []), reqRecord.fromUserId]),
      ];
    }
    await store.setJson(DB_KEY, db);
    return jsonResponse(200, { ok: true });
  }

  if (method === 'POST' && path === '/social/friend-remove') {
    if (!currentUser) {
      return jsonResponse(401, { error: 'Sign in required.' });
    }
    const body = parseBody<{ friendUserId?: string }>(req);
    if (!body?.friendUserId) {
      return jsonResponse(400, { error: 'friendUserId is required.' });
    }
    db.friends[currentUser.id] = (db.friends[currentUser.id] || []).filter(
      (id) => id !== body.friendUserId
    );
    db.friends[body.friendUserId] = (db.friends[body.friendUserId] || []).filter(
      (id) => id !== currentUser.id
    );
    await store.setJson(DB_KEY, db);
    return jsonResponse(200, { ok: true });
  }

  if (method === 'POST' && path === '/social/challenge') {
    if (!currentUser) {
      return jsonResponse(401, { error: 'Sign in to challenge friends.' });
    }
    const body = parseBody<{
      toUserId?: string;
      roomCode?: string;
      variant?: string;
      timeControlId?: string;
      timeControlLabel?: string;
      baseMs?: number;
      incMs?: number;
      hostColor?: 'w' | 'b';
    }>(req);
    if (!body?.toUserId || !body.roomCode) {
      return jsonResponse(400, { error: 'Target friend and roomCode are required.' });
    }
    const usersById = new Map<string, StoredUser>();
    for (const u of Object.values(db.users)) usersById.set(u.id, u);
    const target = usersById.get(body.toUserId);
    if (!target) {
      return jsonResponse(404, { error: 'Friend account not found.' });
    }
    const friendList = db.friends[currentUser.id] || [];
    if (!friendList.includes(target.id)) {
      return jsonResponse(403, { error: 'You can only send direct challenges to friends.' });
    }

    const now = Date.now();
    // Replace any existing pending challenge from currentUser to this target
    db.challenges = db.challenges.filter(
      (c) => !(c.fromUserId === currentUser.id && c.toUserId === target.id && c.status === 'pending')
    );

    const challenge: DirectChallengeRecord = {
      id: crypto.randomUUID(),
      fromUserId: currentUser.id,
      fromUsername: currentUser.username,
      toUserId: target.id,
      toUsername: target.username,
      roomCode: body.roomCode.toUpperCase(),
      variant: body.variant || 'standard',
      timeControlId: body.timeControlId || '5+0',
      timeControlLabel: body.timeControlLabel || '5 | 0',
      baseMs: Number.isFinite(body.baseMs) ? Number(body.baseMs) : 300_000,
      incMs: Number.isFinite(body.incMs) ? Number(body.incMs) : 0,
      hostColor: body.hostColor === 'b' ? 'b' : 'w',
      status: 'pending',
      createdAt: now,
    };
    db.presence[currentUser.id] = now;
    db.challenges.push(challenge);
    await store.setJson(DB_KEY, db);
    return jsonResponse(201, { challenge });
  }

  if (method === 'POST' && path === '/social/challenge-respond') {
    if (!currentUser) {
      return jsonResponse(401, { error: 'Sign in required.' });
    }
    const body = parseBody<{
      challengeId?: string;
      action?: 'accept' | 'decline' | 'cancel';
    }>(req);
    if (!body?.challengeId || !body.action) {
      return jsonResponse(400, { error: 'challengeId and action are required.' });
    }
    const challenge = db.challenges.find((c) => c.id === body.challengeId);
    if (!challenge) {
      return jsonResponse(404, { error: 'Challenge expired or not found.' });
    }

    if (body.action === 'cancel') {
      if (challenge.fromUserId !== currentUser.id) {
        return jsonResponse(403, { error: 'Only the challenger can cancel.' });
      }
      challenge.status = 'cancelled';
    } else {
      if (challenge.toUserId !== currentUser.id) {
        return jsonResponse(403, { error: 'Only the challenged friend can respond.' });
      }
      challenge.status = body.action === 'accept' ? 'accepted' : 'declined';
    }

    db.presence[currentUser.id] = Date.now();
    await store.setJson(DB_KEY, db);
    return jsonResponse(200, { challenge });
  }

  return jsonResponse(404, { error: `Unknown API route: ${method} ${path}` });
}
