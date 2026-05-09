/**
 * AnimatedToast Component
 * 
 * Accessible toast notifications with smooth animations.
 * 
 * Features:
 * - Slide in from top/bottom
 * - Auto-dismiss with pause on hover
 * - ARIA live regions for screen readers
 * - Different types (success, error, warning, info)
 * - Respects reduced motion preferences
 */

import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { useAnimationConfig } from '@/animations';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AnimatedToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
  position?: 'top' | 'bottom';
}

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
  error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100',
  info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
};

const iconStyles = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
};

export function AnimatedToast({
  toast,
  onDismiss,
  position = 'top',
}: AnimatedToastProps) {
  const { shouldReduceMotion, getTransition } = useAnimationConfig();
  const [isPaused, setIsPaused] = useState(false);
  const Icon = toastIcons[toast.type];

  // Auto-dismiss logic
  useEffect(() => {
    if (toast.type === 'error' || isPaused) return;

    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss, isPaused]);

  const slideDirection = position === 'top' ? -100 : 100;

  return (
    <motion.div
      layout
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: slideDirection, scale: 0.95 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: slideDirection, scale: 0.95 }
      }
      transition={getTransition(300)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role="status"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border p-4 shadow-lg',
        toastStyles[toast.type]
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', iconStyles[toast.type])} aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-sm opacity-90">{toast.description}</p>
          )}

          {/* Action button */}
          {toast.action && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
            >
              {toast.action.label}
            </motion.button>
          )}
        </div>

        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-current"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}

/**
 * ToastContainer Component
 * 
 * Container for managing multiple toasts
 */
interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
}: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  const isTop = position.startsWith('top');

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 pointer-events-none',
        positionClasses[position]
      )}
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <AnimatedToast
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
            position={isTop ? 'top' : 'bottom'}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
