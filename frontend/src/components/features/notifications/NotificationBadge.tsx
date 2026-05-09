import React from 'react';
import { useNotifications } from '@/app/hooks/useNotifications';
import { Badge } from '../../ui/badge';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ className }) => {
  const { unreadCount, hasUnread } = useNotifications();

  if (!hasUnread) return null;

  return (
    <Badge 
      variant="destructive" 
      className={cn(
        "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-in zoom-in duration-300",
        className
      )}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
};




