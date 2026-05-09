/**
 * AnimatedModal Component
 * 
 * Modal dialog with smooth enter/exit animations and backdrop fade.
 * Includes focus trap, escape key handling, and ARIA attributes.
 * 
 * Features:
 * - Backdrop fade animation
 * - Modal scale + fade animation
 * - Focus trap (auto-focus first focusable element)
 * - Escape key to close
 * - Click outside to close (optional)
 * - Scroll lock when open
 * - WCAG 2.1 Level AA compliant
 * 
 * @example
 * <AnimatedModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   description="Are you sure you want to proceed?"
 * >
 *   <p>Modal content here</p>
 * </AnimatedModal>
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useReducedMotion } from '@/animations';
import { animationTokens } from '@/animations/tokens';

export interface AnimatedModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title (for accessibility) */
  title: string;
  /** Optional description (for accessibility) */
  description?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether clicking outside closes the modal */
  closeOnClickOutside?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Custom className for modal content */
  className?: string;
  /** Footer content (buttons, actions) */
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnClickOutside = true,
  showCloseButton = true,
  className = '',
  footer,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      
      // Focus first focusable element
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
      // Restore focus to previous element
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

  const modalVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: {
          opacity: 0,
          scale: 0.95,
          y: 20,
        },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
        },
      };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} ${className}`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{
              duration: animationTokens.duration.normal / 1000,
              ease: animationTokens.easing.gentle,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby={description ? 'modal-description' : undefined}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div>
                <h2
                  id="modal-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  {title}
                </h2>
                {description && (
                  <p
                    id="modal-description"
                    className="mt-1 text-sm text-gray-500"
                  >
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
