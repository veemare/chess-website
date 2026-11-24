export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type GameVariant =
  | 'standard'
  | 'chess960'
  | 'three_check'
  | 'king_of_hill'
  | 'atomic';

export interface GameVariantInfo {
  id: GameVariant;
  label: string;
  shortDesc: string;
}

export const GAME_VARIANTS: GameVariantInfo[] = [
  { id: 'standard', label: 'Standard', shortDesc: 'Classic FIDE rules' },
  { id: 'chess960', label: 'Chess960', shortDesc: 'Fischer Random starting rank' },
  { id: 'three_check', label: 'Three-Check', shortDesc: 'Deliver 3 checks to win' },
  { id: 'king_of_hill', label: 'King of the Hill', shortDesc: 'Reach d4/e4/d5/e5 with King' },
  { id: 'atomic', label: 'Atomic', shortDesc: 'Captures explode adjacent non-pawns' },
];

export interface TimeControlPreset {
  id: string;
  label: string;
  category: 'Bullet' | 'Blitz' | 'Rapid' | 'Untimed';
  baseMs: number;
  incMs: number;
}

export const TIME_CONTROLS: TimeControlPreset[] = [
  { id: '1+0', label: '1 | 0', category: 'Bullet', baseMs: 60_000, incMs: 0 },
  { id: '1+1', label: '1 | 1', category: 'Bullet', baseMs: 60_000, incMs: 1_000 },
  { id: '2+1', label: '2 | 1', category: 'Bullet', baseMs: 120_000, incMs: 1_000 },
  { id: '3+0', label: '3 | 0', category: 'Blitz', baseMs: 180_000, incMs: 0 },
  { id: '3+2', label: '3 | 2', category: 'Blitz', baseMs: 180_000, incMs: 2_000 },
  { id: '5+0', label: '5 | 0', category: 'Blitz', baseMs: 300_000, incMs: 0 },
  { id: '5+3', label: '5 | 3', category: 'Blitz', baseMs: 300_000, incMs: 3_000 },
  { id: '5+5', label: '5 | 5', category: 'Blitz', baseMs: 300_000, incMs: 5_000 },
  { id: '10+0', label: '10 | 0', category: 'Rapid', baseMs: 600_000, incMs: 0 },
  { id: '10+5', label: '10 | 5', category: 'Rapid', baseMs: 600_000, incMs: 5_000 },
  { id: '15+10', label: '15 | 10', category: 'Rapid', baseMs: 900_000, incMs: 10_000 },
  { id: '30+0', label: '30 | 0', category: 'Rapid', baseMs: 1_800_000, incMs: 0 },
  { id: 'untimed', label: 'Untimed', category: 'Untimed', baseMs: 0, incMs: 0 },
];

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

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  role: 'owner' | 'user';
  title: string | null;
  bio: string;
  createdAt: number;
  online: boolean;
}

export interface FriendSummary {
  id: string;
  username: string;
  displayName: string;
  online: boolean;
  lastSeenAt: number | null;
}

export interface FriendRequestSummary {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  createdAt: number;
}

export interface DirectChallengeSummary {
  id: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  toUsername: string;
  roomCode: string;
  variant: GameVariant;
  timeControlId: string;
  timeControlLabel: string;
  baseMs: number;
  incMs: number;
  hostColor: PieceColor;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: number;
}

export type WatchFilterMode = 'all' | 'pvp' | 'bot';

export interface LiveWatchGameSummary {
  gameId: string;
  mode: 'pvp' | 'bot';
  whiteName: string;
  blackName: string;
  variant: GameVariant;
  timeControlLabel: string;
  moveCount: number;
  status: GameStatus;
  statusReason: string | null;
  updatedAt: number;
  fen: string;
}

export interface LiveWatchGameFull extends LiveWatchGameSummary {
  baseMs: number;
  incMs: number;
  moves: MoveRecord[];
  lastMove: LastMoveHighlight | null;
  whiteMs: number;
  blackMs: number;
  whiteChecks: number;
  blackChecks: number;
  lastTickAt: number | null;
}

export interface SocialStateResponse {
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
  incomingChallenges: DirectChallengeSummary[];
  outgoingChallenges: DirectChallengeSummary[];
}

export interface MoveRecord {
  ply: number;
  san: string;
  from: string;
  to: string;
  color: PieceColor;
  fenBefore: string;
  fenAfter: string;
  isTroll?: boolean;
}

export interface LastMoveHighlight {
  from: string;
  to: string;
}

export type GameStatus =
  | 'waiting'
  | 'active'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'resigned'
  | 'timeout'
  | 'variant_win';

export interface AuthoritativeGameState {
  version: number;
  variant: GameVariant;
  fen: string;
  moves: MoveRecord[];
  lastMove: LastMoveHighlight | null;
  whiteMs: number;
  blackMs: number;
  timeControlId: string;
  timeControlLabel: string;
  baseMs: number;
  incMs: number;
  whiteChecks: number;
  blackChecks: number;
  lastTickAt: number | null;
  status: GameStatus;
  winner: PieceColor | 'draw' | null;
  statusReason: string | null;
  frozenColor: PieceColor | null;
  clockSpeedMultiplier: { w: number; b: number };
}

export interface OpponentCurseState {
  boardFlippedForced: boolean;
  fakeReconnectUntil: number | null;
  butterfingers: boolean;
  disguisedSquares: Record<string, PieceType>;
  gaslightLastMove: LastMoveHighlight | null;
  arbiterNotice: string | null;
  drunkPieces: boolean;
  ghostPiecesUntil: number | null;
  fakeOutcomeUntil: number | null;
  fakeOutcomeTitle: string | null;
}

export type TrollArmedAction =
  | { type: 'double_move' }
  | { type: 'teleport' }
  | { type: 'steal_piece' }
  | { type: 'snipe' }
  | { type: 'clone'; sourceSquare?: string }
  | { type: 'swap'; firstSquare?: string }
  | { type: 'transform'; targetPiece: Exclude<PieceType, 'k'> }
  | { type: 'resurrect'; targetPiece: Exclude<PieceType, 'k'> }
  | { type: 'disguise'; disguiseAs: Exclude<PieceType, 'k'> }
  | { type: 'gaslight'; firstSquare?: string }
  | null;

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: number;
  system?: boolean;
}

export type RoomNetworkMode = 'idle' | 'connecting' | 'p2p' | 'local-tab' | 'relay' | 'error';

export type RoomWireMessage =
  | {
      type: 'invite_preview_request';
      peerClientId: string;
    }
  | {
      type: 'invite_preview';
      hostName: string;
      hostColor: PieceColor;
      variant: GameVariant;
      timeControlLabel: string;
    }
  | {
      type: 'hello';
      peerClientId: string;
      name: string;
    }
  | {
      type: 'room_init';
      hostName: string;
      hostColor: PieceColor;
      state: AuthoritativeGameState;
      cursesForOpponent: OpponentCurseState;
    }
  | {
      type: 'state_update';
      state: AuthoritativeGameState;
      senderClientId: string;
    }
  | {
      type: 'curse_update';
      curses: OpponentCurseState;
    }
  | {
      type: 'chat';
      message: ChatMessage;
    }
  | {
      type: 'draw_offer';
      fromColor: PieceColor;
    }
  | {
      type: 'draw_response';
      accepted: boolean;
    }
  | {
      type: 'rematch_request';
      fromColor: PieceColor;
    }
  | {
      type: 'rematch_accept';
      newHostColor: PieceColor;
      state: AuthoritativeGameState;
    };
