/**
 * SlideIn Component
 * 
 * Slides in content from a specified direction with fade effect.
 * Perfect for modals, drawers, and side panels.
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { animationTokens } from '../tokens';
import { useAnimationConfig } from '../hooks/useReducedMotion';

interface SlideInProps {
  children: ReactNode;
  /**
   * Direction to slide from
   * @default 'bottom'
   */
  direction?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Animation duration key
   * @default 'normal'
   */
  duration?: keyof typeof animationTokens.duration;
  /**
   * Delay before animation starts (in seconds)
   * @default 0
   */
  delay?: number;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Distance to slide (in pixels or percentage)
   * @default '100%'
   */
  distance?: string | number;
}

export function SlideIn({
  children,
  direction = 'bottom',
  duration = 'normal',
  delay = 0,
  className,
  distance = '100%',
}: SlideInProps) {
  const { getTransition } = useAnimationConfig();

  // Calculate initial position based on direction
  const getInitialPosition = () => {
    const dist = typeof distance === 'number' ? `${distance}px` : distance;
    
    switch (direction) {
      case 'top':
        return { y: `-${dist}` };
      case 'bottom':
        return { y: dist };
      case 'left':
        return { x: `-${dist}` };
      case 'right':
        return { x: dist };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...getInitialPosition() }}
      transition={{
        ...getTransition(animationTokens.duration[duration]),
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
