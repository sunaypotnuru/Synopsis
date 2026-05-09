/**
 * ScaleIn Component
 * 
 * Scales in content with fade effect.
 * Perfect for modals, popovers, and tooltips.
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { animationTokens } from '../tokens';
import { useAnimationConfig } from '../hooks/useReducedMotion';

interface ScaleInProps {
  children: ReactNode;
  /**
   * Initial scale value
   * @default 0.95
   */
  initialScale?: number;
  /**
   * Animation duration key
   * @default 'fast'
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
   * Transform origin
   * @default 'center'
   */
  origin?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

export function ScaleIn({
  children,
  initialScale = 0.95,
  duration = 'fast',
  delay = 0,
  className,
  origin = 'center',
}: ScaleInProps) {
  const { getTransition } = useAnimationConfig();

  // Map origin to CSS transform-origin
  const getTransformOrigin = () => {
    switch (origin) {
      case 'top':
        return 'top center';
      case 'bottom':
        return 'bottom center';
      case 'left':
        return 'center left';
      case 'right':
        return 'center right';
      default:
        return 'center';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: initialScale }}
      transition={{
        ...getTransition(animationTokens.duration[duration]),
        delay,
      }}
      style={{ transformOrigin: getTransformOrigin() }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
