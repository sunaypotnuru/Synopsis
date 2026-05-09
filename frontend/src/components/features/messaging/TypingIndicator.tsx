/**
 * Typing Indicator Component
 * 
 * Animated typing indicator showing who is typing
 */

import React from 'react';
import { motion } from 'motion/react';

interface TypingIndicatorProps {
  users: string[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getText = () => {
    if (users.length === 1) {
      return `${users[0]} is typing`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing`;
    } else {
      return `${users[0]} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center space-x-2 px-4 py-2"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
        {users[0]?.charAt(0) || '?'}
      </div>

      {/* Typing Bubble */}
      <div className="bg-gray-100 rounded-2xl px-4 py-3">
        <div className="flex items-center space-x-1">
          {/* Animated Dots */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-gray-400 rounded-full"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>

      {/* Text */}
      <span className="text-xs text-gray-500">{getText()}</span>
    </motion.div>
  );
}
