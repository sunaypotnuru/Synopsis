/**
 * WebSocket Service
 * 
 * Provides real-time communication for:
 * - Video consultation signaling
 * - Waiting room notifications
 * - Real-time messaging
 * - Live updates
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Event-based messaging
 * - Token-based authentication
 * - Connection state management
 * - Error handling
 */

type WebSocketEventHandler = (data: any) => void;

interface WebSocketConfig {
  url: string;
  token: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private heartbeatInterval = 30000; // 30 seconds
  private missedHeartbeats = 0;
  private maxMissedHeartbeats = 3;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.isIntentionallyClosed = false;
      this.connectionState = 'connecting';

      try {
        // Add token to URL as query parameter
        const url = `${this.config.url}?token=${this.config.token}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.missedHeartbeats = 0;
          this.startHeartbeat();
          this.emit('connection', { status: 'connected' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.event === 'pong') {
              this.missedHeartbeats = 0;
              return;
            }
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.emit('error', { error });
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[WebSocket] Disconnected:', event.code, event.reason);
          this.connectionState = 'disconnected';
          this.stopHeartbeat();
          this.emit('connection', { status: 'disconnected', code: event.code, reason: event.reason });

          // Attempt reconnection if not intentionally closed
          if (!this.isIntentionallyClosed) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        console.error('[WebSocket] Connection failed:', error);
        this.connectionState = 'disconnected';
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.connectionState = 'disconnected';

    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Start heartbeat pinging
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
          console.warn('[WebSocket] Heartbeat missed too many times, reconnecting...');
          this.ws?.close(4000, 'Heartbeat timeout');
          return;
        }
        
        this.missedHeartbeats++;
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat pinging
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send message to server
   */
  send(event: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] Cannot send message: not connected');
      throw new Error('WebSocket not connected');
    }

    const message = JSON.stringify({ event, data });
    this.ws.send(message);
  }

  /**
   * Register event handler
   */
  on(event: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Get current connection state
   */
  getState(): 'disconnected' | 'connecting' | 'connected' | 'reconnecting' {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: { event: string; data: any }): void {
    const { event, data } = message;
    this.emit(event, data);
  }

  /**
   * Emit event to all registered handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts!) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emit('reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay!
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[WebSocket] Reconnection failed:', error);
        this.attemptReconnect();
      });
    }, delay);
  }
}

/**
 * WebSocket Manager
 * 
 * Manages multiple WebSocket connections for different channels
 */
export class WebSocketManager {
  private connections: Map<string, WebSocketService> = new Map();
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Get or create WebSocket connection for a channel
   */
  getConnection(channel: string): WebSocketService {
    if (!this.connections.has(channel)) {
      const url = `${this.baseUrl}/${channel}`;
      const connection = new WebSocketService({ url, token: this.token });
      this.connections.set(channel, connection);
    }
    return this.connections.get(channel)!;
  }

  /**
   * Connect to a channel
   */
  async connect(channel: string): Promise<WebSocketService> {
    const connection = this.getConnection(channel);
    await connection.connect();
    return connection;
  }

  /**
   * Disconnect from a channel
   */
  disconnect(channel: string): void {
    const connection = this.connections.get(channel);
    if (connection) {
      connection.disconnect();
      this.connections.delete(channel);
    }
  }

  /**
   * Disconnect from all channels
   */
  disconnectAll(): void {
    this.connections.forEach((connection) => connection.disconnect());
    this.connections.clear();
  }

  /**
   * Update token for all connections
   */
  updateToken(token: string): void {
    this.token = token;
    // Reconnect all active connections with new token
    this.connections.forEach((connection, channel) => {
      connection.disconnect();
      this.connections.delete(channel);
    });
  }
}

// Export singleton instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocketManager(baseUrl: string, token: string): WebSocketManager {
  wsManager = new WebSocketManager(baseUrl, token);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new Error('WebSocketManager not initialized. Call initializeWebSocketManager first.');
  }
  return wsManager;
}
