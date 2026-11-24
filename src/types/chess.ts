export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface TimeControlPreset {
  id: string;
  label: string;
  category: 'Bullet' | 'Blitz' | 'Rapid' | 'Untimed';
  baseMs: number;
  incMs: number;
}

export const TIME_CONTROLS: TimeControlPreset[] = [
  { id: '1+0', label: '1 + 0', category: 'Bullet', baseMs: 60_000, incMs: 0 },
  { id: '3+0', label: '3 + 0', category: 'Blitz', baseMs: 180_000, incMs: 0 },
  { id: '3+2', label: '3 + 2', category: 'Blitz', baseMs: 180_000, incMs: 2_000 },
  { id: '5+0', label: '5 + 0', category: 'Blitz', baseMs: 300_000, incMs: 0 },
  { id: '10+0', label: '10 + 0', category: 'Rapid', baseMs: 600_000, incMs: 0 },
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
  createdAt: number;
  trollAccess: TrollAccessSummary;
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
  | 'timeout';

export interface AuthoritativeGameState {
  version: number;
  fen: string;
  moves: MoveRecord[];
  lastMove: LastMoveHighlight | null;
  whiteMs: number;
  blackMs: number;
  timeControlId: string;
  lastTickAt: number | null;
  status: GameStatus;
  winner: PieceColor | 'draw' | null;
  statusReason: string | null;
  frozenColor: PieceColor | null;
}

export interface OpponentCurseState {
  boardFlippedForced: boolean;
  fakeReconnectUntil: number | null;
  butterfingers: boolean;
  disguisedSquares: Record<string, PieceType>;
  gaslightLastMove: LastMoveHighlight | null;
  arbiterNotice: string | null;
}

export type TrollArmedAction =
  | { type: 'double_move' }
  | { type: 'teleport' }
  | { type: 'steal_piece' }
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
      type: 'hello';
      peerClientId: string;
      name: string;
      preferredHostColor?: PieceColor;
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
