import React from 'react';
import { motion } from 'framer-motion';

interface AccessibleClickableProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  ariaLabel: string;
  disabled?: boolean;
}

export function AccessibleClickable({
  children,
  onClick,
  className = "",
  ariaLabel,
  disabled = false
}: AccessibleClickableProps) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg transition-shadow ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </motion.button>
  );
}
