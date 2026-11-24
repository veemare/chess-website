import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AccountModal } from './components/AccountModal';
import { ChessBoard } from './components/ChessBoard';
import { ChessPiece } from './components/ChessPiece';
import { FriendsModal } from './components/FriendsModal';
import {
  BotIcon,
  BrandCrownIcon,
  CheckIcon,
  CopyIcon,
  DrawIcon,
  FlagIcon,
  FlipIcon,
  SendIcon,
  UserIcon,
  UsersIcon,
} from './components/Icons';
import { OperatorDrawer } from './components/OperatorDrawer';
import {
  applyResurrectPiece,
  applyStandardMove,
  applyTransformPiece,
  applyTrollMovePiece,
  findBestMove,
  forceTurnInFen,
  generateStartFenForVariant,
  getBoardMap,
  getCapturedPieces,
  getLegalMovesFromSquare,
  getOutcomeFromFen,
  getTurnFromFen,
  needsPromotion,
} from './engine/chessCore';
import {
  fetchAuthMe,
  fetchSocialState,
  respondDirectChallenge,
  sendDirectChallenge,
} from './services/api';
import { generateRoomCode, RoomTransport } from './services/multiplayer';
import {
  GAME_VARIANTS,
  TIME_CONTROLS,
  type AuthoritativeGameState,
  type ChatMessage,
  type DirectChallengeSummary,
  type FriendSummary,
  type GameVariant,
  type OpponentCurseState,
  type PieceColor,
  type PieceType,
  type PublicUser,
  type RoomNetworkMode,
  type RoomWireMessage,
  type SocialStateResponse,
  type TrollArmedAction,
} from './types/chess';

const GUEST_STORAGE_KEY = 'vesper64_guest_name';

type TimerCategory = 'Bullet' | 'Blitz' | 'Rapid' | 'Custom';

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

