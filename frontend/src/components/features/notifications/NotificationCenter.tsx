import React from 'react';
import { 
  Bell, 
  Check, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Pill, 
  AlertCircle, 
  Trash2 
} from 'lucide-react';
import { useNotifications } from '@/app/hooks/useNotifications';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '../../ui/popover';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { NotificationBadge } from './NotificationBadge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

export const NotificationCenter: React.FC = () => {
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    getUnreadNotifications
  } = useNotifications();

  const unreadNotifications = getUnreadNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'appointment': return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'lab': return <FileText className="h-4 w-4 text-green-500" />;
      case 'prescription': return <Pill className="h-4 w-4 text-orange-500" />;
      default: return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const renderNotificationList = (list: typeof notifications) => {
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Bell className="h-12 w-12 opacity-20 mb-4" />
          <p>No notifications yet</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <div className="flex flex-col gap-1 p-2">
          {list.map((notification) => (
            <div 
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={cn(
                "group relative flex items-start gap-4 rounded-lg p-4 transition-colors hover:bg-accent cursor-pointer",
                !notification.read && "bg-accent/40 font-medium"
              )}
            >
              <div className="mt-1 flex-shrink-0">
                {getIcon(notification.type)}
              </div>
              <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{notification.title}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
              </div>
              {!notification.read && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
          <Bell className="h-5 w-5" />
          <NotificationBadge />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 sm:w-96" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={() => markAllAsRead()}
              disabled={unreadNotifications.length === 0}
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all as read
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => clearNotifications()}
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="unread" 
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Unread
              {unreadNotifications.length > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {unreadNotifications.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="m-0">
            {renderNotificationList(notifications)}
          </TabsContent>
          <TabsContent value="unread" className="m-0">
            {renderNotificationList(unreadNotifications)}
          </TabsContent>
        </Tabs>
        
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full text-xs" size="sm">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};




