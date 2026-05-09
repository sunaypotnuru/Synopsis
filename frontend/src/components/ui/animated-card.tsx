/**
 * AnimatedCard Component
 * 
 * Card with smooth hover lift effect and optional click animation.
 * 
 * Features:
 * - Hover lift effect
 * - Shadow transition
 * - Optional click scale
 * - Respects reduced motion preferences
 */

import { motion } from 'motion/react';
import { forwardRef } from 'react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card';
import { useAnimationConfig } from '@/animations';
import { cn } from '@/lib/utils';

interface AnimatedCardProps extends React.ComponentProps<typeof Card> {
  /**
   * Enable hover lift effect
   * @default true
   */
  hoverable?: boolean;
  /**
   * Enable click scale effect
   * @default false
   */
  clickable?: boolean;
  /**
   * Disable animations
   * @default false
   */
  disableAnimations?: boolean;
  /**
   * onClick handler (enables clickable automatically)
   */
  onClick?: () => void;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  (
    {
      hoverable = true,
      clickable = false,
      disableAnimations = false,
      onClick,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { shouldReduceMotion, getTransition } = useAnimationConfig();
    const shouldAnimate = !disableAnimations && !shouldReduceMotion;
    const isClickable = clickable || !!onClick;

    return (
      <motion.div
        ref={ref}
        whileHover={
          shouldAnimate && hoverable
            ? {
                y: -4,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
              }
            : undefined
        }
        whileTap={
          shouldAnimate && isClickable
            ? { scale: 0.98 }
            : undefined
        }
        transition={getTransition(200)}
        onClick={onClick}
        className={cn(isClickable && 'cursor-pointer')}
      >
        <Card className={cn('transition-shadow', className)} {...props}>
          {children}
        </Card>
      </motion.div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';

// Re-export card sub-components for convenience
export {
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
