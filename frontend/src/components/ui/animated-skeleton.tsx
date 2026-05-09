/**
 * AnimatedSkeleton Component
 * 
 * Loading skeleton with shimmer animation.
 * 
 * Features:
 * - Shimmer effect (or pulse for reduced motion)
 * - Various shape variants
 * - Respects reduced motion preferences
 */

import { motion } from 'motion/react';
import { useAnimationConfig } from '@/animations';
import { cn } from '@/lib/utils';

interface AnimatedSkeletonProps {
  /**
   * Shape variant
   * @default 'rectangle'
   */
  variant?: 'rectangle' | 'circle' | 'text';
  /**
   * Width (CSS value)
   */
  width?: string | number;
  /**
   * Height (CSS value)
   */
  height?: string | number;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Disable animations
   * @default false
   */
  disableAnimations?: boolean;
}

export function AnimatedSkeleton({
  variant = 'rectangle',
  width,
  height,
  className,
  disableAnimations = false,
}: AnimatedSkeletonProps) {
  const { shouldReduceMotion } = useAnimationConfig();
  const shouldAnimate = !disableAnimations && !shouldReduceMotion;

  const variantClasses = {
    rectangle: 'rounded-md',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <motion.div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        shouldAnimate ? 'animate-shimmer' : 'animate-pulse',
        className
      )}
      style={{
        width: width || (variant === 'circle' ? height : '100%'),
        height: height || (variant === 'text' ? '1rem' : '100%'),
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton Presets for common UI patterns
 */

export function SkeletonCard() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <AnimatedSkeleton variant="rectangle" height="200px" />
      <AnimatedSkeleton variant="text" width="60%" />
      <AnimatedSkeleton variant="text" width="80%" />
      <AnimatedSkeleton variant="text" width="40%" />
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <AnimatedSkeleton
      variant="circle"
      width={size}
      height={size}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <AnimatedSkeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonButton() {
  return (
    <AnimatedSkeleton
      variant="rectangle"
      width="100px"
      height="36px"
      className="rounded-lg"
    />
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <AnimatedSkeleton
            key={`header-${i}`}
            variant="text"
            className="flex-1"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <AnimatedSkeleton
              key={`cell-${rowIndex}-${colIndex}`}
              variant="text"
              className="flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <AnimatedSkeleton variant="text" width="200px" height="32px" />
          <AnimatedSkeleton variant="text" width="300px" />
        </div>
        <SkeletonButton />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-2">
            <AnimatedSkeleton variant="text" width="60%" />
            <AnimatedSkeleton variant="text" width="40%" height="36px" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="border rounded-lg p-4">
        <AnimatedSkeleton variant="rectangle" height="300px" />
      </div>

      {/* Table */}
      <div className="border rounded-lg p-4">
        <SkeletonTable rows={5} columns={4} />
      </div>
    </div>
  );
}
