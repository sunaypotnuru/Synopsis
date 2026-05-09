/**
 * AnimatedProgress Component
 * 
 * Progress bar with smooth animations and multiple variants.
 * 
 * Features:
 * - Smooth progress animation
 * - Linear, circular, and step variants
 * - Indeterminate loading state
 * - Color variants
 * - WCAG 2.1 Level AA compliant
 * 
 * @example
 * <AnimatedProgress value={75} max={100} />
 * <AnimatedProgressCircular value={60} size="lg" />
 * <AnimatedProgressSteps steps={5} currentStep={3} />
 */

import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useReducedMotion } from '@/animations';
import { animationTokens } from '@/animations/tokens';

// ============================================================================
// Linear Progress Bar
// ============================================================================

export interface AnimatedProgressProps {
  /** Current value */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Whether progress is indeterminate (loading) */
  indeterminate?: boolean;
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom className */
  className?: string;
}

const variantClasses = {
  primary: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  danger: 'bg-red-600',
};

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  value = 0,
  max = 100,
  indeterminate = false,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {showLabel && !indeterminate && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}

      <div
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={indeterminate ? 'Loading' : `Progress: ${Math.round(percentage)}%`}
      >
        {indeterminate ? (
          <motion.div
            className={`h-full ${variantClasses[variant]} rounded-full`}
            style={{ width: '40%' }}
            animate={
              prefersReducedMotion
                ? {}
                : {
                    x: ['-100%', '250%'],
                  }
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ) : (
          <motion.div
            className={`h-full ${variantClasses[variant]} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              duration: prefersReducedMotion ? 0 : animationTokens.duration.slow / 1000,
              ease: animationTokens.easing.gentle,
            }}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Circular Progress
// ============================================================================

export interface AnimatedProgressCircularProps {
  /** Current value */
  value: number;
  /** Maximum value */
  max?: number;
  /** Size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  /** Stroke width */
  strokeWidth?: number;
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom className */
  className?: string;
}

const circularSizes = {
  sm: 40,
  md: 60,
  lg: 80,
  xl: 120,
};

const circularColors = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export const AnimatedProgressCircular: React.FC<AnimatedProgressCircularProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'primary',
  strokeWidth = 4,
  showLabel = true,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const circleSize = circularSizes[size];
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={circleSize} height={circleSize} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <motion.circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          r={radius}
          stroke={circularColors[variant]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: prefersReducedMotion ? 0 : animationTokens.duration.slow / 1000,
            ease: animationTokens.easing.gentle,
          }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Step Progress
// ============================================================================

export interface AnimatedProgressStepsProps {
  /** Total number of steps */
  steps: number;
  /** Current step (1-indexed) */
  currentStep: number;
  /** Step labels */
  labels?: string[];
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  /** Custom className */
  className?: string;
}

export const AnimatedProgressSteps: React.FC<AnimatedProgressStepsProps> = ({
  steps,
  currentStep,
  labels = [],
  variant = 'primary',
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {Array.from({ length: steps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <React.Fragment key={stepNumber}>
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold text-sm transition-colors duration-200
                    ${
                      isCompleted
                        ? `${variantClasses[variant]} text-white`
                        : isCurrent
                        ? `border-2 ${variantClasses[variant].replace('bg-', 'border-')} text-${variant}-600`
                        : 'border-2 border-gray-300 text-gray-400'
                    }
                  `}
                  initial={false}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : {
                          scale: isCurrent ? [1, 1.1, 1] : 1,
                        }
                  }
                  transition={{
                    duration: 0.3,
                    ease: animationTokens.easing.gentle,
                  }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    stepNumber
                  )}
                </motion.div>
                {labels[index] && (
                  <span
                    className={`
                      mt-2 text-xs font-medium
                      ${isCurrent ? 'text-gray-900' : 'text-gray-500'}
                    `}
                  >
                    {labels[index]}
                  </span>
                )}
              </div>

              {/* Connector Line */}
              {index < steps - 1 && (
                <div className="flex-1 h-0.5 bg-gray-300 mx-2 relative overflow-hidden">
                  <motion.div
                    className={`absolute inset-0 ${variantClasses[variant]}`}
                    initial={{ scaleX: 0 }}
                    animate={{
                      scaleX: isCompleted ? 1 : 0,
                    }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : animationTokens.duration.normal / 1000,
                      ease: animationTokens.easing.gentle,
                    }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
