/**
 * Page Transition Component
 * 
 * Provides smooth page transitions using Motion (Framer Motion)
 * This component wraps page content to provide consistent animations
 * when navigating between routes.
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition Component
 * 
 * Wraps page content with fade and slide animations
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
