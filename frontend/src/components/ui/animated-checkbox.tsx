/**
 * AnimatedCheckbox Component
 * 
 * Checkbox with smooth check animation and ripple effect.
 * 
 * Features:
 * - Check mark draw animation
 * - Scale feedback on click
 * - Ripple effect
 * - Respects reduced motion preferences
 */

import { motion, AnimatePresence } from 'motion/react';
import { forwardRef } from 'react';
import { useAnimationConfig } from '@/animations';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface AnimatedCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Label text
   */
  label?: string;
  /**
   * Disable animations
   * @default false
   */
  disableAnimations?: boolean;
}

export const AnimatedCheckbox = forwardRef<
  HTMLInputElement,
  AnimatedCheckboxProps
>(({ label, disableAnimations = false, className, id, ...props }, ref) => {
  const { shouldReduceMotion, getTransition } = useAnimationConfig();
  const shouldAnimate = !disableAnimations && !shouldReduceMotion;
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-flex">
        {/* Hidden native checkbox for accessibility */}
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className="peer sr-only"
          {...props}
        />

        {/* Custom checkbox */}
        <motion.label
          htmlFor={checkboxId}
          className={cn(
            'relative flex h-5 w-5 cursor-pointer items-center justify-center',
            'rounded border-2 border-input bg-background',
            'transition-colors',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'peer-checked:border-primary peer-checked:bg-primary',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            className
          )}
          whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
          transition={getTransition(100)}
        >
          {/* Checkmark */}
          <AnimatePresence>
            {props.checked && (
              <motion.div
                initial={shouldAnimate ? { scale: 0, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={
                  shouldAnimate
                    ? {
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }
                    : getTransition(100)
                }
              >
                <Check className="h-3.5 w-3.5 text-primary-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.label>
      </div>

      {/* Label */}
      {label && (
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
    </div>
  );
});

AnimatedCheckbox.displayName = 'AnimatedCheckbox';
