/**
 * ScrollReveal Component
 * 
 * Reveals content when it enters the viewport using Intersection Observer.
 * More performant than scroll event listeners.
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { animationTokens } from '../tokens';
import { useAnimationConfig } from '../hooks/useReducedMotion';

interface ScrollRevealProps {
  children: ReactNode;
  /**
   * Animation direction
   * @default 'up'
   */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /**
   * Distance to slide (in pixels)
   * @default 30
   */
  distance?: number;
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
   * Percentage of element that must be visible (0.0 to 1.0)
   * @default 0.25
   */
  threshold?: number;
  /**
   * Margin around viewport (e.g., "-100px" triggers 100px before entering)
   * @default "0px"
   */
  rootMargin?: string;
  /**
   * Only animate once
   * @default true
   */
  once?: boolean;
  /**
   * Custom className
   */
  className?: string;
}

export function ScrollReveal({
  children,
  direction = 'up',
  distance = 30,
  duration = 'normal',
  delay = 0,
  threshold = 0.25,
  rootMargin = '0px',
  once = true,
  className,
}: ScrollRevealProps) {
  const [ref, isVisible] = useScrollAnimation({
    threshold,
    rootMargin,
    once,
  });
  
  const { getTransition } = useAnimationConfig();

  // Calculate initial position based on direction
  const getInitialPosition = () => {
    if (direction === 'none') {
      return {};
    }
    
    const positions = {
      up: { y: distance },
      down: { y: -distance },
      left: { x: distance },
      right: { x: -distance },
    };
    
    return positions[direction];
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={
        isVisible
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, ...getInitialPosition() }
      }
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
