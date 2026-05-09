/**
 * WebSocket Service Manager
 * 
 * Handles real-time communication for:
 * - Notifications
 * - Presence
 * - Messaging
 * - Video Call signaling
 */

type WebSocketCallback = (data: any) => void;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<WebSocketCallback>> = new Map();
  private channel: string;
  private baseUrl: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;

  constructor(baseUrl: string, channel: string, token: string) {
    this.baseUrl = baseUrl;
    this.channel = channel;
    this.token = token;
  }

  public connect(): Promise<WebSocketService> {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.baseUrl}/${this.channel}?token=${this.token}`;
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log(`[WebSocket] Connected to ${this.channel}`);
          this.reconnectAttempts = 0;
          this.emit('connection', { status: 'connected' });
          resolve(this);
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;
            this.emit(type, payload);
          } catch (err) {
            console.error('[WebSocket] Failed to parse message:', err);
          }
        };

        this.socket.onclose = () => {
          console.log(`[WebSocket] Disconnected from ${this.channel}`);
          this.emit('connection', { status: 'disconnected' });
          this.handleReconnect();
        };

        this.socket.onerror = (error) => {
          console.error(`[WebSocket] Error in ${this.channel}:`, error);
          this.emit('error', { error });
          reject(error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public on(event: string, callback: WebSocketCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: WebSocketCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  public send(event: string, data: any) {
    if (this.isConnected()) {
      this.socket?.send(JSON.stringify({ type: event, payload: data }));
    } else {
      console.warn(`[WebSocket] Cannot send to ${this.channel}: Not connected`);
    }
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting to ${this.channel} (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }
}

class WebSocketManager {
  private connections: Map<string, WebSocketService> = new Map();
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  public async connect(channel: string): Promise<WebSocketService> {
    if (this.connections.has(channel)) {
      const conn = this.connections.get(channel)!;
      if (conn.isConnected()) return conn;
    }

    const service = new WebSocketService(this.baseUrl, channel, this.token);
    await service.connect();
    this.connections.set(channel, service);
    return service;
  }

  public disconnect(channel: string) {
    this.connections.get(channel)?.disconnect();
    this.connections.delete(channel);
  }

  public disconnectAll() {
    this.connections.forEach(conn => conn.disconnect());
    this.connections.clear();
  }

  public getConnection(channel: string): WebSocketService | undefined {
    return this.connections.get(channel);
  }
}

let manager: WebSocketManager | null = null;

export const initializeWebSocketManager = (baseUrl: string, token: string) => {
  manager = new WebSocketManager(baseUrl, token);
  return manager;
};

export const getWebSocketManager = () => {
  if (!manager) {
    // Fallback for components that access it before initialization
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
    manager = new WebSocketManager(baseUrl, 'placeholder-token');
  }
  return manager;
};