function formatClock(ms: number, untimed: boolean): string {
  if (untimed) return '∞';
  const clamped = Math.max(0, ms);
  const totalTenths = Math.floor(clamped / 100);
  const mins = Math.floor(totalTenths / 600);
  const secs = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (clamped < 20_000) {
    return `${mm}:${ss}.${tenths}`;
  }
  return `${mm}:${ss}`;
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
  return `Guest-${Math.floor(100 + Math.random() * 900)}`;
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

export default function App() {
  const clientIdRef = useRef<string>(getOrCreateClientId());
  const transportRef = useRef<RoomTransport | null>(null);
  const brandClickTimestampsRef = useRef<number[]>([]);

  // Auth & optional account state
  const [user, setUser] = useState<PublicUser | null>(null);
  const [hasOwner, setHasOwner] = useState(true);
  const [requiresClaimCode, setRequiresClaimCode] = useState(false);
  const [guestName, setGuestName] = useState<string>(loadGuestName);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [social, setSocial] = useState<SocialStateResponse>(emptySocial);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Lobby & Variant / Timer config
  const [arenaMode, setArenaMode] = useState<'friend' | 'bot'>('friend');
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
  const [networkDetail, setNetworkDetail] = useState<string>('Ready to create or join a room');
  const [opponentName, setOpponentName] = useState<string>(() =>
    parseRoomFromUrl() ? 'Waiting for opponent…' : 'Practice Board'
  );
  const [joinInput, setJoinInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

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
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
    color: PieceColor;
    keepTurn: boolean;
  } | null>(null);
  const [drawOfferedBy, setDrawOfferedBy] = useState<PieceColor | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);

  // Right-rail / chat
  const [railTab, setRailTab] = useState<'moves' | 'chat'>('moves');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Concealed Troll / Operator State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [armedTroll, setArmedTroll] = useState<TrollArmedAction>(null);
  const [showEngineHint, setShowEngineHint] = useState(false);
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
    if (!user) {
      setSocial(emptySocial());
      return;
    }
    try {
      const res = await fetchSocialState();
      setSocial(res);
    } catch {
      // Ignore transient poll errors
    }
  }, [user]);

  // Poll friends, online presence, and incoming challenges when signed in
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
    }, 4500);
    return () => window.clearInterval(id);
  }, [user, refreshSocial]);

  // Track temporary troll grant expiration cleanly
  useEffect(() => {
    if (!user?.trollAccess.active || user.trollAccess.permanent) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, [user]);

  // Wipe private troll state if access expires or user signs out
  useEffect(() => {
    if (!canTroll) {
      setDrawerOpen(false);
      setArmedTroll(null);
      setShowEngineHint(false);
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
      if (e.key === 'Escape' && canTroll && (drawerOpen || showEngineHint || armedTroll)) {
        setDrawerOpen(false);
        setShowEngineHint(false);
        setArmedTroll(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canTroll, drawerOpen, showEngineHint, armedTroll]);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const localColorRef = useRef(localColor);
  localColorRef.current = localColor;
  const localDisplayNameRef = useRef(localDisplayName);
  localDisplayNameRef.current = localDisplayName;
  const cursesSentRef = useRef(cursesSent);
  cursesSentRef.current = cursesSent;
  const inviteJoinedRef = useRef(inviteJoined);
  inviteJoinedRef.current = inviteJoined;

  const pushSystemChat = useCallback((text: string) => {
    setChatMessages((prev) => [
      ...prev.slice(-80),
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
            pushSystemChat(`${msg.name} opened the link and joined.`);
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
          setChatMessages((prev) => [...prev.slice(-80), msg.message]);
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

  // Countdown clock loop
  useEffect(() => {
    if (gameState.baseMs === 0) return;
    if (gameState.status !== 'active' || gameState.moves.length === 0) return;

    const timer = window.setInterval(() => {
      setGameState((prev) => {
        if (prev.status !== 'active' || prev.moves.length === 0 || prev.baseMs === 0) return prev;
        const turn = getTurnFromFen(prev.fen);
        if (prev.frozenColor === turn) return prev;

        const delta = 100;
        const nextWhite = turn === 'w' ? Math.max(0, prev.whiteMs - delta) : prev.whiteMs;
        const nextBlack = turn === 'b' ? Math.max(0, prev.blackMs - delta) : prev.blackMs;

        if (nextWhite <= 0 || nextBlack <= 0) {
          const winner: PieceColor = nextWhite <= 0 ? 'b' : 'w';
          const finished: AuthoritativeGameState = {
            ...prev,
            version: prev.version + 1,
            whiteMs: nextWhite,
            blackMs: nextBlack,
            status: 'timeout',
            winner,
            statusReason: `${winner === 'w' ? 'White' : 'Black'} wins on time`,
          };
          if (roomCode && transportRef.current) {
            transportRef.current.send({
              type: 'state_update',
              state: finished,
              senderClientId: clientIdRef.current,
            });
          }
          return finished;
        }

        return {
          ...prev,
          whiteMs: nextWhite,
          blackMs: nextBlack,
        };
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [gameState.status, gameState.baseMs, gameState.moves.length, roomCode]);

  // Expire fake reconnect banner automatically
  useEffect(() => {
    const until = cursesReceived.fakeReconnectUntil;
    if (!until) return;
    const msLeft = until - Date.now();
    if (msLeft <= 0) {
      setCursesReceived((prev) => ({ ...prev, fakeReconnectUntil: null }));
      return;
    }
    const t = window.setTimeout(() => {
      setCursesReceived((prev) => ({ ...prev, fakeReconnectUntil: null }));
    }, msLeft + 30);
    return () => window.clearTimeout(t);
  }, [cursesReceived.fakeReconnectUntil]);

  // Bot turn execution
  useEffect(() => {
    if (arenaMode !== 'bot' || gameState.status !== 'active') return;
    const turn = getTurnFromFen(gameState.fen);
    if (turn === localColor) return;

    const timer = window.setTimeout(() => {
      const current = gameStateRef.current;
      if (current.status !== 'active') return;

      let chosen = findBestMove(current.fen, 3);
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

      // Fallback for Atomic if best move blew up bot's own king
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

      if (!chosen || !applied) return;

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
        whiteMs: turn === 'w' && current.incMs ? current.whiteMs + current.incMs : current.whiteMs,
        blackMs: turn === 'b' && current.incMs ? current.blackMs + current.incMs : current.blackMs,
        whiteChecks: nextWChecks,
        blackChecks: nextBChecks,
        status: outcome.status,
        winner: outcome.winner,
        statusReason: outcome.reason,
      });
    }, 320);

    return () => window.clearTimeout(timer);
  }, [arenaMode, gameState.fen, gameState.status, localColor]);

  // Compute private Arbiter eval & best move ONLY for authorized troll users
  useEffect(() => {
    if (!canTroll || (!drawerOpen && !showEngineHint)) {
      setEngineHint(null);
      return;
    }
    if (gameState.status !== 'active') {
      setEngineHint(null);
      return;
    }
    const timer = window.setTimeout(() => {
      const best = findBestMove(gameState.fen, 3);
      if (best) {
        setEngineHint({
          from: best.from,
          to: best.to,
          san: best.san,
          evalCp: best.evalCp,
        });
      }
    }, 40);
    return () => window.clearTimeout(timer);
  }, [canTroll, drawerOpen, showEngineHint, gameState.fen, gameState.status]);

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
    isTrollMove = false
  ) {
    const nextWChecks =
      gameState.variant === 'three_check' && movedColor === 'w' && deliveredCheck
        ? gameState.whiteChecks + 1
        : gameState.whiteChecks;
    const nextBChecks =
      gameState.variant === 'three_check' && movedColor === 'b' && deliveredCheck
        ? gameState.blackChecks + 1
        : gameState.blackChecks;

    const outcome = getOutcomeFromFen(fenAfter, gameState.variant, nextWChecks, nextBChecks);

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
          ? gameState.whiteMs + gameState.incMs
          : gameState.whiteMs,
      blackMs:
        !isTrollMove && movedColor === 'b' && gameState.incMs
          ? gameState.blackMs + gameState.incMs
          : gameState.blackMs,
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
    if (gameState.status !== 'active') return;
    const turn = getTurnFromFen(gameState.fen);

    if (canTroll && (armedTroll?.type === 'teleport' || armedTroll?.type === 'steal_piece')) {
      const res = applyTrollMovePiece(gameState.fen, from, to, false);
      if (res) {
        setArmedTroll(null);
        applyMoveSuccess(from, to, res.fenAfter, res.san, turn, res.deliveredCheck, true);
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
    applyMoveSuccess(from, to, res.fenAfter, res.san, turn, res.deliveredCheck, keepTurn);
  }

  function handleSelectPromotion(piece: Exclude<PieceType, 'p' | 'k'>) {
    if (!pendingPromotion) return;
    const { from, to, color, keepTurn } = pendingPromotion;
    setPendingPromotion(null);
    const res = applyStandardMove(gameState.fen, from, to, piece, keepTurn, gameState.variant);
    if (!res) return;
    if (keepTurn) setArmedTroll(null);
    applyMoveSuccess(from, to, res.fenAfter, res.san, color, res.deliveredCheck, keepTurn);
  }

  function handleTrollSquareClick(sq: string) {
    if (!canTroll || !armedTroll) return;
    const map = getBoardMap(gameState.fen);

    if (armedTroll.type === 'transform') {
      const res = applyTransformPiece(gameState.fen, sq, localColor, armedTroll.targetPiece);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(sq, sq, res.fenAfter, res.san, localColor, false, true);
      return;
    }

    if (armedTroll.type === 'resurrect') {
      const res = applyResurrectPiece(gameState.fen, sq, localColor, armedTroll.targetPiece);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(sq, sq, res.fenAfter, res.san, localColor, false, true);
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

  function startHostedRoom(opts: {
    variant: GameVariant;
    timeControlId: string;
    timeControlLabel: string;
    baseMs: number;
    incMs: number;
    preferred: 'random' | PieceColor;
    friendLabel?: string;
  }) {
    const code = generateRoomCode();
    const chosenColor: PieceColor =
      opts.preferred === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : opts.preferred;

    setArenaMode('friend');
    setIsHost(true);
    setInviteJoined(false);
    setInvitePreview(null);
    setChallengedFriendName(opts.friendLabel ?? null);
    setRoomCode(code);
    setLocalColor(chosenColor);
    setBoardOrientation(chosenColor);
    setOpponentName(opts.friendLabel ? `@${opts.friendLabel}` : 'Waiting for friend…');
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
    try {
      await respondDirectChallenge(challenge.id, 'accept');
    } catch {
      // Proceed to room either way
    }
    const assignedColor: PieceColor = challenge.hostColor === 'w' ? 'b' : 'w';
    setArenaMode('friend');
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

    setArenaMode('friend');
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
    transportRef.current?.destroy();
    transportRef.current = null;
    setRoomCode(null);
    setIsHost(true);
    setInviteJoined(false);
    setInvitePreview(null);
    setChallengedFriendName(null);
    setNetworkMode('idle');
    setNetworkDetail('Ready to create or join a room');
    setOpponentName('Practice Board');
    setLocalColor('w');
    setBoardOrientation('w');
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
    setChatMessages([]);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('room');
    window.history.replaceState({}, '', nextUrl.toString());
  }

  function handleStartBotMatch(colorChoice: PieceColor = 'w') {
    transportRef.current?.destroy();
    transportRef.current = null;
    setArenaMode('bot');
    setRoomCode(null);
    setInviteJoined(false);
    setInvitePreview(null);
    setChallengedFriendName(null);
    setNetworkMode('idle');
    setOpponentName('Vesper Engine (Depth 3)');
    setLocalColor(colorChoice);
    setBoardOrientation(colorChoice);
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
    setChatMessages((prev) => [...prev.slice(-80), msg]);
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

  // Troll Clock & Rule actions
  function handleStealTime(seconds: number) {
    if (!canTroll) return;
    const delta = seconds * 1000;
    const whiteStealing = localColor === 'w';
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      whiteMs: whiteStealing ? gameState.whiteMs + delta : Math.max(1000, gameState.whiteMs - delta),
      blackMs: whiteStealing ? Math.max(1000, gameState.blackMs - delta) : gameState.blackMs + delta,
    });
  }

  function handleHalveOpponentTime() {
    if (!canTroll) return;
    const whiteLocal = localColor === 'w';
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      whiteMs: whiteLocal ? gameState.whiteMs : Math.max(1000, Math.floor(gameState.whiteMs / 2)),
      blackMs: whiteLocal ? Math.max(1000, Math.floor(gameState.blackMs / 2)) : gameState.blackMs,
    });
  }

  function handleToggleFreezeClock() {
    if (!canTroll) return;
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      frozenColor: gameState.frozenColor === localColor ? null : localColor,
    });
  }

  function handleSkipOpponentTurn() {
    if (!canTroll || gameState.status !== 'active') return;
    const fenAfter = forceTurnInFen(gameState.fen, localColor);
    commitGameState({
      ...gameState,
      version: gameState.version + 1,
      fen: fenAfter,
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
      status: 'active',
      winner: null,
      statusReason: null,
    });
    pushCurseUpdate({
      ...cursesSent,
      arbiterNotice: 'Arbiter: Previous move invalidated.',
    });
  }

  // Derived view metrics
  const currentTurn = getTurnFromFen(gameState.fen);
  const outcome = getOutcomeFromFen(
    gameState.fen,
    gameState.variant,
    gameState.whiteChecks,
    gameState.blackChecks
  );
  const captured = useMemo(() => getCapturedPieces(gameState.fen), [gameState.fen]);
  const isUntimed = gameState.baseMs === 0;

  const isWaitingAtInviteGate =
    arenaMode === 'friend' &&
    Boolean(roomCode) &&
    ((isHost && gameState.status === 'waiting') || (!isHost && !inviteJoined));

  const topColor: PieceColor = boardOrientation === 'w' ? 'b' : 'w';
  const bottomColor: PieceColor = boardOrientation;

  const topMs = topColor === 'w' ? gameState.whiteMs : gameState.blackMs;
  const bottomMs = bottomColor === 'w' ? gameState.whiteMs : gameState.blackMs;
  const topActive = gameState.status === 'active' && currentTurn === topColor;
  const bottomActive = gameState.status === 'active' && currentTurn === bottomColor;

  const topLabel =
    topColor === localColor
      ? `${localDisplayName} (${topColor === 'w' ? 'White' : 'Black'})`
      : `${opponentName} (${topColor === 'w' ? 'White' : 'Black'})`;
  const bottomLabel =
    bottomColor === localColor
      ? `${localDisplayName} (${bottomColor === 'w' ? 'White' : 'Black'})`
      : `${opponentName} (${bottomColor === 'w' ? 'White' : 'Black'})`;

  const topCaptured = topColor === 'w' ? captured.whiteCaptured : captured.blackCaptured;
  const bottomCaptured = bottomColor === 'w' ? captured.whiteCaptured : captured.blackCaptured;
  const topAdv = topColor === 'w' ? captured.whiteAdvantage : -captured.whiteAdvantage;
  const bottomAdv = bottomColor === 'w' ? captured.whiteAdvantage : -captured.whiteAdvantage;

  const topChecks = topColor === 'w' ? gameState.whiteChecks : gameState.blackChecks;
  const bottomChecks = bottomColor === 'w' ? gameState.whiteChecks : gameState.blackChecks;

  const movePairs = useMemo(() => {
    const pairs: Array<{ num: number; white?: string; black?: string; activePly: number }> = [];
    for (let i = 0; i < gameState.moves.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: gameState.moves[i]?.san,
        black: gameState.moves[i + 1]?.san,
        activePly: gameState.moves.length,
      });
    }
    return pairs;
  }, [gameState.moves]);

  const evalDisplay = useMemo(() => {
    if (!engineHint) return '0.00';
    const val = (engineHint.evalCp / 100).toFixed(2);
    return engineHint.evalCp > 0 ? `+${val}` : val;
  }, [engineHint]);

  const canPlayInteract =
    gameState.status === 'active' &&
    (arenaMode === 'bot'
      ? currentTurn === localColor
      : roomCode
        ? currentTurn === localColor
        : true);

  const lastMoveText = gameState.lastMove
    ? `${gameState.lastMove.from}→${gameState.lastMove.to}`
    : 'startpos';

  const activeVariantLabel =
    GAME_VARIANTS.find((v) => v.id === gameState.variant)?.label || 'Standard';

  const socialUnread = social.incomingRequests.length + social.incomingChallenges.length;

  const visibleTimerPresets = TIME_CONTROLS.filter((t) => {
    if (timerCategory === 'Bullet') return t.category === 'Bullet';
    if (timerCategory === 'Blitz') return t.category === 'Blitz';
    if (timerCategory === 'Rapid') return t.category === 'Rapid' || t.category === 'Untimed';
    return false;
  });

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-group">
          <button
            type="button"
            className="brand-btn"
            onClick={handleBrandClick}
            aria-label="Vesper64 home"
          >
            <BrandCrownIcon size={20} />
            <span className="brand-wordmark">Vesper64</span>
          </button>

          <nav className="mode-nav" aria-label="Play mode">
            <button
              type="button"
              className={`nav-tab ${arenaMode === 'friend' ? 'is-active' : ''}`}
              onClick={() => {
                setArenaMode('friend');
                if (!roomCode) {
                  setOpponentName('Practice Board');
                }
              }}
            >
              Play Friend
            </button>
            <button
              type="button"
              className={`nav-tab ${arenaMode === 'bot' ? 'is-active' : ''}`}
              onClick={() => handleStartBotMatch('w')}
            >
              <BotIcon size={14} />
              <span>Play Bot</span>
            </button>
            <button
              type="button"
              className={`nav-tab ${friendsModalOpen ? 'is-active' : ''}`}
              onClick={() => setFriendsModalOpen(true)}
            >
              <UsersIcon size={14} />
              <span>Friends</span>
              {socialUnread > 0 && <span className="nav-count">{socialUnread}</span>}
            </button>
          </nav>
        </div>

        <div className="top-telemetry">
          {roomCode && arenaMode === 'friend' && (
            <div className="room-pill">
              <span
                className={`status-dot ${
                  networkMode === 'p2p' || networkMode === 'local-tab' || networkMode === 'relay'
                    ? 'is-live'
                    : 'is-wait'
                }`}
                aria-hidden="true"
              />
              <span className="mono-val">ROOM {roomCode}</span>
              <span className="room-divider" aria-hidden="true" />
              <span className="mono-muted">{gameState.timeControlLabel}</span>
              <button
                type="button"
                className="copy-inline-btn"
                onClick={handleCopyInvite}
                title="Copy shareable invite URL"
              >
                {copySuccess ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                <span>{copySuccess ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary account-trigger"
            onClick={() => setAccountModalOpen(true)}
          >
            <UserIcon size={14} />
            <span>{user ? `@${user.username}` : guestName}</span>
          </button>
        </div>
      </header>

      <main className={`arena-grid ${canTroll && drawerOpen ? 'has-operator' : ''}`}>
        <aside className={`telemetry-rail ${arenaMode === 'friend' && !roomCode ? 'is-idle' : ''}`}>
          <section className={`clock-specimen clock-top ${topActive ? 'is-active' : ''} ${!isUntimed && topMs < 20_000 ? 'is-urgent' : ''}`}>
            <div className="clock-meta">
              <span className="player-name">{topLabel}</span>
              <span className="turn-tag">
                {gameState.variant === 'three_check'
                  ? `Checks ${topChecks}/3 · ${topActive ? 'Active' : 'Standby'}`
                  : topActive
                    ? 'Active'
                    : 'Standby'}
              </span>
            </div>
            <div className="clock-axis" aria-hidden="true">
              <span className="clock-axis-dot" />
            </div>
            <div className="clock-digits">{formatClock(topMs, isUntimed)}</div>
            <div className="captures-strip">
              <div className="captures-icons">
                {topCaptured.map((p, idx) => (
                  <span key={`${p}-${idx}`} className="mini-piece">
                    <ChessPiece color={topColor === 'w' ? 'b' : 'w'} type={p} />
                  </span>
                ))}
              </div>
              {topAdv > 0 && <span className="mono-val">+{topAdv}</span>}
            </div>
          </section>

          <section className="rail-center">
            {arenaMode === 'friend' && !roomCode ? (
              <div className="room-setup">
                <h1>Online Match Room</h1>
                <p className="muted-copy">
                  Share an invite link. The board loads once your friend opens it.
                </p>

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
                        <span>Min</span>
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
                        <span>Inc (s)</span>
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

                <button
                  type="button"
                  className="btn btn-primary create-room-btn"
                  onClick={handleCreateRoom}
                >
                  Create Invite Link
                </button>

                <form className="join-form" onSubmit={handleJoinRoom}>
                  <input
                    type="text"
                    className="text-input"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="Paste code or room link"
                    aria-label="Room code or invite link"
                  />
                  <button type="submit" className="btn btn-secondary">
                    Join
                  </button>
                </form>
              </div>
            ) : (
              <div className="match-ledger-wrap">
                <div className="ledger-head">
                  <div className="segmented-tabs">
                    <button
                      type="button"
                      className={`seg-tab ${railTab === 'moves' ? 'is-active' : ''}`}
                      onClick={() => setRailTab('moves')}
                    >
                      Moves ({gameState.moves.length})
                    </button>
                    <button
                      type="button"
                      className={`seg-tab ${railTab === 'chat' ? 'is-active' : ''}`}
                      onClick={() => setRailTab('chat')}
                    >
                      Room Chat
                    </button>
                  </div>
                  {roomCode && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={handleLeaveRoom}
                    >
                      Leave
                    </button>
                  )}
                </div>

                <div className="telemetry-strip">
                  <span>{activeVariantLabel}</span>
                  <span>PLY {String(gameState.moves.length).padStart(2, '0')} · {lastMoveText}</span>
                  <span>{roomCode ? networkDetail.split(' ')[0] : 'Local AI'}</span>
                </div>

                {railTab === 'moves' ? (
                  <div className="moves-scroll">
                    {movePairs.length === 0 ? (
                      <div className="empty-ledger">
                        {isWaitingAtInviteGate
                          ? 'Board will load as soon as your friend opens the invite link.'
                          : 'Make the opening move on the board.'}
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
                ) : (
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
                        placeholder="Message opponent…"
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
          </section>

          <section className={`clock-specimen clock-bottom ${bottomActive ? 'is-active' : ''} ${!isUntimed && bottomMs < 20_000 ? 'is-urgent' : ''}`}>
            <div className="clock-meta">
              <span className="player-name">{bottomLabel}</span>
              <span className="turn-tag">
                {gameState.variant === 'three_check'
                  ? `Checks ${bottomChecks}/3 · ${bottomActive ? 'Your turn' : 'Standby'}`
                  : bottomActive
                    ? 'Your turn'
                    : 'Standby'}
              </span>
            </div>
            <div className="clock-axis" aria-hidden="true">
              <span className="clock-axis-dot" />
            </div>
            <div className="clock-digits">{formatClock(bottomMs, isUntimed)}</div>
            <div className="captures-strip">
              <div className="captures-icons">
                {bottomCaptured.map((p, idx) => (
                  <span key={`${p}-${idx}`} className="mini-piece">
                    <ChessPiece color={bottomColor === 'w' ? 'b' : 'w'} type={p} />
                  </span>
                ))}
              </div>
              {bottomAdv > 0 && <span className="mono-val">+{bottomAdv}</span>}
            </div>
          </section>
        </aside>

        <section className="board-stage">
          <div className="stage-inner">
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
                    className="btn btn-primary btn-xs"
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
                      ? 'The board stays closed until your friend opens the link and joins.'
                      : 'Review the match rules below and click Join Match to load the board.'}
                  </p>
                </div>

                <div className="invite-spec-grid">
                  <div className="invite-spec-cell">
                    <span className="spec-label">Mode</span>
                    <strong className="mono-val">
                      {GAME_VARIANTS.find(
                        (v) => v.id === (isHost ? gameState.variant : invitePreview?.variant ?? gameState.variant)
                      )?.label || 'Standard'}
                    </strong>
                  </div>
                  <div className="invite-spec-cell">
                    <span className="spec-label">Timer</span>
                    <strong className="mono-val">
                      {isHost ? gameState.timeControlLabel : invitePreview?.timeControlLabel ?? gameState.timeControlLabel}
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
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleCopyInvite}>
                        {copySuccess ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                        <span>{copySuccess ? 'Copied' : 'Copy Invite Link'}</span>
                      </button>
                    </div>
                    <div className="invite-status-row">
                      <span className="spinner-ring" aria-hidden="true" />
                      <span className="muted-copy">
                        {challengedFriendName
                          ? `Direct challenge sent to @${challengedFriendName} — waiting for acceptance or link open…`
                          : 'Waiting for your friend to open the link…'}
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
                        className="btn btn-primary"
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
                {(gameState.statusReason || drawOfferedBy || (!canTroll && cursesReceived.arbiterNotice)) && (
                  <div className="match-banner" role="status">
                    <span>
                      {gameState.statusReason ||
                        (drawOfferedBy && drawOfferedBy !== localColor
                          ? 'Opponent offered a draw'
                          : drawOfferedBy === localColor
                            ? 'Draw offer sent'
                            : cursesReceived.arbiterNotice)}
                    </span>
                    {drawOfferedBy && drawOfferedBy !== localColor && gameState.status === 'active' && (
                      <div className="banner-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
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

                <ChessBoard
                  fen={gameState.fen}
                  variant={gameState.variant}
                  orientation={boardOrientation}
                  playerColor={arenaMode === 'friend' && !roomCode ? currentTurn : localColor}
                  turnColor={currentTurn}
                  canInteract={canPlayInteract}
                  isGameOver={gameState.status !== 'active' && gameState.status !== 'waiting'}
                  inCheckColor={outcome.inCheckColor}
                  lastMove={gameState.lastMove}
                  pendingPromotion={pendingPromotion}
                  hintArrow={
                    canTroll && showEngineHint && engineHint
                      ? { from: engineHint.from, to: engineHint.to }
                      : null
                  }
                  armedTroll={armedTroll}
                  canTroll={canTroll}
                  cursesReceived={cursesReceived}
                  onAttemptMove={handleAttemptMove}
                  onSelectPromotion={handleSelectPromotion}
                  onCancelPromotion={() => setPendingPromotion(null)}
                  onTrollSquareClick={handleTrollSquareClick}
                />

                <div className="board-actions-bar">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setBoardOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                  >
                    <FlipIcon size={15} />
                    <span>Flip Board</span>
                  </button>

                  {!roomCode && arenaMode === 'friend' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
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
                      }}
                    >
                      <span>Reset Board</span>
                    </button>
                  ) : gameState.status === 'active' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleOfferOrAcceptDraw}
                      >
                        <DrawIcon size={15} />
                        <span>
                          {drawOfferedBy && drawOfferedBy !== localColor ? 'Accept Draw' : 'Offer Draw'}
                        </span>
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={handleResign}>
                        <FlagIcon size={15} />
                        <span>Resign</span>
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={handleRematch}>
                      <span>{rematchRequested ? 'Accept Rematch' : 'New Match / Rematch'}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {canTroll && user && (
          <OperatorDrawer
            open={drawerOpen}
            trollAccess={user.trollAccess}
            armed={armedTroll}
            clockFrozen={gameState.frozenColor === localColor}
            cursesSent={cursesSent}
            showEngineHint={showEngineHint}
            evalDisplay={evalDisplay}
            hintMoveLabel={
              engineHint ? `${engineHint.san} (${engineHint.from}→${engineHint.to})` : null
            }
            isMultiplayer={Boolean(roomCode && arenaMode === 'friend')}
            capturedOwnPieces={localColor === 'w' ? captured.blackCaptured : captured.whiteCaptured}
            onClose={() => setDrawerOpen(false)}
            onPanicHide={() => {
              setDrawerOpen(false);
              setShowEngineHint(false);
              setArmedTroll(null);
            }}
            onSetArmed={setArmedTroll}
            onStealTime={handleStealTime}
            onHalveOpponentTime={handleHalveOpponentTime}
            onToggleFreezeClock={handleToggleFreezeClock}
            onSkipOpponentTurn={handleSkipOpponentTurn}
            onForceUndoOpponent={handleForceUndoOpponent}
            onToggleFlipOpponent={() =>
              pushCurseUpdate({
                ...cursesSent,
                boardFlippedForced: !cursesSent.boardFlippedForced,
              })
            }
            onTriggerFakeLag={() =>
              pushCurseUpdate({
                ...cursesSent,
                fakeReconnectUntil: Date.now() + 3500,
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
                  true
                );
              }
            }}
          />
        )}
      </main>

      <AccountModal
        open={accountModalOpen}
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
      />

      <FriendsModal
        open={friendsModalOpen}
        user={user}
        social={social}
        onClose={() => setFriendsModalOpen(false)}
        onRefreshSocial={refreshSocial}
        onOpenAccount={() => setAccountModalOpen(true)}
        onLaunchChallenge={handleLaunchFriendChallenge}
        onAcceptChallenge={handleAcceptDirectChallenge}
      />
    </div>
  );
}
