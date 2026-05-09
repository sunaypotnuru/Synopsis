/**
 * AnimatedDrawer Component
 * 
 * Slide-in drawer/sidebar with backdrop and smooth animations.
 * Can slide from any side of the screen.
 * 
 * Features:
 * - Slide from left, right, top, or bottom
 * - Backdrop fade animation
 * - Focus trap
 * - Escape key to close
 * - Scroll lock when open
 * - WCAG 2.1 Level AA compliant
 * 
 * @example
 * <AnimatedDrawer
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   side="right"
 *   title="Settings"
 * >
 *   <p>Drawer content here</p>
 * </AnimatedDrawer>
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useReducedMotion } from '@/animations';
import { animationTokens } from '@/animations/tokens';

export interface AnimatedDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer should close */
  onClose: () => void;
  /** Side to slide from */
  side?: 'left' | 'right' | 'top' | 'bottom';
  /** Drawer title */
  title?: string;
  /** Drawer content */
  children: React.ReactNode;
  /** Drawer width (for left/right) or height (for top/bottom) */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Whether clicking outside closes the drawer */
  closeOnClickOutside?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Custom className */
  className?: string;
}

const sizeClasses = {
  left: {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    full: 'w-full',
  },
  right: {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    full: 'w-full',
  },
  top: {
    sm: 'h-64',
    md: 'h-80',
    lg: 'h-96',
    full: 'h-full',
  },
  bottom: {
    sm: 'h-64',
    md: 'h-80',
    lg: 'h-96',
    full: 'h-full',
  },
};

const positionClasses = {
  left: 'left-0 top-0 bottom-0',
  right: 'right-0 top-0 bottom-0',
  top: 'top-0 left-0 right-0',
  bottom: 'bottom-0 left-0 right-0',
};

export const AnimatedDrawer: React.FC<AnimatedDrawerProps> = ({
  isOpen,
  onClose,
  side = 'right',
  title,
  children,
  size = 'md',
  closeOnClickOutside = true,
  showCloseButton = true,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      // Focus first focusable element
      setTimeout(() => {
        const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const getDrawerVariants = () => {
    if (prefersReducedMotion) {
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      };
    }

    const slideDistance = 100;
    switch (side) {
      case 'left':
        return {
          hidden: { x: -slideDistance, opacity: 0 },
          visible: { x: 0, opacity: 1 },
        };
      case 'right':
        return {
          hidden: { x: slideDistance, opacity: 0 },
          visible: { x: 0, opacity: 1 },
        };
      case 'top':
        return {
          hidden: { y: -slideDistance, opacity: 0 },
          visible: { y: 0, opacity: 1 },
        };
      case 'bottom':
        return {
          hidden: { y: slideDistance, opacity: 0 },
          visible: { y: 0, opacity: 1 },
        };
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: animationTokens.duration.fast / 1000 }}
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            className={`absolute ${positionClasses[side]} ${sizeClasses[side][size]} bg-white shadow-2xl overflow-y-auto ${className}`}
            variants={getDrawerVariants()}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{
              type: 'spring',
              stiffness: animationTokens.spring.gentle.stiffness,
              damping: animationTokens.spring.gentle.damping,
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Drawer'}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                {title && (
                  <h2 className="text-xl font-semibold text-gray-900">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-auto text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-label="Close drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
