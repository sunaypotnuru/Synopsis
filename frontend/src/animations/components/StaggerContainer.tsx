/**
 * StaggerContainer Component
 * 
 * Animates children with a stagger effect (cascading animation).
 * Perfect for lists, grids, and card layouts.
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { animationTokens } from '../tokens';
import { useAnimationConfig } from '../hooks/useReducedMotion';

interface StaggerContainerProps {
  children: ReactNode;
  /**
   * Stagger delay between children
   * @default 'normal'
   */
  stagger?: keyof typeof animationTokens.stagger;
  /**
   * Delay before first child animates (in seconds)
   * @default 0
   */
  delayChildren?: number;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Animation direction for children
   * @default 'up'
   */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /**
   * Distance for slide animation (in pixels)
   * @default 20
   */
  distance?: number;
}

export function StaggerContainer({
  children,
  stagger = 'normal',
  delayChildren = 0,
  className,
  direction = 'up',
  distance = 20,
}: StaggerContainerProps) {
  const { shouldReduceMotion } = useAnimationConfig();

  // Get initial position based on direction
  const getChildInitial = () => {
    if (direction === 'none') {
      return { opacity: 0 };
    }
    
    const positions = {
      up: { opacity: 0, y: distance },
      down: { opacity: 0, y: -distance },
      left: { opacity: 0, x: distance },
      right: { opacity: 0, x: -distance },
    };
    
    return positions[direction];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : animationTokens.stagger[stagger],
        delayChildren: shouldReduceMotion ? 0 : delayChildren,
      },
    },
  };

  const itemVariants = {
    hidden: getChildInitial(),
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.01 : animationTokens.duration.normal / 1000,
        ease: animationTokens.easing.gentle,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {/* Wrap each child in motion.div with itemVariants */}
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div key={index} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={itemVariants}>{children}</motion.div>
      }
    </motion.div>
  );
}

/**
 * StaggerItem Component
 * 
 * Use this as a direct child of StaggerContainer for more control.
 * Automatically inherits stagger animation from parent.
 */
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
