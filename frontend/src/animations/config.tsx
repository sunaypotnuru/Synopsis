/**
 * Global Animation Configuration for Netra-Ai
 * 
 * This file sets up Motion (Framer Motion) with accessibility-first defaults,
 * including automatic reduced motion support for users who prefer less motion.
 */

import { MotionConfig } from 'motion/react';
import { ReactNode } from 'react';
import { animationTokens } from './tokens';

interface AnimationProviderProps {
  children: ReactNode;
}

/**
 * AnimationProvider Component
 * 
 * Wraps the entire application to provide consistent animation behavior
 * and automatic reduced motion support.
 * 
 * Features:
 * - Respects user's prefers-reduced-motion setting
 * - Provides consistent transition defaults
 * - Healthcare-appropriate animation settings
 */
export function AnimationProvider({ children }: AnimationProviderProps) {
  return (
    <MotionConfig
      // Automatically respect user's motion preferences
      reducedMotion="user"
      
      // Default transition for all animations
      transition={{
        duration: animationTokens.duration.normal / 1000, // Convert to seconds
        ease: animationTokens.easing.gentle,
      }}
    >
      {children}
    </MotionConfig>
  );
}

/**
 * Animation configuration object for manual use
 * Use this when you need to apply animations outside of Motion components
 */
export const animationConfig = {
  /**
   * Get transition config based on duration and easing
   */
  getTransition: (
    duration: keyof typeof animationTokens.duration = 'normal',
    easing: keyof typeof animationTokens.easing = 'gentle'
  ) => ({
    duration: animationTokens.duration[duration] / 1000,
    ease: animationTokens.easing[easing],
  }),

  /**
   * Get spring config
   */
  getSpring: (spring: keyof typeof animationTokens.spring = 'gentle') => 
    animationTokens.spring[spring],

  /**
   * Get stagger config for list animations
   */
  getStagger: (
    stagger: keyof typeof animationTokens.stagger = 'normal',
    delayChildren: number = 0
  ) => ({
    staggerChildren: animationTokens.stagger[stagger],
    delayChildren,
  }),
} as const;

/**
 * Common animation variants for reuse across components
 */
export const commonVariants = {
  /**
   * Fade in/out variants
   */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  /**
   * Slide up variants (for modals, drawers)
   */
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  /**
   * Slide down variants
   */
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  /**
   * Slide from left (for drawers)
   */
  slideLeft: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },

  /**
   * Slide from right (for drawers)
   */
  slideRight: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },

  /**
   * Scale variants (for modals, popovers)
   */
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  /**
   * Stagger container (for lists)
   */
  staggerContainer: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: animationTokens.stagger.normal,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  },

  /**
   * Stagger item (for list items)
   */
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
} as const;

/**
 * Hover and tap animations for interactive elements
 */
export const interactionVariants = {
  /**
   * Button hover/tap
   */
  button: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
  },

  /**
   * Icon button hover/tap
   */
  iconButton: {
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
  },

  /**
   * Card hover
   */
  card: {
    whileHover: { 
      y: -4,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    },
  },

  /**
   * Link hover
   */
  link: {
    whileHover: { x: 4 },
  },
} as const;
