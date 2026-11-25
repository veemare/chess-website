import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AccountModal } from './components/AccountModal';
import { ProfileModal } from './components/ProfileModal';
import { TitleBadge } from './components/TitleBadge';
import { ChessBoard } from './components/ChessBoard';
import { FriendsModal } from './components/FriendsModal';
import {
  BinocularsIcon,
  BoltIcon,
  BotIcon,
  BrandCrownIcon,
  CheckIcon,
  CopyIcon,
  CubeVariantIcon,
  DrawIcon,
  FlagIcon,
  FlipIcon,
  HandshakeIcon,
  SendIcon,
  UserIcon,
  UsersIcon,
} from './components/Icons';
import { OperatorDrawer } from './components/OperatorDrawer';
import { PlayerClockStrip } from './components/PlayerClockStrip';
import {
  applyClonePiece,
  applyResurrectPiece,
  applyScramblePieces,
  applyShieldWall,
  applySnipePiece,
  applyStandardMove,
  applySwapPieces,
  applyTransformPiece,
  applyTrollMovePiece,
  forceTurnInFen,
  generateStartFenForVariant,
  getBoardMap,
  getCapturedPieces,
  getLegalMovesFromSquare,
  getOutcomeFromFen,
  getTurnFromFen,
  needsPromotion,
} from './engine/chessCore';
import { queryEngineAsync } from './engine/workerClient';
import {
  fetchAuthMe,
  fetchSocialState,
  fetchWatchGame,
  fetchWatchGames,
  publishWatchGame,
  removeWatchGame,
  fetchUserProfile,
  respondDirectChallenge,
  saveCompletedGame,
  sendDirectChallenge,
} from './services/api';
import { generateRoomCode, RoomTransport } from './services/multiplayer';
import { isSoundsMuted, playGameEndSound, playMoveSound, setSoundsMuted } from './services/sound';
import {
  GAME_VARIANTS,
  TIME_CONTROLS,
  type AuthoritativeGameState,
  type ChatMessage,
  type DirectChallengeSummary,
  type FriendSummary,
  type GameVariant,
  type LiveWatchGameFull,
  type LiveWatchGameSummary,
  type OpponentCurseState,
  type PieceColor,
  type PieceType,
  type PublicUser,
  type RoomNetworkMode,
  type RoomWireMessage,
  type SocialStateResponse,
  type TrollArmedAction,
  type WatchFilterMode,
} from './types/chess';

const GUEST_STORAGE_KEY = 'vesper64_guest_name';

type TimerCategory = 'Bullet' | 'Blitz' | 'Rapid' | 'Custom';
type ArenaMode = 'friend' | 'bot' | 'watch';
type RightSetupView = 'menu' | 'setup_online' | 'setup_bot' | 'setup_join';

function createInitialGameState(input: {
  variant: GameVariant;
  timeControlId: string;
  timeControlLabel: string;
  baseMs: number;
  incMs: number;
  status: AuthoritativeGameState['status'];
}): AuthoritativeGameState {
  return {
    version: 1,
    variant: input.variant,
    fen: generateStartFenForVariant(input.variant),
    moves: [],
    lastMove: null,
    whiteMs: input.baseMs,
    blackMs: input.baseMs,
    timeControlId: input.timeControlId,
    timeControlLabel: input.timeControlLabel,
    baseMs: input.baseMs,
    incMs: input.incMs,
    whiteChecks: 0,
    blackChecks: 0,
    lastTickAt: null,
    status: input.status,
    winner: null,
    statusReason: null,
    frozenColor: null,
    clockSpeedMultiplier: { w: 1, b: 1 },
  };
}

function emptyCurses(): OpponentCurseState {
  return {
    boardFlippedForced: false,
    fakeReconnectUntil: null,
    butterfingers: false,
    disguisedSquares: {},
    gaslightLastMove: null,
    arbiterNotice: null,
    drunkPieces: false,
    ghostPiecesUntil: null,
    fakeOutcomeUntil: null,
    fakeOutcomeTitle: null,
  };
}

function emptySocial(): SocialStateResponse {
  return {
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    incomingChallenges: [],
    outgoingChallenges: [],
  };
}

