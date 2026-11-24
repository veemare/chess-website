import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Chess } from 'chess.js';
import { AccountModal } from './components/AccountModal';
import { ChessBoard } from './components/ChessBoard';
import { ChessPiece } from './components/ChessPiece';
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
} from './components/Icons';
import { OperatorDrawer } from './components/OperatorDrawer';
import {
  applyResurrectPiece,
  applyStandardMove,
  applyTransformPiece,
  applyTrollMovePiece,
  findBestMove,
  forceTurnInFen,
  getBoardMap,
  getCapturedPieces,
  getOutcomeFromFen,
  getTurnFromFen,
  needsPromotion,
} from './engine/chessCore';
import { fetchAuthMe } from './services/api';
import { generateRoomCode, RoomTransport } from './services/multiplayer';
import {
  TIME_CONTROLS,
  type AuthoritativeGameState,
  type ChatMessage,
  type OpponentCurseState,
  type PieceColor,
  type PieceType,
  type PublicUser,
  type RoomNetworkMode,
  type RoomWireMessage,
  type TrollArmedAction,
} from './types/chess';

const INITIAL_FEN = new Chess().fen();
const GUEST_STORAGE_KEY = 'vesper64_guest_name';

function createInitialGameState(timeControlId: string, status: AuthoritativeGameState['status']): AuthoritativeGameState {
  const preset = TIME_CONTROLS.find((t) => t.id === timeControlId) ?? TIME_CONTROLS[3];
  return {
    version: 1,
    fen: INITIAL_FEN,
    moves: [],
    lastMove: null,
    whiteMs: preset.baseMs,
    blackMs: preset.baseMs,
    timeControlId: preset.id,
    lastTickAt: null,
    status,
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
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Arena mode & room state
  const [arenaMode, setArenaMode] = useState<'friend' | 'bot'>('friend');
  const [roomCode, setRoomCode] = useState<string | null>(() => parseRoomFromUrl());
  const [isHost, setIsHost] = useState<boolean>(() => !parseRoomFromUrl());
  const [networkMode, setNetworkMode] = useState<RoomNetworkMode>(() =>
    parseRoomFromUrl() ? 'connecting' : 'idle'
  );
  const [networkDetail, setNetworkDetail] = useState<string>('Ready to create or join a room');
  const [opponentName, setOpponentName] = useState<string>(() =>
    parseRoomFromUrl() ? 'Waiting for opponent…' : 'Practice Board'
  );
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('5+0');
  const [preferredColor, setPreferredColor] = useState<'random' | PieceColor>('random');
  const [joinInput, setJoinInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Match & board state
  const [localColor, setLocalColor] = useState<PieceColor>('w');
  const [boardOrientation, setBoardOrientation] = useState<PieceColor>('w');
  const [gameState, setGameState] = useState<AuthoritativeGameState>(() =>
    createInitialGameState('5+0', parseRoomFromUrl() ? 'waiting' : 'active')
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

  const canTroll = useMemo(() => {
    if (!user?.trollAccess.active) return false;
    if (user.trollAccess.permanent) return true;
    return user.trollAccess.expiresAt !== null && user.trollAccess.expiresAt > nowTick;
  }, [user, nowTick]);

  // Poll auth once on mount
  useEffect(() => {
    fetchAuthMe()
      .then((res) => {
        setUser(res.user);
        setHasOwner(res.hasOwner);
        setRequiresClaimCode(res.requiresClaimCode);
      })
      .catch(() => {
        // Offline/static fallback keeps guest mode working
      });
  }, []);

  // Track temporary troll grant expiration cleanly
  useEffect(() => {
    if (!user?.trollAccess.active || user.trollAccess.permanent) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, [user]);

  // Wipe private troll state immediately if access expires or user logs out
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

  // Commit state locally and broadcast over RoomTransport if in online room
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

  // Connect RoomTransport whenever roomCode is active in Friend mode
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
          transport.send({
            type: 'hello',
            peerClientId: clientIdRef.current,
            name: localDisplayNameRef.current,
          });
        }
      },
      onMessage: (msg: RoomWireMessage) => {
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
            transport.send({
              type: 'room_init',
              hostName: localDisplayNameRef.current,
              hostColor: localColorRef.current,
              state: activated,
              cursesForOpponent: cursesSentRef.current,
            });
            pushSystemChat(`${msg.name} connected.`);
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
          // Clear one-shot butterfingers after opponent completes a move
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

  // Countdown clock loop (ticks every 100ms when active & timed)
  useEffect(() => {
    const preset = TIME_CONTROLS.find((t) => t.id === gameState.timeControlId);
    if (!preset || preset.baseMs === 0) return;
    if (gameState.status !== 'active' || gameState.moves.length === 0) return;

    const timer = window.setInterval(() => {
      setGameState((prev) => {
        if (prev.status !== 'active' || prev.moves.length === 0) return prev;
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
  }, [gameState.status, gameState.timeControlId, gameState.moves.length, roomCode]);

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
      const move = findBestMove(current.fen, 3);
      if (!move) return;
      const applied = applyStandardMove(current.fen, move.from, move.to, move.promotion ?? 'q');
      if (!applied) return;
      const outcome = getOutcomeFromFen(applied.fenAfter);
      const preset = TIME_CONTROLS.find((t) => t.id === current.timeControlId);
      const inc = preset?.incMs ?? 0;

      setGameState({
        ...current,
        version: current.version + 1,
        fen: applied.fenAfter,
        moves: [
          ...current.moves,
          {
            ply: current.moves.length + 1,
            san: applied.san,
            from: move.from,
            to: move.to,
            color: turn,
            fenBefore: current.fen,
            fenAfter: applied.fenAfter,
          },
        ],
        lastMove: { from: move.from, to: move.to },
        whiteMs: turn === 'w' && inc ? current.whiteMs + inc : current.whiteMs,
        blackMs: turn === 'b' && inc ? current.blackMs + inc : current.blackMs,
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
    isTrollMove = false
  ) {
    const outcome = getOutcomeFromFen(fenAfter);
    const preset = TIME_CONTROLS.find((t) => t.id === gameState.timeControlId);
    const inc = preset?.incMs ?? 0;

    // If a disguised piece moved, remove disguise at source square
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
      whiteMs: !isTrollMove && movedColor === 'w' && inc ? gameState.whiteMs + inc : gameState.whiteMs,
      blackMs: !isTrollMove && movedColor === 'b' && inc ? gameState.blackMs + inc : gameState.blackMs,
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
        applyMoveSuccess(from, to, res.fenAfter, res.san, turn, true);
      }
      return;
    }

    const canPlayLocal =
      arenaMode === 'bot'
        ? turn === localColor
        : roomCode
          ? turn === localColor
          : true; // Sandbox practice when no room is open yet

    if (!canPlayLocal) return;

    const keepTurn = canTroll && armedTroll?.type === 'double_move';

    if (needsPromotion(gameState.fen, from, to)) {
      setPendingPromotion({ from, to, color: turn, keepTurn });
      return;
    }

    const res = applyStandardMove(gameState.fen, from, to, 'q', keepTurn);
    if (!res) return;
    if (keepTurn) setArmedTroll(null);
    applyMoveSuccess(from, to, res.fenAfter, res.san, turn, keepTurn);
  }

  function handleSelectPromotion(piece: Exclude<PieceType, 'p' | 'k'>) {
    if (!pendingPromotion) return;
    const { from, to, color, keepTurn } = pendingPromotion;
    setPendingPromotion(null);
    const res = applyStandardMove(gameState.fen, from, to, piece, keepTurn);
    if (!res) return;
    if (keepTurn) setArmedTroll(null);
    applyMoveSuccess(from, to, res.fenAfter, res.san, color, keepTurn);
  }

  function handleTrollSquareClick(sq: string) {
    if (!canTroll || !armedTroll) return;
    const map = getBoardMap(gameState.fen);

    if (armedTroll.type === 'transform') {
      const res = applyTransformPiece(gameState.fen, sq, localColor, armedTroll.targetPiece);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(sq, sq, res.fenAfter, res.san, localColor, true);
      return;
    }

    if (armedTroll.type === 'resurrect') {
      const res = applyResurrectPiece(gameState.fen, sq, localColor, armedTroll.targetPiece);
      if (!res) return;
      setArmedTroll(null);
      applyMoveSuccess(sq, sq, res.fenAfter, res.san, localColor, true);
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

  // Create online room
  function handleCreateRoom() {
    const code = generateRoomCode();
    const chosenColor: PieceColor =
      preferredColor === 'random'
        ? Math.random() > 0.5
          ? 'w'
          : 'b'
        : preferredColor;

    setArenaMode('friend');
    setIsHost(true);
    setRoomCode(code);
    setLocalColor(chosenColor);
    setBoardOrientation(chosenColor);
    setOpponentName('Waiting for friend…');
    setNetworkMode('connecting');
    setNetworkDetail('Share the invite link to start');
    setGameState(createInitialGameState(selectedTimeControl, 'waiting'));
    setCursesSent(emptyCurses());
    setCursesReceived(emptyCurses());
    setChatMessages([
      {
        id: crypto.randomUUID(),
        sender: 'Room',
        text: `Room ${code} created. Send invite link to your friend.`,
        ts: Date.now(),
        system: true,
      },
    ]);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('room', code);
    window.history.replaceState({}, '', nextUrl.toString());
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
    setRoomCode(clean);
    setOpponentName('Connecting…');
    setNetworkMode('connecting');
    setNetworkDetail(`Connecting to room ${clean}…`);
    setGameState(createInitialGameState(selectedTimeControl, 'waiting'));
    setCursesSent(emptyCurses());
    setCursesReceived(emptyCurses());
    setJoinInput('');

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('room', clean);
    window.history.replaceState({}, '', nextUrl.toString());
  }

  function handleLeaveRoom() {
    transportRef.current?.destroy();
    transportRef.current = null;
    setRoomCode(null);
    setIsHost(true);
    setNetworkMode('idle');
    setNetworkDetail('Ready to create or join a room');
    setOpponentName('Practice Board');
    setLocalColor('w');
    setBoardOrientation('w');
    setDrawOfferedBy(null);
    setRematchRequested(false);
    setPendingPromotion(null);
    setGameState(createInitialGameState(selectedTimeControl, 'active'));
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
    setNetworkMode('idle');
    setOpponentName('Vesper Engine (Depth 3)');
    setLocalColor(colorChoice);
    setBoardOrientation(colorChoice);
    setDrawOfferedBy(null);
    setRematchRequested(false);
    setPendingPromotion(null);
    setGameState(createInitialGameState(selectedTimeControl, 'active'));
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
      setGameState(createInitialGameState(selectedTimeControl, 'active'));
      return;
    }
    if (rematchRequested && transportRef.current) {
      const newHostColor: PieceColor = isHost
        ? localColor === 'w'
          ? 'b'
          : 'w'
        : localColor;
      const fresh = createInitialGameState(gameState.timeControlId, 'active');
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

  // Hidden triple-click trigger on brand mark (strictly active ONLY for authorized troll users)
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
  const outcome = getOutcomeFromFen(gameState.fen);
  const captured = useMemo(() => getCapturedPieces(gameState.fen), [gameState.fen]);
  const preset = TIME_CONTROLS.find((t) => t.id === gameState.timeControlId) ?? TIME_CONTROLS[3];
  const isUntimed = preset.baseMs === 0;

  const topColor: PieceColor = boardOrientation === 'w' ? 'b' : 'w';
  const bottomColor: PieceColor = boardOrientation;

  const topMs = topColor === 'w' ? gameState.whiteMs : gameState.blackMs;
  const bottomMs = bottomColor === 'w' ? gameState.whiteMs : gameState.blackMs;
  const topActive = gameState.status === 'active' && currentTurn === topColor;
  const bottomActive = gameState.status === 'active' && currentTurn === bottomColor;

  const topLabel = topColor === localColor ? `${localDisplayName} (${topColor === 'w' ? 'White' : 'Black'})` : `${opponentName} (${topColor === 'w' ? 'White' : 'Black'})`;
  const bottomLabel = bottomColor === localColor ? `${localDisplayName} (${bottomColor === 'w' ? 'White' : 'Black'})` : `${opponentName} (${bottomColor === 'w' ? 'White' : 'Black'})`;

  const topCaptured = topColor === 'w' ? captured.whiteCaptured : captured.blackCaptured;
  const bottomCaptured = bottomColor === 'w' ? captured.whiteCaptured : captured.blackCaptured;
  const topAdv = topColor === 'w' ? captured.whiteAdvantage : -captured.whiteAdvantage;
  const bottomAdv = bottomColor === 'w' ? captured.whiteAdvantage : -captured.whiteAdvantage;

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
              <span className="mono-muted">{preset.label}</span>
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
          {/* Top / Opponent Clock Specimen */}
          <section className={`clock-specimen clock-top ${topActive ? 'is-active' : ''} ${!isUntimed && topMs < 20_000 ? 'is-urgent' : ''}`}>
            <div className="clock-meta">
              <span className="player-name">{topLabel}</span>
              <span className="turn-tag">{topActive ? 'Active' : 'Standby'}</span>
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

          {/* Center Ledger or Room Setup */}
          <section className="rail-center">
            {arenaMode === 'friend' && !roomCode ? (
              <div className="room-setup">
                <h1>Online Match Room</h1>
                <p className="muted-copy">
                  Create a direct link for your friend. No account required to play.
                </p>

                <div className="control-group">
                  <span className="field-label">Time control</span>
                  <div className="preset-grid">
                    {TIME_CONTROLS.map((tc) => (
                      <button
                        key={tc.id}
                        type="button"
                        className={`preset-btn ${selectedTimeControl === tc.id ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedTimeControl(tc.id);
                          setGameState(createInitialGameState(tc.id, 'active'));
                        }}
                      >
                        {tc.label}
                      </button>
                    ))}
                  </div>
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
                  <span>PLY {String(gameState.moves.length).padStart(2, '0')}</span>
                  <span>{lastMoveText}</span>
                  <span>{roomCode ? networkDetail.split(' ')[0] : 'Local AI'}</span>
                </div>

                {railTab === 'moves' ? (
                  <div className="moves-scroll">
                    {movePairs.length === 0 ? (
                      <div className="empty-ledger">
                        {gameState.status === 'waiting'
                          ? 'Share the room URL above. Play begins as soon as your friend connects.'
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

          {/* Bottom / Local Clock Specimen */}
          <section className={`clock-specimen clock-bottom ${bottomActive ? 'is-active' : ''} ${!isUntimed && bottomMs < 20_000 ? 'is-urgent' : ''}`}>
            <div className="clock-meta">
              <span className="player-name">{bottomLabel}</span>
              <span className="turn-tag">{bottomActive ? 'Your turn' : 'Standby'}</span>
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
              orientation={boardOrientation}
              playerColor={
                arenaMode === 'friend' && !roomCode ? currentTurn : localColor
              }
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
                    setGameState(createInitialGameState(selectedTimeControl, 'active'));
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
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResign}
                  >
                    <FlagIcon size={15} />
                    <span>Resign</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRematch}
                >
                  <span>{rematchRequested ? 'Accept Rematch' : 'New Match / Rematch'}</span>
                </button>
              )}
            </div>
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
            hintMoveLabel={engineHint ? `${engineHint.san} (${engineHint.from}→${engineHint.to})` : null}
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
                'q'
              );
              if (applied) {
                applyMoveSuccess(
                  engineHint.from,
                  engineHint.to,
                  applied.fenAfter,
                  applied.san,
                  currentTurn,
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
    </div>
  );
}
