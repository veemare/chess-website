import Peer, { type DataConnection } from 'peerjs';
import type { RoomNetworkMode, RoomWireMessage } from '../types/chess';
import { fetchRoomRelayEvents, postRoomRelayEvent } from './api';

export interface RoomConnectionCallbacks {
  onStatus: (mode: RoomNetworkMode, detail?: string) => void;
  onMessage: (msg: RoomWireMessage) => void;
}

const PEER_PREFIX = 'vesper64-arena-';

export class RoomTransport {
  private readonly roomCode: string;
  private readonly isHost: boolean;
  private readonly clientId: string;
  private readonly callbacks: RoomConnectionCallbacks;

  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private channel: BroadcastChannel | null = null;
  private relayTimer: number | null = null;
  private fallbackTimer: number | null = null;
  private retryTimer: number | null = null;
  private relaySeq = 0;
  private relayActive = false;
  private closed = false;
  private mode: RoomNetworkMode = 'connecting';
  private pendingQueue: RoomWireMessage[] = [];

  constructor(
    roomCode: string,
    isHost: boolean,
    clientId: string,
    callbacks: RoomConnectionCallbacks
  ) {
    this.roomCode = roomCode.toUpperCase();
    this.isHost = isHost;
    this.clientId = clientId;
    this.callbacks = callbacks;
  }

  start(): void {
    this.closed = false;
    this.setMode('connecting', this.isHost ? 'Waiting for opponent on P2P link' : 'Dialing room host');

    // 1. Instant same-browser / cross-tab channel
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`vesper64-tab-${this.roomCode}`);
      this.channel.onmessage = (ev: MessageEvent) => {
        const wrapper = ev.data as { senderId?: string; msg?: RoomWireMessage } | null;
        if (!wrapper || wrapper.senderId === this.clientId || !wrapper.msg) return;
        if (this.mode !== 'p2p') {
          this.setMode('local-tab', 'Connected locally (same browser)');
        }
        this.callbacks.onMessage(wrapper.msg);
      };
    }

    // 2. PeerJS WebRTC DataChannel (zero server traffic during match)
    this.initPeer();

    // 3. Fallback HTTP room relay if WebRTC cannot punch NAT within 5 seconds
    this.fallbackTimer = window.setTimeout(() => {
      if (this.closed) return;
      if (this.mode !== 'p2p' && this.mode !== 'local-tab') {
        this.activateRelayFallback();
      }
    }, 5000);
  }

  private setMode(mode: RoomNetworkMode, detail?: string): void {
    this.mode = mode;
    this.callbacks.onStatus(mode, detail);
  }

  private initPeer(): void {
    const peerConfig = {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    };

    const hostPeerId = `${PEER_PREFIX}${this.roomCode}`;
    const peer = this.isHost ? new Peer(hostPeerId, peerConfig) : new Peer(peerConfig);
    this.peer = peer;

    peer.on('open', () => {
      if (this.closed) return;
      if (!this.isHost) {
        this.dialHost(hostPeerId);
      }
    });

    peer.on('connection', (incoming) => {
      if (this.closed) return;
      this.attachConnection(incoming);
    });

    peer.on('error', (err) => {
      if (this.closed) return;
      if (err.type === 'peer-unavailable' && !this.isHost) {
        this.retryTimer = window.setTimeout(() => {
          if (!this.closed && this.mode === 'connecting') {
            this.dialHost(hostPeerId);
          }
        }, 1600);
        return;
      }
      if (err.type === 'unavailable-id' && this.isHost) {
        // Host reconnecting or room already claimed: activate relay seamlessly
        this.activateRelayFallback();
        return;
      }
      if (this.mode === 'connecting') {
        this.activateRelayFallback();
      }
    });
  }

  private dialHost(hostPeerId: string): void {
    if (!this.peer || this.closed) return;
    try {
      const conn = this.peer.connect(hostPeerId, { reliable: true });
      this.attachConnection(conn);
    } catch {
      this.activateRelayFallback();
    }
  }

  private attachConnection(conn: DataConnection): void {
    this.conn = conn;
    conn.on('open', () => {
      if (this.closed) return;
      this.setMode('p2p', 'Direct WebRTC peer link active');
      this.flushQueue();
    });

    conn.on('data', (raw) => {
      if (this.closed) return;
      const msg = raw as RoomWireMessage;
      if (msg && typeof msg === 'object' && 'type' in msg) {
        this.callbacks.onMessage(msg);
      }
    });

    conn.on('close', () => {
      if (this.closed) return;
      if (!this.relayActive) {
        this.activateRelayFallback();
      }
    });

    conn.on('error', () => {
      if (!this.closed && !this.relayActive) {
        this.activateRelayFallback();
      }
    });
  }

  private activateRelayFallback(): void {
    if (this.relayActive || this.closed) return;
    this.relayActive = true;
    this.setMode('relay', 'Connected via HTTP relay fallback');
    this.flushQueue();

    const poll = async () => {
      if (this.closed || !this.relayActive) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        this.relayTimer = window.setTimeout(poll, 2200);
        return;
      }
      try {
        const res = await fetchRoomRelayEvents(this.roomCode, this.relaySeq);
        for (const ev of res.events) {
          this.relaySeq = Math.max(this.relaySeq, ev.seq);
          if (ev.senderId === this.clientId) continue;
          const msg = ev.payload as RoomWireMessage;
          if (msg && typeof msg === 'object' && 'type' in msg) {
            this.callbacks.onMessage(msg);
          }
        }
      } catch {
        // Keep polling gracefully on transient error
      }
      if (!this.closed && this.relayActive) {
        this.relayTimer = window.setTimeout(poll, 1400);
      }
    };

    void poll();
  }

  private flushQueue(): void {
    if (this.pendingQueue.length === 0) return;
    const queued = [...this.pendingQueue];
    this.pendingQueue = [];
    for (const msg of queued) {
      this.send(msg);
    }
  }

  send(msg: RoomWireMessage): void {
    if (this.closed) return;

    if (this.channel) {
      this.channel.postMessage({ senderId: this.clientId, msg });
    }

    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
        return;
      } catch {
        // Fall through to relay
      }
    }

    if (this.relayActive) {
      void postRoomRelayEvent(this.roomCode, this.clientId, msg).catch(() => undefined);
      return;
    }

    this.pendingQueue.push(msg);
  }

  destroy(): void {
    this.closed = true;
    this.relayActive = false;
    if (this.fallbackTimer !== null) window.clearTimeout(this.fallbackTimer);
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    if (this.relayTimer !== null) window.clearTimeout(this.relayTimer);
    try {
      this.conn?.close();
    } catch {
      // Ignore
    }
    try {
      this.peer?.destroy();
    } catch {
      // Ignore
    }
    try {
      this.channel?.close();
    } catch {
      // Ignore
    }
    this.conn = null;
    this.peer = null;
    this.channel = null;
  }
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}
