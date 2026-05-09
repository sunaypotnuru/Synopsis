/**
 * AnimatedPageTransition Component
 * 
 * Wrapper for page transitions with smooth fade animations.
 * Use this to wrap page content for consistent route transitions.
 * 
 * Features:
 * - Fade animation between routes
 * - Optional slide animation
 * - Respects reduced motion
 * - Minimal layout shift
 * 
 * @example
 * <AnimatedPageTransition>
 *   <YourPageContent />
 * </AnimatedPageTransition>
 */

import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/animations';
import { animationTokens } from '@/animations/tokens';

export interface AnimatedPageTransitionProps {
  /** Page content */
  children: React.ReactNode;
  /** Transition variant */
  variant?: 'fade' | 'slide' | 'scale';
  /** Custom className */
  className?: string;
}

export const AnimatedPageTransition: React.FC<AnimatedPageTransitionProps> = ({
  children,
  variant = 'fade',
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  const getVariants = () => {
    if (prefersReducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    }

    switch (variant) {
      case 'slide':
        return {
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -20 },
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.98 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.98 },
        };
      case 'fade':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  return (
    <motion.div
      className={className}
      variants={getVariants()}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: animationTokens.duration.normal / 1000,
        ease: animationTokens.easing.gentle,
      }}
    >
      {children}
    </motion.div>
  );
};
