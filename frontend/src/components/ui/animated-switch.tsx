/**
 * AnimatedSwitch Component
 * 
 * Toggle switch with smooth sliding animation.
 * 
 * Features:
 * - Smooth thumb slide animation
 * - Spring physics for natural feel
 * - Color transition
 * - Respects reduced motion preferences
 */

import { motion } from 'motion/react';
import { forwardRef } from 'react';
import { useAnimationConfig, animationTokens } from '@/animations';
import { cn } from '@/lib/utils';

interface AnimatedSwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /**
   * Label text
   */
  label?: string;
  /**
   * Switch size
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';
  /**
   * Disable animations
   * @default false
   */
  disableAnimations?: boolean;
}

export const AnimatedSwitch = forwardRef<HTMLInputElement, AnimatedSwitchProps>(
  (
    {
      label,
      disableAnimations = false,
      size = 'default',
      className,
      id,
      checked,
      ...props
    },
    ref
  ) => {
    const { shouldReduceMotion, getSpring } = useAnimationConfig();
    const shouldAnimate = !disableAnimations && !shouldReduceMotion;
    const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

    // Size configurations
    const sizeConfig = {
      sm: {
        track: 'h-4 w-7',
        thumb: 'h-3 w-3',
        translate: 12,
      },
      default: {
        track: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translate: 16,
      },
      lg: {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translate: 20,
      },
    };

    const config = sizeConfig[size];

    return (
      <div className="flex items-center gap-2">
        {/* Hidden native checkbox for accessibility */}
        <input
          ref={ref}
          type="checkbox"
          id={switchId}
          className="peer sr-only"
          checked={checked}
          {...props}
        />

        {/* Custom switch track */}
        <motion.label
          htmlFor={switchId}
          className={cn(
            'relative inline-flex cursor-pointer items-center rounded-full',
            'transition-colors duration-200',
            'bg-input',
            'peer-checked:bg-primary',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            config.track,
            className
          )}
          whileTap={shouldAnimate ? { scale: 0.95 } : undefined}
          transition={getSpring(animationTokens.spring.gentle)}
        >
          {/* Switch thumb */}
          <motion.span
            className={cn(
              'block rounded-full bg-background shadow-sm',
              config.thumb
            )}
            animate={{
              x: checked ? config.translate : 2,
            }}
            transition={
              shouldAnimate
                ? getSpring(animationTokens.spring.gentle)
                : { duration: 0.01 }
            }
          />
        </motion.label>

        {/* Label */}
        {label && (
          <label
            htmlFor={switchId}
            className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

AnimatedSwitch.displayName = 'AnimatedSwitch';
