/**
 * AnimatedInput Component
 * 
 * Enhanced input with smooth focus animations and validation feedback.
 * 
 * Features:
 * - Focus scale effect
 * - Label float animation
 * - Error shake animation
 * - Success checkmark animation
 * - Respects reduced motion preferences
 */

import { motion, AnimatePresence } from 'motion/react';
import { forwardRef, useState } from 'react';
import { Input } from './input';
import { useAnimationConfig } from '@/animations';
import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';

interface AnimatedInputProps extends React.ComponentProps<typeof Input> {
  /**
   * Label text
   */
  label?: string;
  /**
   * Error message
   */
  error?: string;
  /**
   * Success state
   */
  success?: boolean;
  /**
   * Helper text
   */
  helperText?: string;
  /**
   * Disable animations
   * @default false
   */
  disableAnimations?: boolean;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      disableAnimations = false,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const { shouldReduceMotion, getTransition } = useAnimationConfig();
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const shouldAnimate = !disableAnimations && !shouldReduceMotion;
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    return (
      <div className="w-full">
        <div className="relative">
          {/* Floating Label */}
          {label && (
            <motion.label
              htmlFor={inputId}
              className={cn(
                'absolute left-2.5 pointer-events-none transition-all',
                'text-muted-foreground',
                isFocused || hasValue
                  ? 'top-0 -translate-y-1/2 text-xs bg-background px-1'
                  : 'top-1/2 -translate-y-1/2 text-sm'
              )}
              animate={
                shouldAnimate
                  ? {
                      y: isFocused || hasValue ? '-50%' : '-50%',
                      scale: isFocused || hasValue ? 0.85 : 1,
                    }
                  : undefined
              }
              transition={getTransition(200)}
            >
              {label}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </motion.label>
          )}

          {/* Input with focus animation */}
          <motion.div
            animate={
              shouldAnimate && isFocused
                ? { scale: 1.01 }
                : { scale: 1 }
            }
            transition={getTransition(150)}
          >
            <Input
              ref={ref}
              id={inputId}
              className={cn(
                'transition-all',
                label && 'pt-4',
                hasError && 'border-destructive focus-visible:ring-destructive/20',
                success && 'border-green-500 focus-visible:ring-green-500/20',
                className
              )}
              aria-invalid={hasError}
              aria-describedby={
                error
                  ? `${inputId}-error`
                  : helperText
                  ? `${inputId}-helper`
                  : undefined
              }
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...props}
            />
          </motion.div>

          {/* Success Icon */}
          <AnimatePresence>
            {success && !hasError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                transition={getTransition(200)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <Check className="h-4 w-4 text-green-500" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Icon */}
          <AnimatePresence>
            {hasError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                transition={getTransition(200)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <AlertCircle className="h-4 w-4 text-destructive" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message with shake animation */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{
                opacity: 1,
                height: 'auto',
                y: 0,
                x: shouldAnimate ? [0, -10, 10, -10, 10, 0] : 0,
              }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{
                opacity: getTransition(200),
                height: getTransition(200),
                y: getTransition(200),
                x: { duration: 0.4, ease: 'easeInOut' },
              }}
              id={`${inputId}-error`}
              role="alert"
              aria-live="polite"
              className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive"
            >
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Helper Text */}
          {!error && helperText && (
            <motion.div
              key="helper"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={getTransition(200)}
              id={`${inputId}-helper`}
              className="mt-1.5 text-xs text-muted-foreground"
            >
              {helperText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';
