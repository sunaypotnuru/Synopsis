/**
 * useReducedMotion Hook
 * 
 * Detects if the user has requested reduced motion via their system preferences.
 * This is critical for accessibility and WCAG 2.1 Level AA compliance.
 * 
 * @returns {boolean} true if user prefers reduced motion, false otherwise
 */

import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  // Default to false (motion enabled) for SSR
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if matchMedia is supported
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * useAnimationConfig Hook
 * 
 * Returns animation configuration that respects user's motion preferences.
 * When reduced motion is preferred, returns instant or very short durations.
 * 
 * @returns Animation configuration object
 */
export function useAnimationConfig() {
  const shouldReduceMotion = useReducedMotion();

  return {
    shouldReduceMotion,
    
    /**
     * Get duration based on motion preference
     */
    getDuration: (normalDuration: number): number => {
      return shouldReduceMotion ? 10 : normalDuration; // 10ms for reduced motion
    },

    /**
     * Get transition config
     */
    getTransition: (duration: number = 300) => ({
      duration: shouldReduceMotion ? 0.01 : duration / 1000,
      ease: 'linear' as const,
    }),

    /**
     * Get spring config (disabled for reduced motion)
     */
    getSpring: (config: { stiffness: number; damping: number }) => {
      if (shouldReduceMotion) {
        return { duration: 0.01, ease: 'linear' as const };
      }
      return { type: 'spring' as const, ...config };
    },
  };
}
