import React, { createContext, useContext, useEffect, useRef } from 'react';
import { initializeWebSocketManager, getWebSocketManager, WebSocketService } from '../services/websocket';
import { useAuthStore, useWebSocketStore, useNotificationStore, usePresenceStore } from '../../lib/store';
import { toast } from 'sonner';

interface WebSocketContextType {
  connect: (channel: string) => Promise<WebSocketService>;
  disconnect: (channel: string) => void;
  send: (channel: string, event: string, data: any) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { setStatus, setLastError } = useWebSocketStore();
  const { addNotification, soundEnabled, desktopEnabled } = useNotificationStore();
  const { updateUser, removeUser, setUsers } = usePresenceStore();
  const managerRef = useRef<ReturnType<typeof initializeWebSocketManager> | null>(null);

  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        if (managerRef.current) {
          managerRef.current.disconnectAll();
          managerRef.current = null;
          setStatus('disconnected');
        }
        return;
      }

      if (!managerRef.current) {
        const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
        const token = 'placeholder-token'; 
        managerRef.current = initializeWebSocketManager(baseUrl, token);
      }

      try {
        const notificationConn = await managerRef.current.connect('notifications');
        const presenceConn = await managerRef.current.connect('presence');
        
        notificationConn.on('connection', (data) => {
          setStatus(data.status);
        });

        notificationConn.on('error', (data) => {
          setLastError(data.error?.message || 'Unknown WebSocket error');
        });

        notificationConn.on('notification', (data) => {
          const newNotif = {
            id: Math.random().toString(36).substr(2, 9),
            type: data.type || 'system',
            title: data.title || 'New Notification',
            message: data.message || '',
            timestamp: new Date().toISOString(),
            read: false,
            data: data.payload,
          };
          addNotification(newNotif);

          // 1. Visual toast (Always show if online)
          toast(newNotif.title, {
            description: newNotif.message,
            action: newNotif.data?.action ? {
              label: 'View',
              onClick: () => console.log('Action clicked:', newNotif.data.action)
            } : undefined,
          });

          // 2. Desktop Notification (If enabled and permitted)
          if (desktopEnabled && Notification.permission === 'granted') {
            new Notification(newNotif.title, {
              body: newNotif.message,
              icon: '/logo.png'
            });
          }

          // 3. Sound Notification (If enabled)
          if (soundEnabled) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
            audio.play().catch(e => console.log('[WebSocket] Audio play blocked:', e));
          }
        });

        if (Notification.permission === 'default' && desktopEnabled) {
          Notification.requestPermission();
        }

        presenceConn.on('initial_state', (data) => {
          setUsers(data.users || {});
        });

        presenceConn.on('user_joined', (data) => {
          updateUser(data.user.id, { ...data.user, status: 'online', lastSeen: new Date().toISOString() });
        });

        presenceConn.on('user_left', (data) => {
          removeUser(data.user_id);
        });

        presenceConn.on('status_change', (data) => {
          updateUser(data.user_id, { status: data.status, lastSeen: new Date().toISOString() });
        });

      } catch (err) {
        console.error('[WebSocketContext] Failed to connect to channels:', err);
        setLastError('Failed to connect to real-time server');
      }
    };

    initialize();

    return () => {
      if (managerRef.current) {
        managerRef.current.disconnectAll();
      }
    };
  }, [user, setStatus, setLastError, addNotification, updateUser, removeUser, setUsers, soundEnabled, desktopEnabled]);

  const connect = async (channel: string) => {
    if (!managerRef.current) throw new Error('WebSocketManager not initialized');
    return await managerRef.current.connect(channel);
  };

  const disconnect = (channel: string) => {
    managerRef.current?.disconnect(channel);
  };

  const send = (channel: string, event: string, data: any) => {
    const conn = managerRef.current?.getConnection(channel);
    if (conn && conn.isConnected()) {
      conn.send(event, data);
    } else {
      console.error(`[WebSocketContext] Cannot send to channel ${channel}: not connected`);
    }
  };

  const { status } = useWebSocketStore();
  const isConnected = status === 'connected';

  return (
    <WebSocketContext.Provider value={{ connect, disconnect, send, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