function getOrCreateClientId(): string {
  try {
    const existing = sessionStorage.getItem('vesper64_client_id');
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem('vesper64_client_id', fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

function loadGuestName(): string {
  try {
    const saved = localStorage.getItem(GUEST_STORAGE_KEY);
    if (saved?.trim()) return saved.trim().slice(0, 24);
  } catch {
    // Ignore storage issues
  }
  return 'Player';
}

function parseRoomFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('room');
    if (!raw) return null;
    const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return clean.length >= 4 && clean.length <= 12 ? clean : null;
  } catch {
    return null;
  }
}

function computeElapsedMsSnapshot(state: AuthoritativeGameState, now = Date.now()): {
  whiteMs: number;
  blackMs: number;
} {
  if (state.baseMs === 0 || state.status !== 'active' || state.moves.length === 0 || !state.lastTickAt) {
    return { whiteMs: state.whiteMs, blackMs: state.blackMs };
  }
  const turn = getTurnFromFen(state.fen);
  if (state.frozenColor === turn) {
    return { whiteMs: state.whiteMs, blackMs: state.blackMs };
  }
  const elapsed = Math.max(0, now - state.lastTickAt);
  const mult = state.clockSpeedMultiplier?.[turn] ?? 1;
  return {
    whiteMs: turn === 'w' ? Math.max(0, state.whiteMs - elapsed * mult) : state.whiteMs,
    blackMs: turn === 'b' ? Math.max(0, state.blackMs - elapsed * mult) : state.blackMs,
  };
}

export default function App() {
  const clientIdRef = useRef<string>(getOrCreateClientId());
  const transportRef = useRef<RoomTransport | null>(null);
  const brandClickTimestampsRef = useRef<number[]>([]);
  const socialBusyRef = useRef(false);
  const activeWatchPublishIdRef = useRef<string | null>(null);

  // Auth & optional account state
  const [user, setUser] = useState<PublicUser | null>(null);
  const [hasOwner, setHasOwner] = useState(true);
  const [requiresClaimCode, setRequiresClaimCode] = useState(false);
  const [guestName, setGuestName] = useState<string>(loadGuestName);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState<string | null>(null);
  const [accountAuthMode, setAccountAuthMode] = useState<'login' | 'register'>('login');
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [social, setSocial] = useState<SocialStateResponse>(emptySocial);
  const [muted, setMuted] = useState(() => isSoundsMuted());
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Navigation & Variant / Timer config
  const [arenaMode, setArenaMode] = useState<ArenaMode>('friend');
  const [rightSetupView, setRightSetupView] = useState<RightSetupView>('menu');
  const [selectedVariant, setSelectedVariant] = useState<GameVariant>('standard');
  const [timerCategory, setTimerCategory] = useState<TimerCategory>('Blitz');
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('5+0');
  const [customMinutes, setCustomMinutes] = useState<number>(7);
  const [customIncrement, setCustomIncrement] = useState<number>(3);
  const [preferredColor, setPreferredColor] = useState<'random' | PieceColor>('random');

  // Room & Lichess-style Invite Gate state
  const [roomCode, setRoomCode] = useState<string | null>(() => parseRoomFromUrl());
  const [isHost, setIsHost] = useState<boolean>(() => !parseRoomFromUrl());
  const [inviteJoined, setInviteJoined] = useState<boolean>(false);
  const [invitePreview, setInvitePreview] = useState<{
    hostName: string;
    hostColor: PieceColor;
    variant: GameVariant;
    timeControlLabel: string;
  } | null>(null);
  const [challengedFriendName, setChallengedFriendName] = useState<string | null>(null);
  const [networkMode, setNetworkMode] = useState<RoomNetworkMode>(() =>
    parseRoomFromUrl() ? 'connecting' : 'idle'
  );
  const [networkDetail, setNetworkDetail] = useState<string>('Ready');
  const [opponentName, setOpponentName] = useState<string>(() =>
    parseRoomFromUrl() ? 'Waiting for opponent…' : 'Opponent'
  );
  const [opponentTitle, setOpponentTitle] = useState<string | null>(null);
  const savedGameIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const clean = opponentName.replace(/^@/, '').trim();
    if (
      !clean ||
      clean === 'Opponent' ||
      clean === 'Waiting for opponent…' ||
      clean.startsWith('Stockfish') ||
      clean.startsWith('Bot')
    ) {
      setOpponentTitle(null);
      return;
    }
    let cancelled = false;
    void fetchUserProfile(clean)
      .then((res) => {
        if (!cancelled) setOpponentTitle(res.profile.title);
      })
      .catch(() => {
        if (!cancelled) setOpponentTitle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [opponentName]);
  const [joinInput, setJoinInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Watch Live Games state
  const [watchFilter, setWatchFilter] = useState<WatchFilterMode>('all');
  const [watchList, setWatchList] = useState<LiveWatchGameSummary[]>([]);
  const [watchLoading, setWatchLoading] = useState(false);
  const [spectatingGame, setSpectatingGame] = useState<LiveWatchGameFull | null>(null);
  const [spectateOrientation, setSpectateOrientation] = useState<PieceColor>('w');

  // Match & board state
  const [localColor, setLocalColor] = useState<PieceColor>('w');
  const [boardOrientation, setBoardOrientation] = useState<PieceColor>('w');
  const [gameState, setGameState] = useState<AuthoritativeGameState>(() =>
    createInitialGameState({
      variant: 'standard',
      timeControlId: '5+0',
      timeControlLabel: '5 | 0',
      baseMs: 300_000,
      incMs: 0,
      status: parseRoomFromUrl() ? 'waiting' : 'active',
    })
  );

  useEffect(() => {
    if (arenaMode === 'watch') return;
    if (gameState.status === 'active' || gameState.status === 'waiting') return;
    if (gameState.moves.length === 0) return;

    const gid = `${roomCode || 'local'}-${gameState.moves[0]?.san}-${gameState.moves.length}-${gameState.status}`;
    if (savedGameIdsRef.current.has(gid)) return;
    savedGameIdsRef.current.add(gid);

    const myName = user?.username || guestName || 'Player';
    const whiteUsername = localColor === 'w' ? myName : opponentName;
    const blackUsername = localColor === 'b' ? myName : opponentName;
    const whiteTitle = localColor === 'w' ? (user?.title ?? null) : opponentTitle;
    const blackTitle = localColor === 'b' ? (user?.title ?? null) : opponentTitle;

    void saveCompletedGame({
      gameId: gid,
      mode: arenaMode === 'bot' ? 'bot' : 'pvp',
      whiteUsername,
      blackUsername,
      whiteTitle,
      blackTitle,
      variant: gameState.variant,
      timeControlLabel: gameState.timeControlLabel,
      winner: gameState.winner,
      status: gameState.status,
      statusReason: gameState.statusReason,
      moves: gameState.moves.map((m) => ({
        san: m.san,
        from: m.from,
        to: m.to,
        fen: m.fenAfter,
      })),
    }).catch(() => undefined);
  }, [
    arenaMode,
    gameState.status,
    gameState.winner,
    gameState.statusReason,
    gameState.moves,
    gameState.variant,
    gameState.timeControlLabel,
    roomCode,
    localColor,
    user?.username,
    user?.title,
    guestName,
    opponentName,
    opponentTitle,
  ]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
    color: PieceColor;
    keepTurn: boolean;
  } | null>(null);
  const [drawOfferedBy, setDrawOfferedBy] = useState<PieceColor | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Concealed Troll / Operator State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [armedTroll, setArmedTroll] = useState<TrollArmedAction>(null);
  const [showEngineHint, setShowEngineHint] = useState(false);
  const [showEvalBar, setShowEvalBar] = useState(false);
  const [engineHint, setEngineHint] = useState<{
    from: string;
    to: string;
    san: string;
    evalCp: number;
  } | null>(null);
  const [cursesSent, setCursesSent] = useState<OpponentCurseState>(emptyCurses);
  const [cursesReceived, setCursesReceived] = useState<OpponentCurseState>(emptyCurses);

  const localDisplayName = user ? `@${user.username}` : guestName;

  const activeTimeConfig = useMemo(() => {
    if (timerCategory === 'Custom') {
      const mins = Math.max(1, Math.min(180, Math.round(customMinutes)));
      const inc = Math.max(0, Math.min(60, Math.round(customIncrement)));
      return {
        id: `custom-${mins}+${inc}`,
        label: `${mins} | ${inc}`,
        baseMs: mins * 60_000,
        incMs: inc * 1_000,
      };
    }
    const found = TIME_CONTROLS.find((t) => t.id === selectedTimeControl) ?? TIME_CONTROLS[5];
    return {
      id: found.id,
      label: found.label,
      baseMs: found.baseMs,
      incMs: found.incMs,
    };
  }, [timerCategory, selectedTimeControl, customMinutes, customIncrement]);

  const canTroll = useMemo(() => {
    if (!user?.trollAccess.active) return false;
    if (user.trollAccess.permanent) return true;
    return user.trollAccess.expiresAt !== null && user.trollAccess.expiresAt > nowTick;
  }, [user, nowTick]);

  // Initial auth check
  useEffect(() => {
    fetchAuthMe()
      .then((res) => {
        setUser(res.user);
        setHasOwner(res.hasOwner);
        setRequiresClaimCode(res.requiresClaimCode);
      })
      .catch(() => {
        // Static offline fallback keeps guest mode working
      });
  }, []);

  const refreshSocial = useCallback(async () => {
    if (!user || socialBusyRef.current) return;
    socialBusyRef.current = true;
    try {
      const res = await fetchSocialState();
      setSocial(res);
    } catch {
      // Ignore transient poll errors
    } finally {
      socialBusyRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSocial(emptySocial());
      return;
    }
    void refreshSocial();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshSocial();
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [user, refreshSocial]);

  const refreshWatchList = useCallback(async (filter: WatchFilterMode) => {
    setWatchLoading(true);
    try {
      const res = await fetchWatchGames(filter);
      setWatchList(res.games);
    } catch {
      // Keep previous list on transient error
    } finally {
      setWatchLoading(false);
    }
  }, []);

  // Poll Watch game list or active spectated game
  useEffect(() => {
    if (arenaMode !== 'watch') return;

    if (!spectatingGame) {
      void refreshWatchList(watchFilter);
      const id = window.setInterval(() => {
        if (document.visibilityState === 'visible') {
          void refreshWatchList(watchFilter);
        }
      }, 4000);
      return () => window.clearInterval(id);
    }

    const specId = spectatingGame.gameId;
    const pollGame = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetchWatchGame(specId);
        setSpectatingGame(res.game);
      } catch {
        // Keep current frame if ended/removed
      }
    };
    const id = window.setInterval(() => {
      void pollGame();
    }, 1500);
    return () => window.clearInterval(id);
  }, [arenaMode, watchFilter, spectatingGame?.gameId, refreshWatchList]);

  useEffect(() => {
    if (!user?.trollAccess.active || user.trollAccess.permanent) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, [user]);

  useEffect(() => {
    if (!canTroll) {
      setDrawerOpen(false);
      setArmedTroll(null);
      setShowEngineHint(false);
      setShowEvalBar(false);
      setEngineHint(null);
    }
  }, [canTroll]);

  // Global keyboard shortcuts: Ctrl+Shift+T toggles stealth console, Esc panic-hides
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (canTroll && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setDrawerOpen((prev) => !prev);
        return;
      }
      if (
        e.key === 'Escape' &&
        canTroll &&
        (drawerOpen || showEngineHint || showEvalBar || armedTroll)
      ) {
        setDrawerOpen(false);
        setShowEngineHint(false);
        setShowEvalBar(false);
        setArmedTroll(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canTroll, drawerOpen, showEngineHint, showEvalBar, armedTroll]);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const localColorRef = useRef(localColor);
  localColorRef.current = localColor;
  const localDisplayNameRef = useRef(localDisplayName);
  localDisplayNameRef.current = localDisplayName;
  const opponentNameRef = useRef(opponentName);
  opponentNameRef.current = opponentName;
  const cursesSentRef = useRef(cursesSent);
  cursesSentRef.current = cursesSent;
  const inviteJoinedRef = useRef(inviteJoined);
  inviteJoinedRef.current = inviteJoined;

  // Publish active PvP (host) or Bot match snapshots to the live Watch stream
  const publishLiveSnapshot = useCallback(
    (state: AuthoritativeGameState, mode: 'pvp' | 'bot', gid: string, oppLabel: string) => {
      const whiteName = localColorRef.current === 'w' ? localDisplayNameRef.current : oppLabel;
      const blackName = localColorRef.current === 'b' ? localDisplayNameRef.current : oppLabel;
      activeWatchPublishIdRef.current = gid;
      void publishWatchGame({
        gameId: gid,
        mode,
        whiteName,
        blackName,
        variant: state.variant,
        timeControlLabel: state.timeControlLabel,
        baseMs: state.baseMs,
        incMs: state.incMs,
        fen: state.fen,
        moves: state.moves,
        lastMove: state.lastMove,
        whiteMs: state.whiteMs,
        blackMs: state.blackMs,
        whiteChecks: state.whiteChecks,
        blackChecks: state.blackChecks,
        lastTickAt: state.lastTickAt,
        status: state.status,
        statusReason: state.statusReason,
      }).catch(() => undefined);
    },
    []
  );

  // Sync PvP host & Bot games to Watch stream whenever state version changes
  useEffect(() => {
    if (arenaMode === 'bot') {
      const gid = activeWatchPublishIdRef.current || `bot-${clientIdRef.current.slice(0, 8)}`;
      publishLiveSnapshot(gameState, 'bot', gid, opponentNameRef.current);
      return;
    }
    if (arenaMode === 'friend' && roomCode && isHost && inviteJoined) {
      publishLiveSnapshot(gameState, 'pvp', `pvp-${roomCode}`, opponentNameRef.current);
    }
  }, [
    arenaMode,
    roomCode,
    isHost,
    inviteJoined,
    gameState.version,
    gameState.status,
    publishLiveSnapshot,
    gameState,
  ]);

  const pushSystemChat = useCallback((text: string) => {
    setChatMessages((prev) => [
      ...prev.slice(-60),
      {
        id: crypto.randomUUID(),
        sender: 'Match',
        text,
        ts: Date.now(),
        system: true,
      },
    ]);
  }, []);

  const commitGameState = useCallback(
    (next: AuthoritativeGameState, broadcast = true) => {
      setGameState(next);
      if (broadcast && roomCode && transportRef.current) {
        transportRef.current.send({
          type: 'state_update',
          state: next,
          senderClientId: clientIdRef.current,
        });
      }
    },
    [roomCode]
  );

  // RoomTransport lifecycle
  useEffect(() => {
    if (arenaMode !== 'friend' || !roomCode) {
      transportRef.current?.destroy();
      transportRef.current = null;
      return;
    }

    const transport = new RoomTransport(roomCode, isHost, clientIdRef.current, {
      onStatus: (mode, detail) => {
        setNetworkMode(mode);
        if (detail) setNetworkDetail(detail);
        if (!isHost && (mode === 'p2p' || mode === 'local-tab' || mode === 'relay')) {
          if (inviteJoinedRef.current) {
            transport.send({
              type: 'hello',
              peerClientId: clientIdRef.current,
              name: localDisplayNameRef.current,
            });
          } else {
            transport.send({
              type: 'invite_preview_request',
              peerClientId: clientIdRef.current,
            });
          }
        }
      },
      onMessage: (msg: RoomWireMessage) => {
        if (msg.type === 'invite_preview_request') {
          if (isHost) {
            const cur = gameStateRef.current;
            transport.send({
              type: 'invite_preview',
              hostName: localDisplayNameRef.current,
              hostColor: localColorRef.current,
              variant: cur.variant,
              timeControlLabel: cur.timeControlLabel,
            });
          }
          return;
        }

        if (msg.type === 'invite_preview') {
          if (!isHost) {
            setInvitePreview({
              hostName: msg.hostName,
              hostColor: msg.hostColor,
              variant: msg.variant,
              timeControlLabel: msg.timeControlLabel,
            });
            setOpponentName(msg.hostName);
          }
          return;
        }

        if (msg.type === 'hello') {
          setOpponentName(msg.name);
          if (isHost) {
            const current = gameStateRef.current;
            const activated: AuthoritativeGameState =
              current.status === 'waiting'
                ? {
                    ...current,
                    version: current.version + 1,
                    status: 'active',
                    lastTickAt: current.moves.length > 0 ? Date.now() : null,
                  }
                : current;
            setGameState(activated);
            setInviteJoined(true);
            setChallengedFriendName(null);
            transport.send({
              type: 'room_init',
              hostName: localDisplayNameRef.current,
              hostColor: localColorRef.current,
              state: activated,
              cursesForOpponent: cursesSentRef.current,
            });
            pushSystemChat(`${msg.name} joined the match.`);
          }
          return;
        }

        if (msg.type === 'room_init') {
          if (!isHost) {
            setOpponentName(msg.hostName);
            const assigned: PieceColor = msg.hostColor === 'w' ? 'b' : 'w';
            setLocalColor(assigned);
            setBoardOrientation(assigned);
            setGameState(msg.state);
            setCursesReceived(msg.cursesForOpponent);
            setInviteJoined(true);
            pushSystemChat(`Connected to ${msg.hostName}.`);
          }
          return;
        }

        if (msg.type === 'state_update') {
          if (msg.senderClientId === clientIdRef.current) return;
          setGameState((prev) => {
            if (msg.state.version >= prev.version) {
              setDrawOfferedBy(null);
              if (msg.state.moves.length > prev.moves.length) {
                if (msg.state.status !== 'active') playGameEndSound();
                else playMoveSound(false, false);
              }
              return msg.state;
            }
            return prev;
          });
          setCursesReceived((prev) =>
            prev.butterfingers ? { ...prev, butterfingers: false } : prev
          );
          return;
        }

        if (msg.type === 'curse_update') {
          setCursesReceived(msg.curses);
          if (msg.curses.arbiterNotice) {
            pushSystemChat(msg.curses.arbiterNotice);
          }
          return;
        }

        if (msg.type === 'chat') {
          setChatMessages((prev) => [...prev.slice(-60), msg.message]);
          return;
        }

        if (msg.type === 'draw_offer') {
          setDrawOfferedBy(msg.fromColor);
          pushSystemChat('Opponent offered a draw.');
          return;
        }

        if (msg.type === 'draw_response') {
          setDrawOfferedBy(null);
          pushSystemChat(msg.accepted ? 'Draw accepted.' : 'Draw declined.');
          return;
        }

        if (msg.type === 'rematch_request') {
          setRematchRequested(true);
          pushSystemChat('Opponent requested a rematch.');
          return;
        }

        if (msg.type === 'rematch_accept') {
          const assigned: PieceColor = isHost
            ? msg.newHostColor
            : msg.newHostColor === 'w'
              ? 'b'
              : 'w';
          setLocalColor(assigned);
          setBoardOrientation(assigned);
          setGameState(msg.state);
          setRematchRequested(false);
          setDrawOfferedBy(null);
          setCursesSent(emptyCurses());
          setCursesReceived(emptyCurses());
          pushSystemChat('Rematch started.');
        }
      },
    });

    transportRef.current = transport;
    transport.start();

    return () => {
      transport.destroy();
      transportRef.current = null;
    };
  }, [arenaMode, roomCode, isHost, pushSystemChat]);

  // Clear temporary visual curses cleanly
  useEffect(() => {
    const timers: number[] = [];
    const now = Date.now();
    if (cursesReceived.fakeReconnectUntil && cursesReceived.fakeReconnectUntil > now) {
      timers.push(
        window.setTimeout(() => {
          setCursesReceived((prev) => ({ ...prev, fakeReconnectUntil: null }));
        }, cursesReceived.fakeReconnectUntil - now + 30)
      );
    }
    if (cursesReceived.ghostPiecesUntil && cursesReceived.ghostPiecesUntil > now) {
      timers.push(
        window.setTimeout(() => {
          setCursesReceived((prev) => ({ ...prev, ghostPiecesUntil: null }));
        }, cursesReceived.ghostPiecesUntil - now + 30)
      );
    }
    if (cursesReceived.fakeOutcomeUntil && cursesReceived.fakeOutcomeUntil > now) {
      timers.push(
        window.setTimeout(() => {
          setCursesReceived((prev) => ({ ...prev, fakeOutcomeUntil: null, fakeOutcomeTitle: null }));
        }, cursesReceived.fakeOutcomeUntil - now + 30)
      );
    }
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [
    cursesReceived.fakeReconnectUntil,
    cursesReceived.ghostPiecesUntil,
    cursesReceived.fakeOutcomeUntil,
  ]);

  // Bot turn execution in background Web Worker (0ms main-thread freeze)
  useEffect(() => {
    if (arenaMode !== 'bot' || gameState.status !== 'active') return;
    const turn = getTurnFromFen(gameState.fen);
    if (turn === localColor) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const current = gameStateRef.current;
        if (cancelled || current.status !== 'active') return;

        let chosen = await queryEngineAsync(current.fen, 'best', 2);
        if (cancelled) return;

        let applied = chosen
          ? applyStandardMove(
              current.fen,
              chosen.from,
              chosen.to,
              chosen.promotion ?? 'q',
              false,
              current.variant
            )
          : null;

        if (!applied) {
          const map = getBoardMap(current.fen);
          const pieces = Object.values(map).filter((p) => p.color === turn);
          for (const p of pieces) {
            const targets = getLegalMovesFromSquare(current.fen, p.square, current.variant);
            for (const target of targets) {
              const attempt = applyStandardMove(
                current.fen,
                p.square,
                target,
                'q',
                false,
                current.variant
              );
              if (attempt) {
                chosen = { from: p.square, to: target, san: attempt.san, evalCp: 0 };
                applied = attempt;
                break;
              }
            }
            if (applied) break;
          }
        }

        if (!chosen || !applied || cancelled) return;

        const now = Date.now();
        const clocks = computeElapsedMsSnapshot(current, now);
        const nextWChecks =
          current.variant === 'three_check' && turn === 'w' && applied.deliveredCheck
            ? current.whiteChecks + 1
            : current.whiteChecks;
        const nextBChecks =
          current.variant === 'three_check' && turn === 'b' && applied.deliveredCheck
            ? current.blackChecks + 1
            : current.blackChecks;

        const outcome = getOutcomeFromFen(
          applied.fenAfter,
          current.variant,
          nextWChecks,
          nextBChecks
        );

        if (outcome.status !== 'active') playGameEndSound();
        else playMoveSound(applied.captured, applied.deliveredCheck);

        setGameState({
          ...current,
          version: current.version + 1,
          fen: applied.fenAfter,
          moves: [
            ...current.moves,
            {
              ply: current.moves.length + 1,
              san: applied.san,
              from: chosen.from,
              to: chosen.to,
              color: turn,
              fenBefore: current.fen,
              fenAfter: applied.fenAfter,
            },
          ],
          lastMove: { from: chosen.from, to: chosen.to },
          whiteMs: turn === 'w' && current.incMs ? clocks.whiteMs + current.incMs : clocks.whiteMs,
          blackMs: turn === 'b' && current.incMs ? clocks.blackMs + current.incMs : clocks.blackMs,
          lastTickAt: now,
          whiteChecks: nextWChecks,
          blackChecks: nextBChecks,
          status: outcome.status,
          winner: outcome.winner,
          statusReason: outcome.reason,
        });
      })();
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [arenaMode, gameState.fen, gameState.status, localColor]);

  // Private Arbiter eval in Web Worker
  useEffect(() => {
    if (!canTroll || (!drawerOpen && !showEngineHint && !showEvalBar) || arenaMode === 'watch') {
      setEngineHint(null);
      return;
    }
    if (gameState.status !== 'active') {
      setEngineHint(null);
      return;
    }
    let cancelled = false;
    void queryEngineAsync(gameState.fen, 'best', 2).then((best) => {
      if (!cancelled && best) {
        setEngineHint({
          from: best.from,
          to: best.to,
          san: best.san,
          evalCp: best.evalCp,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [canTroll, drawerOpen, showEngineHint, showEvalBar, arenaMode, gameState.fen, gameState.status]);

  const handleClockTimeout = useCallback(
    (timedOutColor: PieceColor) => {
      const current = gameStateRef.current;
      if (current.status !== 'active') return;
      const winner: PieceColor = timedOutColor === 'w' ? 'b' : 'w';
      playGameEndSound();
      commitGameState({
        ...current,
        version: current.version + 1,
        whiteMs: timedOutColor === 'w' ? 0 : current.whiteMs,
        blackMs: timedOutColor === 'b' ? 0 : current.blackMs,
        status: 'timeout',
        winner,
        statusReason: `${winner === 'w' ? 'White' : 'Black'} wins on time`,
      });
    },
    [commitGameState]
  );

  function pushCurseUpdate(next: OpponentCurseState) {
    setCursesSent(next);
    if (roomCode && transportRef.current) {
      transportRef.current.send({ type: 'curse_update', curses: next });
    }
  }

  function applyMoveSuccess(
    from: string,
    to: string,
    fenAfter: string,
    san: string,
    movedColor: PieceColor,
    deliveredCheck: boolean,
    capturedPiece = false,
    isTrollMove = false
  ) {
    const now = Date.now();
    const clocks = computeElapsedMsSnapshot(gameState, now);

    const nextWChecks =
      gameState.variant === 'three_check' && movedColor === 'w' && deliveredCheck
        ? gameState.whiteChecks + 1
        : gameState.whiteChecks;
    const nextBChecks =
      gameState.variant === 'three_check' && movedColor === 'b' && deliveredCheck
        ? gameState.blackChecks + 1
        : gameState.blackChecks;

    const outcome = getOutcomeFromFen(fenAfter, gameState.variant, nextWChecks, nextBChecks);

    if (outcome.status !== 'active') playGameEndSound();
    else playMoveSound(capturedPiece, deliveredCheck);

    if (cursesSent.disguisedSquares[from]) {
      const nextDisguises = { ...cursesSent.disguisedSquares };
      delete nextDisguises[from];
      pushCurseUpdate({ ...cursesSent, disguisedSquares: nextDisguises });
    }

    const nextState: AuthoritativeGameState = {
      ...gameState,
      version: gameState.version + 1,
      fen: fenAfter,
      moves: [
        ...gameState.moves,
        {
          ply: gameState.moves.length + 1,
          san,
          from,
          to,
          color: movedColor,
          fenBefore: gameState.fen,
          fenAfter,
          isTroll: isTrollMove,
        },
      ],
      lastMove: { from, to },
      whiteMs:
        !isTrollMove && movedColor === 'w' && gameState.incMs
          ? clocks.whiteMs + gameState.incMs
          : clocks.whiteMs,
      blackMs:
        !isTrollMove && movedColor === 'b' && gameState.incMs
          ? clocks.blackMs + gameState.incMs
          : clocks.blackMs,
      lastTickAt: now,
      whiteChecks: nextWChecks,
      blackChecks: nextBChecks,
      status: outcome.status,
      winner: outcome.winner,
      statusReason: outcome.reason,
    };

    setDrawOfferedBy(null);
    commitGameState(nextState);
  }

  function handleAttemptMove(from: string, to: string) {
    if (arenaMode === 'watch' || gameState.status !== 'active') return;
    const turn = getTurnFromFen(gameState.fen);

    if (canTroll && (armedTroll?.type === 'teleport' || armedTroll?.type === 'steal_piece')) {
      const res = applyTrollMovePiece(gameState.fen, from, to, false);
      if (res) {
        setArmedTroll(null);
        applyMoveSuccess(from, to, res.fenAfter, res.san, turn, res.deliveredCheck, false, true);
      }
      return;
    }

    const canPlayLocal =
      arenaMode === 'bot'
        ? turn === localColor
        : roomCode
          ? turn === localColor
          : true;

    if (!canPlayLocal) return;

    const keepTurn = canTroll && armedTroll?.type === 'double_move';

    if (needsPromotion(gameState.fen, from, to)) {
      setPendingPromotion({ from, to, color: turn, keepTurn });
      return;
    }

    const res = applyStandardMove(gameState.fen, from, to, 'q', keepTurn, gameState.variant);
    if (!res) return;
    if (keepTurn) setArmedTroll(null);
    applyMoveSuccess(
      from,
      to,
      res.fenAfter,
      res.san,
      turn,
      res.deliveredCheck,
      res.captured,
      keepTurn
    );
  }

  function handleSelectPromotion(piece: Exclude<PieceType, 'p' | 'k'>) {
    if (!pendingPromotion) return;
    const { from, to, color, keepTurn } = pendingPromotion;
    setPendingPromotion(null);
    const res = applyStandardMove(gameState.fen, from, to, piece, keepTurn, gameState.variant);
    if (!res) return;
    if (keepTurn) setArmedTroll(null);
    applyMoveSuccess(
      from,
      to,
      res.fenAfter,
      res.san,
      color,
      res.deliveredCheck,
      res.captured,
      keepTurn
    );
  }

  function handleTrollSquareClick(sq: string) {
    if (!canTroll || !armedTroll) return;
    const map = getBoardMap(gameState.fen);

    if (armedTroll.type === 'snipe') {
      const res = applySnipePiece(gameState.fen, sq, localColor);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(sq, sq, res.fenAfter, res.san, localColor, false, true, true);
      return;
    }

    if (armedTroll.type === 'clone') {
      if (!armedTroll.sourceSquare) {
        const piece = map[sq];
        if (!piece || piece.color !== localColor || piece.type === 'k') return;
        setArmedTroll({ type: 'clone', sourceSquare: sq });
        return;
      }
      const res = applyClonePiece(gameState.fen, armedTroll.sourceSquare, sq, localColor);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(armedTroll.sourceSquare, sq, res.fenAfter, res.san, localColor, false, false, true);
      return;
    }

    if (armedTroll.type === 'swap') {
      if (!armedTroll.firstSquare) {
        const piece = map[sq];
        if (!piece || piece.type === 'k') return;
        setArmedTroll({ type: 'swap', firstSquare: sq });
        return;
      }
      const res = applySwapPieces(gameState.fen, armedTroll.firstSquare, sq);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(armedTroll.firstSquare, sq, res.fenAfter, res.san, localColor, false, false, true);
      return;
    }

    if (armedTroll.type === 'transform') {
      const res = applyTransformPiece(gameState.fen, sq, localColor, armedTroll.targetPiece);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(sq, sq, res.fenAfter, res.san, localColor, false, false, true);
      return;
    }

    if (armedTroll.type === 'resurrect') {
      const res = applyResurrectPiece(gameState.fen, sq, localColor, armedTroll.targetPiece);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(sq, sq, res.fenAfter, res.san, localColor, false, false, true);
      return;
    }

    if (armedTroll.type === 'disguise') {
      const target = map[sq];
      if (!target || target.color !== localColor) return;
      setArmedTroll(null);
      pushCurseUpdate({
        ...cursesSent,
        disguisedSquares: {
          ...cursesSent.disguisedSquares,
          [sq]: armedTroll.disguiseAs,
        },
      });
      return;
    }

    if (armedTroll.type === 'gaslight') {
      if (!armedTroll.firstSquare) {
        setArmedTroll({ type: 'gaslight', firstSquare: sq });
        return;
      }
      const fake = { from: armedTroll.firstSquare, to: sq };
      setArmedTroll(null);
      pushCurseUpdate({
        ...cursesSent,
        gaslightLastMove: fake,
      });
    }
  }

  function cleanupPublishedWatch() {
    if (activeWatchPublishIdRef.current) {
      const oldId = activeWatchPublishIdRef.current;
      activeWatchPublishIdRef.current = null;
      void removeWatchGame(oldId).catch(() => undefined);
    }
  }

  function startHostedRoom(opts: {
    variant: GameVariant;
    timeControlId: string;
    timeControlLabel: string;
    baseMs: number;
    incMs: number;
    preferred: 'random' | PieceColor;
    friendLabel?: string;
  }) {
    cleanupPublishedWatch();
    const code = generateRoomCode();
    const chosenColor: PieceColor =
      opts.preferred === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : opts.preferred;

    setArenaMode('friend');
    setSpectatingGame(null);
    setIsHost(true);
    setInviteJoined(false);
    setInvitePreview(null);
    setChallengedFriendName(opts.friendLabel ?? null);
    setRoomCode(code);
    setLocalColor(chosenColor);
    setBoardOrientation(chosenColor);
    setOpponentName(opts.friendLabel ? `@${opts.friendLabel}` : 'Waiting for opponent…');
    setNetworkMode('connecting');
    setNetworkDetail('Waiting for friend to open the link');
    setDrawOfferedBy(null);
    setRematchRequested(false);
    setPendingPromotion(null);
    setGameState(
      createInitialGameState({
        variant: opts.variant,
        timeControlId: opts.timeControlId,
        timeControlLabel: opts.timeControlLabel,
        baseMs: opts.baseMs,
        incMs: opts.incMs,
        status: 'waiting',
      })
    );
    setCursesSent(emptyCurses());
    setCursesReceived(emptyCurses());
    setChatMessages([
      {
        id: crypto.randomUUID(),
        sender: 'Room',
        text: `Invite created (${code}). Waiting for friend to open link.`,
        ts: Date.now(),
        system: true,
      },
    ]);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('room', code);
    window.history.replaceState({}, '', nextUrl.toString());
    return { code, chosenColor };
  }

  function handleCreateRoom() {
    startHostedRoom({
      variant: selectedVariant,
      timeControlId: activeTimeConfig.id,
      timeControlLabel: activeTimeConfig.label,
      baseMs: activeTimeConfig.baseMs,
      incMs: activeTimeConfig.incMs,
      preferred: preferredColor,
    });
  }

  async function handleLaunchFriendChallenge(input: {
    friend: FriendSummary;
    variant: GameVariant;
    timeControlId: string;
    timeControlLabel: string;
    baseMs: number;
    incMs: number;
    preferredColor: 'random' | PieceColor;
  }) {
    const { code, chosenColor } = startHostedRoom({
      variant: input.variant,
      timeControlId: input.timeControlId,
      timeControlLabel: input.timeControlLabel,
      baseMs: input.baseMs,
      incMs: input.incMs,
      preferred: input.preferredColor,
      friendLabel: input.friend.username,
    });

    await sendDirectChallenge({
      toUserId: input.friend.id,
      roomCode: code,
      variant: input.variant,
      timeControlId: input.timeControlId,
      timeControlLabel: input.timeControlLabel,
      baseMs: input.baseMs,
      incMs: input.incMs,
      hostColor: chosenColor,
    });
    await refreshSocial();
  }

  async function handleAcceptDirectChallenge(challenge: DirectChallengeSummary) {
    cleanupPublishedWatch();
    try {
      await respondDirectChallenge(challenge.id, 'accept');
    } catch {
      // Proceed to room either way
    }
    const assignedColor: PieceColor = challenge.hostColor === 'w' ? 'b' : 'w';
    setArenaMode('friend');
    setSpectatingGame(null);
    setIsHost(false);
    setInviteJoined(true);
    setInvitePreview(null);
    setChallengedFriendName(null);
    setRoomCode(challenge.roomCode);
    setLocalColor(assignedColor);
    setBoardOrientation(assignedColor);
    setOpponentName(`@${challenge.fromUsername}`);
    setNetworkMode('connecting');
    setNetworkDetail(`Connecting to @${challenge.fromUsername}…`);
    setDrawOfferedBy(null);
    setRematchRequested(false);
    setPendingPromotion(null);
    setGameState(
      createInitialGameState({
        variant: challenge.variant,
        timeControlId: challenge.timeControlId,
        timeControlLabel: challenge.timeControlLabel,
        baseMs: challenge.baseMs,
        incMs: challenge.incMs,
        status: 'waiting',
      })
    );
    setCursesSent(emptyCurses());
    setCursesReceived(emptyCurses());

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('room', challenge.roomCode);
    window.history.replaceState({}, '', nextUrl.toString());
    void refreshSocial();
  }

  function handleJoinRoom(e: FormEvent) {
    e.preventDefault();
    let raw = joinInput.trim();
    try {
      if (raw.includes('http') || raw.includes('room=')) {
        const u = new URL(raw.startsWith('http') ? raw : `https://x.com/${raw}`);
        raw = u.searchParams.get('room') || raw;
      }
    } catch {
      // Treat as literal room code
    }
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4 || clean.length > 12) return;

    cleanupPublishedWatch();
    setArenaMode('friend');
    setSpectatingGame(null);
    setIsHost(false);
    setInviteJoined(false);
    setInvitePreview(null);
    setChallengedFriendName(null);
    setRoomCode(clean);
    setOpponentName('Connecting…');
    setNetworkMode('connecting');
    setNetworkDetail(`Inspecting invite ${clean}…`);
    setGameState(
      createInitialGameState({
        variant: selectedVariant,
        timeControlId: activeTimeConfig.id,
        timeControlLabel: activeTimeConfig.label,
        baseMs: activeTimeConfig.baseMs,
        incMs: activeTimeConfig.incMs,
        status: 'waiting',
      })
    );
    setCursesSent(emptyCurses());
    setCursesReceived(emptyCurses());
    setJoinInput('');

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('room', clean);
    window.history.replaceState({}, '', nextUrl.toString());
  }

  function handleAcceptInviteGate() {
    if (!roomCode || !transportRef.current) {
      setInviteJoined(true);
      return;
    }
    setInviteJoined(true);
    transportRef.current.send({
      type: 'hello',
      peerClientId: clientIdRef.current,
      name: localDisplayName,
    });
  }

  function handleLeaveRoom() {
    cleanupPublishedWatch();
    transportRef.current?.destroy();
    transportRef.current = null;
    setRoomCode(null);
    setIsHost(true);
    setInviteJoined(false);
    setInvitePreview(null);
    setChallengedFriendName(null);
    setNetworkMode('idle');
    setNetworkDetail('Ready');
    setOpponentName('Opponent');
    setLocalColor('w');
    setBoardOrientation('w');
    setDrawOfferedBy(null);
    setRematchRequested(false);
    setPendingPromotion(null);
    setRightSetupView('menu');
    setGameState(
      createInitialGameState({
        variant: selectedVariant,
        timeControlId: activeTimeConfig.id,
        timeControlLabel: activeTimeConfig.label,
        baseMs: activeTimeConfig.baseMs,
        incMs: activeTimeConfig.incMs,
        status: 'active',
      })
    );
    setCursesSent(emptyCurses());
    setCursesReceived(emptyCurses());
    setChatMessages([]);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('room');
    window.history.replaceState({}, '', nextUrl.toString());
  }

  function handleStartBotMatch(colorChoice?: PieceColor) {
    cleanupPublishedWatch();
    transportRef.current?.destroy();
    transportRef.current = null;
    const chosen: PieceColor =
      colorChoice ??
      (preferredColor === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : preferredColor);
    activeWatchPublishIdRef.current = `bot-${crypto.randomUUID().slice(0, 8)}`;
    setArenaMode('bot');
    setSpectatingGame(null);
    setRoomCode(null);
    setInviteJoined(false);
    setInvitePreview(null);
    setChallengedFriendName(null);
    setNetworkMode('idle');
    setOpponentName('Chess Bot');
    setLocalColor(chosen);
    setBoardOrientation(chosen);
    setDrawOfferedBy(null);
    setRematchRequested(false);
    setPendingPromotion(null);
    setGameState(
      createInitialGameState({
        variant: selectedVariant,
        timeControlId: activeTimeConfig.id,
        timeControlLabel: activeTimeConfig.label,
        baseMs: activeTimeConfig.baseMs,
        incMs: activeTimeConfig.incMs,
        status: 'active',
      })
    );
    setCursesSent(emptyCurses());
    setCursesReceived(emptyCurses());
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('room');
    window.history.replaceState({}, '', nextUrl.toString());
  }

  async function handleStartSpectating(summary: LiveWatchGameSummary) {
    try {
      const res = await fetchWatchGame(summary.gameId);
      setSpectatingGame(res.game);
      setSpectateOrientation('w');
    } catch {
      void refreshWatchList(watchFilter);
    }
  }

  function handleCopyInvite() {
    if (!roomCode) return;
    const url = `${window.location.origin}/?room=${roomCode}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1800);
    });
  }

  function handleResign() {
    if (gameState.status !== 'active') return;
    const winner: PieceColor = localColor === 'w' ? 'b' : 'w';
    playGameEndSound();
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      status: 'resigned',
      winner,
      statusReason: `${localColor === 'w' ? 'White' : 'Black'} resigned — ${winner === 'w' ? 'White' : 'Black'} wins`,
    });
  }

  function handleOfferOrAcceptDraw() {
    if (gameState.status !== 'active') return;
    if (drawOfferedBy && drawOfferedBy !== localColor) {
      transportRef.current?.send({ type: 'draw_response', accepted: true });
      setDrawOfferedBy(null);
      playGameEndSound();
      commitGameState({
        ...gameState,
        version: gameState.version + 1,
        status: 'draw',
        winner: 'draw',
        statusReason: 'Draw agreed by mutual consent',
      });
      return;
    }
    setDrawOfferedBy(localColor);
    if (roomCode && transportRef.current) {
      transportRef.current.send({ type: 'draw_offer', fromColor: localColor });
      pushSystemChat('Draw offer sent.');
    }
  }

  function handleRematch() {
    if (arenaMode === 'bot') {
      handleStartBotMatch(localColor === 'w' ? 'b' : 'w');
      return;
    }
    if (!roomCode) {
      setGameState(
        createInitialGameState({
          variant: selectedVariant,
          timeControlId: activeTimeConfig.id,
          timeControlLabel: activeTimeConfig.label,
          baseMs: activeTimeConfig.baseMs,
          incMs: activeTimeConfig.incMs,
          status: 'active',
        })
      );
      return;
    }
    if (rematchRequested && transportRef.current) {
      const newHostColor: PieceColor = isHost
        ? localColor === 'w'
          ? 'b'
          : 'w'
        : localColor;
      const fresh = createInitialGameState({
        variant: gameState.variant,
        timeControlId: gameState.timeControlId,
        timeControlLabel: gameState.timeControlLabel,
        baseMs: gameState.baseMs,
        incMs: gameState.incMs,
        status: 'active',
      });
      setLocalColor(isHost ? newHostColor : newHostColor === 'w' ? 'b' : 'w');
      setBoardOrientation(isHost ? newHostColor : newHostColor === 'w' ? 'b' : 'w');
      setGameState(fresh);
      setRematchRequested(false);
      setCursesSent(emptyCurses());
      setCursesReceived(emptyCurses());
      transportRef.current.send({
        type: 'rematch_accept',
        newHostColor,
        state: fresh,
      });
      return;
    }
    transportRef.current?.send({ type: 'rematch_request', fromColor: localColor });
    pushSystemChat('Rematch requested…');
  }

  function handleSendChat(e: FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: localDisplayName,
      text,
      ts: Date.now(),
    };
    setChatMessages((prev) => [...prev.slice(-60), msg]);
    setChatInput('');
    transportRef.current?.send({ type: 'chat', message: msg });
  }

  function handleBrandClick() {
    if (!canTroll) return;
    const now = Date.now();
    const recent = [...brandClickTimestampsRef.current.filter((t) => now - t < 750), now];
    brandClickTimestampsRef.current = recent;
    if (recent.length >= 3) {
      brandClickTimestampsRef.current = [];
      setDrawerOpen((prev) => !prev);
    }
  }

  // Troll actions
  function handleStealTime(seconds: number) {
    if (!canTroll) return;
    const now = Date.now();
    const clocks = computeElapsedMsSnapshot(gameState, now);
    const delta = seconds * 1000;
    const whiteStealing = localColor === 'w';
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      whiteMs: whiteStealing ? clocks.whiteMs + delta : Math.max(1000, clocks.whiteMs - delta),
      blackMs: whiteStealing ? Math.max(1000, clocks.blackMs - delta) : clocks.blackMs + delta,
      lastTickAt: now,
    });
  }

  function handleHalveOpponentTime() {
    if (!canTroll) return;
    const now = Date.now();
    const clocks = computeElapsedMsSnapshot(gameState, now);
    const whiteLocal = localColor === 'w';
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      whiteMs: whiteLocal ? clocks.whiteMs : Math.max(1000, Math.floor(clocks.whiteMs / 2)),
      blackMs: whiteLocal ? Math.max(1000, Math.floor(clocks.blackMs / 2)) : clocks.blackMs,
      lastTickAt: now,
    });
  }

  function handleToggleFreezeClock() {
    if (!canTroll) return;
    const now = Date.now();
    const clocks = computeElapsedMsSnapshot(gameState, now);
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      whiteMs: clocks.whiteMs,
      blackMs: clocks.blackMs,
      lastTickAt: now,
      frozenColor: gameState.frozenColor === localColor ? null : localColor,
    });
  }

  function handleToggleDoubleDrain() {
    if (!canTroll) return;
    const now = Date.now();
    const clocks = computeElapsedMsSnapshot(gameState, now);
    const oppColor: PieceColor = localColor === 'w' ? 'b' : 'w';
    const curMult = gameState.clockSpeedMultiplier?.[oppColor] ?? 1;
    const nextMult = curMult > 1 ? 1 : 2;
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      whiteMs: clocks.whiteMs,
      blackMs: clocks.blackMs,
      lastTickAt: now,
      clockSpeedMultiplier: {
        ...gameState.clockSpeedMultiplier,
        [oppColor]: nextMult,
      },
    });
  }

  function handleSkipOpponentTurn() {
    if (!canTroll || gameState.status !== 'active') return;
    const now = Date.now();
    const clocks = computeElapsedMsSnapshot(gameState, now);
    const fenAfter = forceTurnInFen(gameState.fen, localColor);
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      fen: fenAfter,
      whiteMs: clocks.whiteMs,
      blackMs: clocks.blackMs,
      lastTickAt: now,
    });
  }

  function handleForceUndoOpponent() {
    if (!canTroll || gameState.moves.length === 0) return;
    const prevMoves = gameState.moves.slice(0, -1);
    const lastRemoved = gameState.moves[gameState.moves.length - 1];
    const restoredFen = lastRemoved.fenBefore;
    const prevLastMove =
      prevMoves.length > 0
        ? { from: prevMoves[prevMoves.length - 1].from, to: prevMoves[prevMoves.length - 1].to }
        : null;
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      fen: restoredFen,
      moves: prevMoves,
      lastMove: prevLastMove,
      lastTickAt: Date.now(),
      status: 'active',
      winner: null,
      statusReason: null,
    });
    pushCurseUpdate({
      ...cursesSent,
      arbiterNotice: 'Arbiter: Previous move invalidated.',
    });
  }

  function handleSpawnShieldWall() {
    if (!canTroll) return;
    const res = applyShieldWall(gameState.fen, localColor);
    if (!res) return;
    applyMoveSuccess('e1', 'e1', res.fenAfter, res.san, localColor, false, false, true);
  }

  function handleScrambleOpponent() {
    if (!canTroll) return;
    const opp: PieceColor = localColor === 'w' ? 'b' : 'w';
    const res = applyScramblePieces(gameState.fen, opp);
    if (!res) return;
    applyMoveSuccess('e8', 'e8', res.fenAfter, res.san, localColor, false, false, true);
  }

  function handleForceOpponentBlunder() {
    if (!canTroll || gameState.status !== 'active') return;
    const turn = getTurnFromFen(gameState.fen);
    if (turn === localColor) return;
    void queryEngineAsync(gameState.fen, 'worst', 1).then((worst) => {
      if (!worst) return;
      const applied = applyStandardMove(
        gameStateRef.current.fen,
        worst.from,
        worst.to,
        worst.promotion ?? 'q',
        false,
        gameStateRef.current.variant
      );
      if (applied) {
        applyMoveSuccess(
          worst.from,
          worst.to,
          applied.fenAfter,
          applied.san,
          turn,
          applied.deliveredCheck,
          applied.captured,
          true
        );
      }
    });
  }

  // Active display state (Spectator vs Player)
  const isSpectating = arenaMode === 'watch' && Boolean(spectatingGame);
  const displayFen = isSpectating && spectatingGame ? spectatingGame.fen : gameState.fen;
  const displayVariant = isSpectating && spectatingGame ? spectatingGame.variant : gameState.variant;
  const displayMoves = isSpectating && spectatingGame ? spectatingGame.moves : gameState.moves;
  const displayLastMove = isSpectating && spectatingGame ? spectatingGame.lastMove : gameState.lastMove;
  const displayStatus = isSpectating && spectatingGame ? spectatingGame.status : gameState.status;
  const displayStatusReason = isSpectating && spectatingGame ? spectatingGame.statusReason : gameState.statusReason;
  const displayBaseMs = isSpectating && spectatingGame ? spectatingGame.baseMs : gameState.baseMs;
  const displayWChecks = isSpectating && spectatingGame ? spectatingGame.whiteChecks : gameState.whiteChecks;
  const displayBChecks = isSpectating && spectatingGame ? spectatingGame.blackChecks : gameState.blackChecks;
  const displayOrientation = isSpectating ? spectateOrientation : boardOrientation;

  const currentTurn = useMemo(() => getTurnFromFen(displayFen), [displayFen]);
  const outcome = useMemo(
    () => getOutcomeFromFen(displayFen, displayVariant, displayWChecks, displayBChecks),
    [displayFen, displayVariant, displayWChecks, displayBChecks]
  );
  const captured = useMemo(() => getCapturedPieces(displayFen), [displayFen]);

  const movePairs = useMemo(() => {
    const pairs: Array<{ num: number; white?: string; black?: string }> = [];
    for (let i = 0; i < displayMoves.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: displayMoves[i]?.san,
        black: displayMoves[i + 1]?.san,
      });
    }
    return pairs;
  }, [displayMoves]);

  const isWaitingAtInviteGate =
    arenaMode === 'friend' &&
    Boolean(roomCode) &&
    ((isHost && gameState.status === 'waiting') || (!isHost && !inviteJoined));

  const isMatchView = Boolean(roomCode) || arenaMode === 'bot';

  const topColor: PieceColor = displayOrientation === 'w' ? 'b' : 'w';
  const bottomColor: PieceColor = displayOrientation;

  const topMs = isSpectating && spectatingGame
    ? topColor === 'w'
      ? spectatingGame.whiteMs
      : spectatingGame.blackMs
    : topColor === 'w'
      ? gameState.whiteMs
      : gameState.blackMs;

  const bottomMs = isSpectating && spectatingGame
    ? bottomColor === 'w'
      ? spectatingGame.whiteMs
      : spectatingGame.blackMs
    : bottomColor === 'w'
      ? gameState.whiteMs
      : gameState.blackMs;

  const clocksLive = displayStatus === 'active' && displayMoves.length > 0;
  const topRunning = clocksLive && currentTurn === topColor;
  const bottomRunning = clocksLive && currentTurn === bottomColor;

  const topLabel = isSpectating && spectatingGame
    ? topColor === 'w'
      ? spectatingGame.whiteName
      : spectatingGame.blackName
    : topColor === localColor
      ? localDisplayName
      : opponentName;

  const bottomLabel = isSpectating && spectatingGame
    ? bottomColor === 'w'
      ? spectatingGame.whiteName
      : spectatingGame.blackName
    : bottomColor === localColor
      ? localDisplayName
      : opponentName;

  const topCaptured = topColor === 'w' ? captured.whiteCaptured : captured.blackCaptured;
  const bottomCaptured = bottomColor === 'w' ? captured.whiteCaptured : captured.blackCaptured;
  const topAdv = topColor === 'w' ? captured.whiteAdvantage : -captured.whiteAdvantage;
  const bottomAdv = bottomColor === 'w' ? captured.whiteAdvantage : -captured.whiteAdvantage;

  const topChecks = topColor === 'w' ? displayWChecks : displayBChecks;
  const bottomChecks = bottomColor === 'w' ? displayWChecks : displayBChecks;

  const evalDisplay = useMemo(() => {
    if (!engineHint) return '0.00';
    const val = (engineHint.evalCp / 100).toFixed(2);
    return engineHint.evalCp > 0 ? `+${val}` : val;
  }, [engineHint]);

  const canPlayInteract =
    arenaMode !== 'watch' &&
    gameState.status === 'active' &&
    (arenaMode === 'bot'
      ? currentTurn === localColor
      : roomCode
        ? currentTurn === localColor
        : true);

  const activeVariantLabel =
    GAME_VARIANTS.find((v) => v.id === displayVariant)?.label || 'Standard';

  const socialUnread = social.incomingRequests.length + social.incomingChallenges.length;
  const oppColor: PieceColor = localColor === 'w' ? 'b' : 'w';

  const visibleTimerPresets = TIME_CONTROLS.filter((t) => {
    if (timerCategory === 'Bullet') return t.category === 'Bullet';
    if (timerCategory === 'Blitz') return t.category === 'Blitz';
    if (timerCategory === 'Rapid') return t.category === 'Rapid' || t.category === 'Untimed';
    return false;
  });

  return (
    <div className="chesscom-shell">
      {/* Left Navigation Sidebar (Chess.com 1-to-1) */}
      <aside className="left-nav">
        <div className="left-nav-top">
          <button
            type="button"
            className="chesscom-brand"
            onClick={handleBrandClick}
            aria-label="ChessArena home"
          >
            <BrandCrownIcon size={22} />
            <span className="brand-wordmark">ChessArena</span>
          </button>

          <nav className="left-nav-links" aria-label="Main navigation">
            <button
              type="button"
              className={`left-nav-item ${arenaMode !== 'watch' ? 'is-active' : ''}`}
              onClick={() => {
                setArenaMode('friend');
                setSpectatingGame(null);
                if (!roomCode) {
                  setRightSetupView('menu');
                  setOpponentName('Opponent');
                }
              }}
            >
              <FlipIcon size={17} />
              <span>Play</span>
            </button>

            <button
              type="button"
              className={`left-nav-item ${arenaMode === 'watch' ? 'is-active' : ''}`}
              onClick={() => {
                setArenaMode('watch');
                setSpectatingGame(null);
                void refreshWatchList(watchFilter);
              }}
            >
              <BinocularsIcon size={17} />
              <span>Watch</span>
            </button>

            <button
              type="button"
              className={`left-nav-item ${friendsModalOpen ? 'is-active' : ''}`}
              onClick={() => setFriendsModalOpen(true)}
            >
              <UsersIcon size={17} />
              <span>Friends</span>
              {socialUnread > 0 && <span className="nav-count">{socialUnread}</span>}
            </button>
          </nav>
        </div>

        <div className="left-nav-bottom">
          {!user ? (
            <>
              <button
                type="button"
                className="btn btn-green left-auth-btn"
                onClick={() => {
                  setAccountAuthMode('register');
                  setAccountModalOpen(true);
                }}
              >
                Sign Up
              </button>
              <button
                type="button"
                className="btn btn-secondary left-auth-btn"
                onClick={() => {
                  setAccountAuthMode('login');
                  setAccountModalOpen(true);
                }}
              >
                Log In
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="left-nav-account"
                onClick={() => {
                  setAccountAuthMode('login');
                  setAccountModalOpen(true);
                }}
              >
                <UserIcon size={15} />
                <TitleBadge title={user.title} />
                <span>@{user.username}</span>
              </button>
              <button
                type="button"
                className="left-nav-sound"
                onClick={() => {
                  setProfileModalUser(user.username);
                  setProfileModalOpen(true);
                }}
              >
                My Profile
              </button>
            </>
          )}

          <button
            type="button"
            className="left-nav-sound"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setSoundsMuted(next);
            }}
          >
            {muted ? 'Sound: Off' : 'Sound: On'}
          </button>
        </div>
      </aside>

      {/* Center Board Stage */}
      <main className="chesscom-center">
        <div className="center-board-col">
          {social.incomingChallenges.length > 0 && (
            <div className="match-banner" role="status">
              <span>
                Challenge from <strong>@{social.incomingChallenges[0].fromUsername}</strong> ·{' '}
                {GAME_VARIANTS.find((v) => v.id === social.incomingChallenges[0].variant)?.label || 'Standard'} ·{' '}
                {social.incomingChallenges[0].timeControlLabel}
              </span>
              <div className="banner-actions">
                <button
                  type="button"
                  className="btn btn-green btn-xs"
                  onClick={() => void handleAcceptDirectChallenge(social.incomingChallenges[0])}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() =>
                    void respondDirectChallenge(social.incomingChallenges[0].id, 'decline').then(
                      refreshSocial
                    )
                  }
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {isWaitingAtInviteGate ? (
            <div className="invite-gate-panel">
              <div className="invite-gate-head">
                <h2>
                  {isHost
                    ? challengedFriendName
                      ? `Waiting for @${challengedFriendName}`
                      : 'Invite a friend to play'
                    : invitePreview
                      ? `${invitePreview.hostName} challenged you`
                      : 'Join invited chess match'}
                </h2>
                <p className="muted-copy">
                  {isHost
                    ? 'The board stays closed until your friend opens the invite link.'
                    : 'Review the game mode and timer below, then join to load the board.'}
                </p>
              </div>

              <div className="invite-spec-grid">
                <div className="invite-spec-cell">
                  <span className="spec-label">Mode</span>
                  <strong className="mono-val">
                    {GAME_VARIANTS.find(
                      (v) =>
                        v.id === (isHost ? gameState.variant : invitePreview?.variant ?? gameState.variant)
                    )?.label || 'Standard'}
                  </strong>
                </div>
                <div className="invite-spec-cell">
                  <span className="spec-label">Timer</span>
                  <strong className="mono-val">
                    {isHost
                      ? gameState.timeControlLabel
                      : invitePreview?.timeControlLabel ?? gameState.timeControlLabel}
                  </strong>
                </div>
                <div className="invite-spec-cell">
                  <span className="spec-label">Your Color</span>
                  <strong className="mono-val">
                    {isHost
                      ? localColor === 'w'
                        ? 'White'
                        : 'Black'
                      : invitePreview
                        ? invitePreview.hostColor === 'w'
                          ? 'Black'
                          : 'White'
                        : 'Assigned on join'}
                  </strong>
                </div>
              </div>

              {isHost ? (
                <>
                  <div className="invite-url-box">
                    <span className="mono-val invite-url-text">
                      {`${window.location.origin}/?room=${roomCode}`}
                    </span>
                    <button type="button" className="btn btn-green btn-sm" onClick={handleCopyInvite}>
                      {copySuccess ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                      <span>{copySuccess ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                  <div className="invite-status-row">
                    <span className="spinner-ring" aria-hidden="true" />
                    <span className="muted-copy">
                      {challengedFriendName
                        ? `Challenge sent to @${challengedFriendName} — waiting for acceptance or link open…`
                        : 'Waiting for friend to open the link…'}
                    </span>
                  </div>
                  <div className="invite-gate-actions">
                    <button type="button" className="btn btn-secondary" onClick={handleLeaveRoom}>
                      Cancel Invite
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {!user && (
                    <div className="control-group">
                      <label className="field-label" htmlFor="gate-guest-name">
                        Display name (no account needed)
                      </label>
                      <input
                        id="gate-guest-name"
                        type="text"
                        className="text-input"
                        maxLength={24}
                        value={guestName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGuestName(val);
                          try {
                            localStorage.setItem(GUEST_STORAGE_KEY, val);
                          } catch {
                            // Ignore
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="invite-gate-actions">
                    <button
                      type="button"
                      className="btn btn-green"
                      onClick={handleAcceptInviteGate}
                    >
                      Join Match &amp; Load Board
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleLeaveRoom}>
                      Decline
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {(displayStatusReason ||
                (!isSpectating && drawOfferedBy) ||
                (!isSpectating && !canTroll && cursesReceived.arbiterNotice)) && (
                <div className="match-banner" role="status">
                  <span>
                    {displayStatusReason ||
                      (drawOfferedBy && drawOfferedBy !== localColor
                        ? 'Opponent offered a draw'
                        : drawOfferedBy === localColor
                          ? 'Draw offer sent'
                          : cursesReceived.arbiterNotice)}
                  </span>
                  {!isSpectating && drawOfferedBy && drawOfferedBy !== localColor && gameState.status === 'active' && (
                    <div className="banner-actions">
                      <button
                        type="button"
                        className="btn btn-green btn-xs"
                        onClick={handleOfferOrAcceptDraw}
                      >
                        Accept Draw
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setDrawOfferedBy(null);
                          transportRef.current?.send({ type: 'draw_response', accepted: false });
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )}

              <PlayerClockStrip
                playerName={topLabel}
                playerTitle={!isSpectating ? (topColor === localColor ? (user?.title ?? null) : opponentTitle) : null}
                color={topColor}
                baseMs={displayBaseMs}
                syncedMs={topMs}
                lastTickAt={isSpectating && spectatingGame ? spectatingGame.lastTickAt : gameState.lastTickAt}
                isRunning={topRunning}
                isFrozen={!isSpectating && gameState.frozenColor === topColor}
                speedMultiplier={!isSpectating ? (gameState.clockSpeedMultiplier?.[topColor] ?? 1) : 1}
                capturedPieces={topCaptured}
                materialAdvantage={topAdv}
                checksCount={topChecks}
                showChecks={displayVariant === 'three_check'}
                onTimeout={isSpectating ? () => undefined : handleClockTimeout}
              />

              <ChessBoard
                fen={displayFen}
                variant={displayVariant}
                orientation={displayOrientation}
                playerColor={
                  isSpectating
                    ? 'w'
                    : arenaMode === 'friend' && !roomCode
                      ? currentTurn
                      : localColor
                }
                turnColor={currentTurn}
                canInteract={canPlayInteract}
                isGameOver={displayStatus !== 'active' && displayStatus !== 'waiting'}
                inCheckColor={outcome.inCheckColor}
                lastMove={displayLastMove}
                pendingPromotion={isSpectating ? null : pendingPromotion}
                hintArrow={
                  !isSpectating && canTroll && showEngineHint && engineHint
                    ? { from: engineHint.from, to: engineHint.to }
                    : null
                }
                evalCp={!isSpectating && engineHint ? engineHint.evalCp : null}
                showEvalBar={!isSpectating && canTroll && showEvalBar}
                armedTroll={isSpectating ? null : armedTroll}
                canTroll={!isSpectating && canTroll}
                cursesReceived={isSpectating ? null : cursesReceived}
                onAttemptMove={handleAttemptMove}
                onSelectPromotion={handleSelectPromotion}
                onCancelPromotion={() => setPendingPromotion(null)}
                onTrollSquareClick={handleTrollSquareClick}
              />

              <PlayerClockStrip
                playerName={bottomLabel}
                playerTitle={!isSpectating ? (bottomColor === localColor ? (user?.title ?? null) : opponentTitle) : null}
                color={bottomColor}
                baseMs={displayBaseMs}
                syncedMs={bottomMs}
                lastTickAt={isSpectating && spectatingGame ? spectatingGame.lastTickAt : gameState.lastTickAt}
                isRunning={bottomRunning}
                isFrozen={!isSpectating && gameState.frozenColor === bottomColor}
                speedMultiplier={!isSpectating ? (gameState.clockSpeedMultiplier?.[bottomColor] ?? 1) : 1}
                capturedPieces={bottomCaptured}
                materialAdvantage={bottomAdv}
                checksCount={bottomChecks}
                showChecks={displayVariant === 'three_check'}
                onTimeout={isSpectating ? () => undefined : handleClockTimeout}
              />
            </>
          )}
        </div>
      </main>

      {/* Right Sidebar Card (Chess.com 1-to-1 Play Chess menu / Setup / Watch / Match) */}
      <aside className="right-sidebar">
        {arenaMode === 'watch' ? (
          spectatingGame ? (
            <div className="match-sidebar">
              <div className="match-meta-bar">
                <div className="match-meta-left">
                  <span
                    className={`status-dot ${spectatingGame.status === 'active' ? 'is-live' : 'is-wait'}`}
                  />
                  <strong>
                    {spectatingGame.mode === 'bot' ? 'Player vs Bot' : 'Live Players'}
                  </strong>
                  <span className="mono-muted">
                    {activeVariantLabel} · {spectatingGame.timeControlLabel}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setSpectatingGame(null)}
                >
                  All Games
                </button>
              </div>

              <div className="moves-panel">
                {movePairs.length === 0 ? (
                  <div className="empty-ledger">Waiting for opening move…</div>
                ) : (
                  movePairs.map((pair) => (
                    <div key={pair.num} className="move-row">
                      <span className="move-num">{pair.num}.</span>
                      <span className="move-san">{pair.white}</span>
                      <span className="move-san">{pair.black || ''}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="board-actions-bar">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSpectateOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                >
                  <FlipIcon size={14} />
                  <span>Flip Board</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSpectatingGame(null)}
                >
                  <span>Back to Watch</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="watch-sidebar">
              <div className="play-card-title-row">
                <BinocularsIcon size={22} />
                <h1>Watch Live</h1>
              </div>

              <div className="segmented-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={watchFilter === 'all'}
                  className={`seg-tab ${watchFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setWatchFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={watchFilter === 'pvp'}
                  className={`seg-tab ${watchFilter === 'pvp' ? 'is-active' : ''}`}
                  onClick={() => setWatchFilter('pvp')}
                >
                  Real Players
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={watchFilter === 'bot'}
                  className={`seg-tab ${watchFilter === 'bot' ? 'is-active' : ''}`}
                  onClick={() => setWatchFilter('bot')}
                >
                  Player vs Bots
                </button>
              </div>

              <div className="watch-list">
                {watchList.map((g) => {
                  const vName = GAME_VARIANTS.find((v) => v.id === g.variant)?.label || g.variant;
                  return (
                    <button
                      key={g.gameId}
                      type="button"
                      className="watch-game-card"
                      onClick={() => void handleStartSpectating(g)}
                    >
                      <div className="watch-card-top">
                        <span className="watch-mode-tag">
                          <span className={`status-dot ${g.status === 'active' ? 'is-live' : 'is-wait'}`} />
                          <span>{g.mode === 'bot' ? 'Player vs Bot' : 'Live Players'}</span>
                        </span>
                        <span className="mono-muted">
                          {vName} · {g.timeControlLabel}
                        </span>
                      </div>
                      <div className="watch-players">
                        {g.whiteName} vs {g.blackName}
                      </div>
                      <div className="watch-card-foot">
                        <span className="muted-copy">Move {Math.ceil(g.moveCount / 2)}</span>
                        <span className="watch-cta">Watch</span>
                      </div>
                    </button>
                  );
                })}

                {watchList.length === 0 && !watchLoading && (
                  <div className="empty-watch-box">
                    <p className="muted-copy">
                      No live {watchFilter === 'pvp' ? 'Real Player' : watchFilter === 'bot' ? 'Player vs Bot' : ''} games active right now.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void refreshWatchList(watchFilter)}
                    >
                      Refresh Live Feed
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        ) : !isMatchView ? (
          rightSetupView === 'menu' ? (
            <div className="play-menu-card">
              <div className="play-card-title-row">
                <BrandCrownIcon size={24} />
                <h1>Play Chess</h1>
              </div>

              <div className="chesscom-menu-list">
                <button
                  type="button"
                  className="menu-action-card create-room-btn"
                  onClick={() => setRightSetupView('setup_online')}
                >
                  <span className="menu-icon-wrap is-gold">
                    <BoltIcon size={20} />
                  </span>
                  <span className="menu-text">
                    <strong>Play Online</strong>
                    <span>Create an invite link for a friend</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="menu-action-card"
                  onClick={() => setRightSetupView('setup_bot')}
                >
                  <span className="menu-icon-wrap is-blue">
                    <BotIcon size={20} />
                  </span>
                  <span className="menu-text">
                    <strong>Play Bots</strong>
                    <span>Challenge our Chess Bot at any speed</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="menu-action-card"
                  onClick={() => setFriendsModalOpen(true)}
                >
                  <span className="menu-icon-wrap is-warm">
                    <HandshakeIcon size={20} />
                  </span>
                  <span className="menu-text">
                    <strong>Play a Friend</strong>
                    <span>Challenge friends from your list</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="menu-action-card"
                  onClick={() => {
                    setArenaMode('watch');
                    setSpectatingGame(null);
                    void refreshWatchList(watchFilter);
                  }}
                >
                  <span className="menu-icon-wrap is-sky">
                    <BinocularsIcon size={20} />
                  </span>
                  <span className="menu-text">
                    <strong>Watch Live</strong>
                    <span>Spectate real players or player vs bots</span>
                  </span>
                </button>

                <button
                  type="button"
                  className="menu-action-card"
                  onClick={() => {
                    setSelectedVariant('chess960');
                    setRightSetupView('setup_online');
                  }}
                >
                  <span className="menu-icon-wrap is-green">
                    <CubeVariantIcon size={20} />
                  </span>
                  <span className="menu-text">
                    <strong>Chess Variants</strong>
                    <span>Chess960, Three-Check, KOTH &amp; Atomic</span>
                  </span>
                </button>
              </div>

              <div className="menu-card-footer">
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => setRightSetupView('setup_join')}
                >
                  Join by Code
                </button>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => setFriendsModalOpen(true)}
                >
                  Friends List
                </button>
              </div>
            </div>
          ) : (
            <div className="play-card">
              <div className="setup-back-row">
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setRightSetupView('menu')}
                >
                  ← Back
                </button>
                <h2>
                  {rightSetupView === 'setup_bot'
                    ? 'Play Bots'
                    : rightSetupView === 'setup_join'
                      ? 'Join Match'
                      : 'Play Online'}
                </h2>
              </div>

              {rightSetupView === 'setup_join' ? (
                <form className="form-stack" onSubmit={handleJoinRoom}>
                  <label className="field-label" htmlFor="join-code-input">
                    Invite code or URL
                  </label>
                  <input
                    id="join-code-input"
                    type="text"
                    className="text-input"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="Paste invite code or link"
                  />
                  <button type="submit" className="btn btn-green create-room-btn">
                    Open Invite
                  </button>
                </form>
              ) : (
                <>
                  <div className="control-group">
                    <label className="field-label" htmlFor="lobby-variant-select">
                      Game mode
                    </label>
                    <select
                      id="lobby-variant-select"
                      className="select-input"
                      value={selectedVariant}
                      onChange={(e) => {
                        const v = e.target.value as GameVariant;
                        setSelectedVariant(v);
                        setGameState(
                          createInitialGameState({
                            variant: v,
                            timeControlId: activeTimeConfig.id,
                            timeControlLabel: activeTimeConfig.label,
                            baseMs: activeTimeConfig.baseMs,
                            incMs: activeTimeConfig.incMs,
                            status: 'active',
                          })
                        );
                      }}
                    >
                      {GAME_VARIANTS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} — {v.shortDesc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="control-group">
                    <span className="field-label">Time control</span>
                    <div className="segmented-tabs">
                      {(['Bullet', 'Blitz', 'Rapid', 'Custom'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`seg-tab ${timerCategory === cat ? 'is-active' : ''}`}
                          onClick={() => {
                            setTimerCategory(cat);
                            if (cat === 'Bullet') setSelectedTimeControl('1+0');
                            if (cat === 'Blitz') setSelectedTimeControl('5+0');
                            if (cat === 'Rapid') setSelectedTimeControl('10+0');
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {timerCategory === 'Custom' ? (
                      <div className="custom-timer-row">
                        <label className="custom-timer-field">
                          <span>Minutes</span>
                          <input
                            type="number"
                            className="text-input"
                            min={1}
                            max={180}
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(Number(e.target.value) || 5)}
                          />
                        </label>
                        <label className="custom-timer-field">
                          <span>Increment (s)</span>
                          <input
                            type="number"
                            className="text-input"
                            min={0}
                            max={60}
                            value={customIncrement}
                            onChange={(e) => setCustomIncrement(Number(e.target.value) || 0)}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="preset-grid timer-subgrid">
                        {visibleTimerPresets.map((tc) => (
                          <button
                            key={tc.id}
                            type="button"
                            className={`preset-btn ${selectedTimeControl === tc.id ? 'is-selected' : ''}`}
                            onClick={() => {
                              setSelectedTimeControl(tc.id);
                              setGameState(
                                createInitialGameState({
                                  variant: selectedVariant,
                                  timeControlId: tc.id,
                                  timeControlLabel: tc.label,
                                  baseMs: tc.baseMs,
                                  incMs: tc.incMs,
                                  status: 'active',
                                })
                              );
                            }}
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

                  {rightSetupView === 'setup_bot' ? (
                    <button
                      type="button"
                      className="btn btn-green create-room-btn"
                      onClick={() => handleStartBotMatch()}
                    >
                      Start Bot Match
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-green create-room-btn"
                      onClick={handleCreateRoom}
                    >
                      Create Invite Link
                    </button>
                  )}
                </>
              )}
            </div>
          )
        ) : (
          <div className="match-sidebar">
            <div className="match-meta-bar">
              <div className="match-meta-left">
                <span
                  className={`status-dot ${
                    arenaMode === 'bot' ||
                    networkMode === 'p2p' ||
                    networkMode === 'local-tab' ||
                    networkMode === 'relay'
                      ? 'is-live'
                      : 'is-wait'
                  }`}
                  title={networkDetail}
                />
                <strong>{activeVariantLabel}</strong>
                <span className="mono-muted">{gameState.timeControlLabel}</span>
              </div>
              <div className="match-meta-actions">
                {roomCode && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={handleCopyInvite}
                  >
                    {copySuccess ? 'Copied' : `Room ${roomCode}`}
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-xs" onClick={handleLeaveRoom}>
                  Leave
                </button>
              </div>
            </div>

            <div className="moves-panel">
              {movePairs.length === 0 ? (
                <div className="empty-ledger">
                  {isWaitingAtInviteGate
                    ? 'Board loads as soon as your friend opens the invite link.'
                    : 'No moves played yet.'}
                </div>
              ) : (
                movePairs.map((pair) => (
                  <div key={pair.num} className="move-row">
                    <span className="move-num">{pair.num}.</span>
                    <span className="move-san">{pair.white}</span>
                    <span className="move-san">{pair.black || ''}</span>
                  </div>
                ))
              )}
            </div>

            <div className="board-actions-bar">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBoardOrientation((o) => (o === 'w' ? 'b' : 'w'))}
              >
                <FlipIcon size={14} />
                <span>Flip</span>
              </button>

              {gameState.status === 'active' ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOfferOrAcceptDraw}
                  >
                    <DrawIcon size={14} />
                    <span>{drawOfferedBy && drawOfferedBy !== localColor ? 'Accept' : 'Draw'}</span>
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleResign}>
                    <FlagIcon size={14} />
                    <span>Resign</span>
                  </button>
                </>
              ) : gameState.status !== 'waiting' ? (
                <button type="button" className="btn btn-green btn-sm" onClick={handleRematch}>
                  <span>{rematchRequested ? 'Accept Rematch' : 'Rematch'}</span>
                </button>
              ) : null}
            </div>

            {roomCode && (
              <div className="chat-panel">
                <div className="chat-scroll">
                  {chatMessages.map((m) => (
                    <div key={m.id} className={`chat-line ${m.system ? 'is-system' : ''}`}>
                      {!m.system && <strong>{m.sender}: </strong>}
                      <span>{m.text}</span>
                    </div>
                  ))}
                </div>
                <form className="chat-form" onSubmit={handleSendChat}>
                  <input
                    type="text"
                    className="text-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message…"
                    aria-label="Chat message"
                  />
                  <button type="submit" className="btn btn-secondary" aria-label="Send message">
                    <SendIcon size={14} />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </aside>

      {canTroll && user && (
        <OperatorDrawer
          open={drawerOpen}
          trollAccess={user.trollAccess}
          armed={armedTroll}
          clockFrozen={gameState.frozenColor === localColor}
          opponentClockSpeed={gameState.clockSpeedMultiplier?.[oppColor] ?? 1}
          cursesSent={cursesSent}
          showEngineHint={showEngineHint}
          showEvalBar={showEvalBar}
          evalDisplay={evalDisplay}
          hintMoveLabel={
            engineHint ? `${engineHint.san} (${engineHint.from}→${engineHint.to})` : null
          }
          isMultiplayer={Boolean(roomCode && arenaMode === 'friend')}
          isOpponentTurn={gameState.status === 'active' && currentTurn !== localColor}
          capturedOwnPieces={localColor === 'w' ? captured.blackCaptured : captured.whiteCaptured}
          onClose={() => setDrawerOpen(false)}
          onPanicHide={() => {
            setDrawerOpen(false);
            setShowEngineHint(false);
            setShowEvalBar(false);
            setArmedTroll(null);
          }}
          onSetArmed={setArmedTroll}
          onStealTime={handleStealTime}
          onHalveOpponentTime={handleHalveOpponentTime}
          onToggleFreezeClock={handleToggleFreezeClock}
          onToggleDoubleDrain={handleToggleDoubleDrain}
          onSkipOpponentTurn={handleSkipOpponentTurn}
          onForceUndoOpponent={handleForceUndoOpponent}
          onSpawnShieldWall={handleSpawnShieldWall}
          onScrambleOpponent={handleScrambleOpponent}
          onToggleFlipOpponent={() =>
            pushCurseUpdate({
              ...cursesSent,
              boardFlippedForced: !cursesSent.boardFlippedForced,
            })
          }
          onToggleDrunkPieces={() =>
            pushCurseUpdate({
              ...cursesSent,
              drunkPieces: !cursesSent.drunkPieces,
            })
          }
          onTriggerGhostPieces={() =>
            pushCurseUpdate({
              ...cursesSent,
              ghostPiecesUntil: Date.now() + 6000,
            })
          }
          onTriggerFakeLag={() =>
            pushCurseUpdate({
              ...cursesSent,
              fakeReconnectUntil: Date.now() + 3500,
            })
          }
          onTriggerFakeVictory={() =>
            pushCurseUpdate({
              ...cursesSent,
              fakeOutcomeUntil: Date.now() + 3200,
              fakeOutcomeTitle: 'Checkmate — Opponent Won',
            })
          }
          onTriggerButterfingers={() =>
            pushCurseUpdate({
              ...cursesSent,
              butterfingers: !cursesSent.butterfingers,
            })
          }
          onClearCurses={() => pushCurseUpdate(emptyCurses())}
          onToggleEngineHint={() => setShowEngineHint((s) => !s)}
          onToggleEvalBar={() => setShowEvalBar((s) => !s)}
          onPlayEngineMove={() => {
            if (!engineHint) return;
            const applied = applyStandardMove(
              gameState.fen,
              engineHint.from,
              engineHint.to,
              'q',
              false,
              gameState.variant
            );
            if (applied) {
              applyMoveSuccess(
                engineHint.from,
                engineHint.to,
                applied.fenAfter,
                applied.san,
                currentTurn,
                applied.deliveredCheck,
                applied.captured,
                true
              );
            }
          }}
          onForceOpponentBlunder={handleForceOpponentBlunder}
        />
      )}

      <AccountModal
        open={accountModalOpen}
        initialAuthMode={accountAuthMode}
        guestName={guestName}
        user={user}
        hasOwner={hasOwner}
        requiresClaimCode={requiresClaimCode}
        onClose={() => setAccountModalOpen(false)}
        onGuestNameChange={(name) => {
          setGuestName(name);
          try {
            localStorage.setItem(GUEST_STORAGE_KEY, name);
          } catch {
            // Ignore
          }
        }}
        onUserUpdated={(nextUser, nextHasOwner) => {
          setUser(nextUser);
          if (typeof nextHasOwner === 'boolean') setHasOwner(nextHasOwner);
        }}
        onOpenOperatorDrawer={() => setDrawerOpen(true)}
        onOpenProfile={(uname) => {
          setProfileModalUser(uname);
          setProfileModalOpen(true);
        }}
      />

      <ProfileModal
        open={profileModalOpen}
        initialUsername={profileModalUser}
        currentUser={user}
        onClose={() => setProfileModalOpen(false)}
        onCurrentUserUpdated={(nextUser) => setUser(nextUser)}
      />

      <FriendsModal
        open={friendsModalOpen}
        user={user}
        social={social}
        onClose={() => setFriendsModalOpen(false)}
        onRefreshSocial={refreshSocial}
        onOpenAccount={() => {
          setAccountAuthMode('login');
          setAccountModalOpen(true);
        }}
        onLaunchChallenge={handleLaunchFriendChallenge}
        onAcceptChallenge={handleAcceptDirectChallenge}
      />
    </div>
  );
}
