import { useNotificationStore, Notification } from '../../lib/store';
import { useCallback } from 'react';

/**
 * Hook for managing application notifications.
 * Wraps the notification store with convenient methods.
 */
export const useNotifications = () => {
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotificationStore();

  const getNotificationById = useCallback((id: string) => {
    return notifications.find((n) => n.id === id);
  }, [notifications]);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter((n) => !n.read);
  }, [notifications]);

  const getNotificationsByType = useCallback((type: Notification['type']) => {
    return notifications.filter((n) => n.type === type);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    hasUnread: unreadCount > 0,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getNotificationById,
    getUnreadNotifications,
    getNotificationsByType,
  };
};
