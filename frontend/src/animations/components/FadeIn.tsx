/**
 * FadeIn Component
 * 
 * A reusable component that fades in its children with optional delay.
 * Respects user's reduced motion preferences.
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { animationTokens } from '../tokens';
import { useAnimationConfig } from '../hooks/useReducedMotion';

interface FadeInProps {
  children: ReactNode;
  /**
   * Delay before animation starts (in seconds)
   * @default 0
   */
  delay?: number;
  /**
   * Animation duration key
   * @default 'normal'
   */
  duration?: keyof typeof animationTokens.duration;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Direction of fade (optional slide)
   */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /**
   * Distance to slide (in pixels)
   * @default 20
   */
  distance?: number;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 'normal',
  className,
  direction = 'none',
  distance = 20,
}: FadeInProps) {
  const { getTransition } = useAnimationConfig();

  // Calculate initial position based on direction
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: distance };
      case 'down':
        return { y: -distance };
      case 'left':
        return { x: distance };
      case 'right':
        return { x: -distance };
      default:
        return {};
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={{ opacity: 1, x: 0, y: 0 }}
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
