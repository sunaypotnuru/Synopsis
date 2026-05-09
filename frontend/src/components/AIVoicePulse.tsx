import React from 'react';
import { motion } from 'framer-motion';

interface AIVoicePulseProps {
  isRecording: boolean;
  scoreCategory?: 'calm' | 'anxious' | 'neutral' | null;
}

export const AIVoicePulse: React.FC<AIVoicePulseProps> = ({ isRecording, scoreCategory }) => {
  // Determine color based on mood
  let glowColor = 'rgba(79, 70, 229, 0.5)'; // default indigo
  let coreColor = '#4F46E5';
  
  if (scoreCategory === 'calm') {
    glowColor = 'rgba(34, 197, 94, 0.5)'; // green
    coreColor = '#22C55E';
  } else if (scoreCategory === 'anxious') {
    glowColor = 'rgba(245, 158, 11, 0.5)'; // amber
    coreColor = '#F59E0B';
  }

  return (
    <div className="flex justify-center items-center h-48 w-full">
      <motion.div
        animate={isRecording ? {
          scale: [1, 1.2, 1],
          boxShadow: [
            `0 0 20px ${glowColor}`,
            `0 0 60px ${glowColor}`,
            `0 0 20px ${glowColor}`
          ]
        } : {
          scale: 1,
          boxShadow: `0 0 10px ${glowColor}`
        }}
        transition={{
          duration: isRecording ? 1.5 : 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="rounded-full flex items-center justify-center cursor-pointer"
        style={{
          width: '100px',
          height: '100px',
          backgroundColor: coreColor,
        }}
      >
        {!isRecording && (
          <div className="w-10 h-10 border-4 border-white border-l-transparent rounded-full animate-spin opacity-50" />
        )}
      </motion.div>
    </div>
  );
};
