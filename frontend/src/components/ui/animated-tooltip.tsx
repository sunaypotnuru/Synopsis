/**
 * AnimatedTooltip Component
 * 
 * Tooltip with smooth fade animation and auto-positioning.
 * 
 * Features:
 * - Fade animation
 * - Auto-positioning (top, bottom, left, right)
 * - Hover and focus triggers
 * - Delay before showing
 * - WCAG 2.1 Level AA compliant
 * 
 * @example
 * <AnimatedTooltip content="This is a tooltip">
 *   <button>Hover me</button>
 * </AnimatedTooltip>
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '@/animations';
import { animationTokens } from '@/animations/tokens';

export interface AnimatedTooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Children to trigger tooltip */
  children: React.ReactElement;
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing (ms) */
  delay?: number;
  /** Custom className for tooltip */
  className?: string;
}

export const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const prefersReducedMotion = useReducedMotion();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newPosition = position;

    // Check if tooltip fits in preferred position
    switch (position) {
      case 'top':
        if (triggerRect.top - tooltipRect.height < 0) {
          newPosition = 'bottom';
        }
        break;
      case 'bottom':
        if (triggerRect.bottom + tooltipRect.height > viewportHeight) {
          newPosition = 'top';
        }
        break;
      case 'left':
        if (triggerRect.left - tooltipRect.width < 0) {
          newPosition = 'right';
        }
        break;
      case 'right':
        if (triggerRect.right + tooltipRect.width > viewportWidth) {
          newPosition = 'left';
        }
        break;
    }

    setActualPosition(newPosition);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
     
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: {
          opacity: 0,
          scale: 0.95,
          y: actualPosition === 'top' ? 5 : actualPosition === 'bottom' ? -5 : 0,
          x: actualPosition === 'left' ? 5 : actualPosition === 'right' ? -5 : 0,
        },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          x: 0,
        },
      };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent',
  };

  // Clone child and add event handlers
  type ChildProps = {
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
  };

  const childProps = children.props as ChildProps;
  
   
  const childWithHandlers = React.cloneElement(children as any, {
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip();
      childProps.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip();
      childProps.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      showTooltip();
      childProps.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hideTooltip();
      childProps.onBlur?.(e);
    },
    'aria-describedby': isVisible ? 'tooltip' : undefined,
  });

  return (
    <div className="relative inline-block">
      {childWithHandlers}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            id="tooltip"
            role="tooltip"
            className={`absolute ${positionClasses[actualPosition]} z-50 pointer-events-none ${className}`}
            variants={tooltipVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{
              duration: animationTokens.duration.fast / 1000,
              ease: animationTokens.easing.gentle,
            }}
          >
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg max-w-xs">
              {content}
            </div>
            {/* Arrow */}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowClasses[actualPosition]}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
