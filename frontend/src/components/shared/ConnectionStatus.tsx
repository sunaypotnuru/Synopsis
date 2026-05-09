import React from 'react';
import { useWebSocket } from '@/app/contexts/WebSocketContext';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function ConnectionStatus() {
  const { isConnected } = useWebSocket();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center cursor-help">
            <div className="relative">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isConnected ? '#10B981' : '#EF4444',
                  scale: isConnected ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: isConnected ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className="w-3 h-3 rounded-full shadow-sm border border-white dark:border-gray-800"
              />
              <AnimatePresence>
                {!isConnected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute -top-1 -right-1"
                  >
                    <AlertCircle className="w-2 h-2 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 py-1">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-xs font-medium text-gray-900 dark:text-white">Real-time Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-gray-900 dark:text-white">Disconnected - Retrying...</span>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
