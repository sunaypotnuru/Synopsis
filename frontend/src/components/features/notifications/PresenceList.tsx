import React from 'react';
import { usePresenceStore, PresenceUser } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ScrollArea } from '../../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

export const PresenceList: React.FC = () => {
  const { onlineUsers } = usePresenceStore();
  const users = Object.values(onlineUsers);

  if (users.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 p-4 glass-card border border-gray-100 rounded-2xl shadow-sm">
      <h3 className="text-sm font-bold text-[#0F172A] px-2">Online Now</h3>
      <ScrollArea className="h-full max-h-[300px]">
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <TooltipProvider key={user.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-[#0D9488] to-[#0F766E] text-white text-xs">
                          {(user.name || 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white shadow-sm",
                        user.status === 'online' ? "bg-green-500" :
                        user.status === 'away' ? "bg-yellow-500" :
                        user.status === 'busy' ? "bg-red-500" : "bg-gray-500"
                      )} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium text-[#0F172A] truncate">{user.name || 'Unknown User'}</span>
                      <span className="text-[10px] text-[#64748B] truncate capitalize">{user.status}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-xs">
                    <p className="font-bold">{user.name}</p>
                    <p className="opacity-80">Last active: {new Date(user.lastSeen).toLocaleTimeString()}</p>
                    {user.activity && <p className="mt-1 italic">"{user.activity}"</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

