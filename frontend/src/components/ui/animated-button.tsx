/**
 * AnimatedButton Component
 * 
 * Enhanced button with smooth micro-interactions.
 * Wraps the base Button component with Motion animations.
 * 
 * Features:
 * - Hover scale effect
 * - Tap feedback
 * - Loading state animation
 * - Ripple effect (optional)
 * - Respects reduced motion preferences
 */

import { motion } from 'motion/react';
import { forwardRef, useState } from 'react';
import { Button, buttonVariants } from './button';
import { type VariantProps } from 'class-variance-authority';
import { useAnimationConfig } from '@/animations';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AnimatedButtonProps
  extends React.ComponentPropsWithoutRef<typeof Button>,
    VariantProps<typeof buttonVariants> {
  /**
   * Show loading spinner
   */
  loading?: boolean;
  /**
   * Enable ripple effect on click
   * @default false
   */
  ripple?: boolean;
  /**
   * Disable hover/tap animations
   * @default false
   */
  disableAnimations?: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    {
      children,
      loading = false,
      ripple = false,
      disableAnimations = false,
      disabled,
      className,
      variant,
      size,
      onClick,
      ...props
    },
    ref
  ) => {
    const { shouldReduceMotion, getTransition } = useAnimationConfig();
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const isDisabled = disabled || loading;
    const shouldAnimate = !disableAnimations && !shouldReduceMotion && !isDisabled;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Create ripple effect
      if (ripple && !isDisabled) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const size = Math.max(rect.width, rect.height) * 2;

        const newRipple: Ripple = {
          id: Date.now(),
          x,
          y,
          size,
        };

        setRipples((prev) => [...prev, newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);
      }

      // Call original onClick
      if (onClick && !isDisabled) {
         
        onClick(e as any);
      }
    };

    return (
      <motion.div
        className="inline-flex"
        whileHover={shouldAnimate ? { scale: 1.02 } : undefined}
        whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
        transition={getTransition(150)}
      >
        <Button
          ref={ref}
          disabled={isDisabled}
          className={cn('relative overflow-hidden', className)}
          variant={variant}
          size={size}
          onClick={handleClick}
          {...props}
        >
          {/* Loading spinner */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={getTransition(200)}
              className="mr-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.div>
          )}

          {/* Button content */}
          <span className={cn(loading && 'opacity-70')}>{children}</span>

          {/* Ripple effects */}
          {ripple && (
            <span className="absolute inset-0 overflow-hidden pointer-events-none">
              {ripples.map((ripple) => (
                <motion.span
                  key={ripple.id}
                  className="absolute rounded-full bg-white/30"
                  initial={{
                    width: 0,
                    height: 0,
                    x: ripple.x,
                    y: ripple.y,
                    opacity: 0.5,
                  }}
                  animate={{
                    width: ripple.size,
                    height: ripple.size,
                    x: ripple.x - ripple.size / 2,
                    y: ripple.y - ripple.size / 2,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              ))}
            </span>
          )}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';
