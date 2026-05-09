/**
 * Animation Design Tokens for Netra-Ai Healthcare Platform
 * 
 * These tokens ensure consistent animation behavior across the entire application
 * while maintaining healthcare-appropriate, accessible motion design.
 */

export const animationTokens = {
  /**
   * Duration tokens (in milliseconds)
   * Healthcare context: Prefer gentle, predictable timing
   */
  duration: {
    instant: 100,    // Critical alerts, immediate feedback
    fast: 200,       // Micro-interactions, button feedback
    normal: 300,     // Standard transitions, modals
    slow: 500,       // Page transitions, complex animations
    slower: 800,     // Informational content, charts
  },

  /**
   * Easing functions (cubic-bezier values)
   * Healthcare context: Use gentle, natural easing
   */
  easing: {
    // General purpose - smooth acceleration and deceleration
    standard: [0.4, 0.0, 0.2, 1] as const,
    
    // For elements entering the screen
    decelerate: [0.0, 0.0, 0.2, 1] as const,
    
    // For elements leaving the screen
    accelerate: [0.4, 0.0, 1, 1] as const,
    
    // Healthcare-friendly - calm and professional
    gentle: [0.25, 0.1, 0.25, 1] as const,
    
    // For attention-grabbing (use sparingly)
    sharp: [0.4, 0.0, 0.6, 1] as const,
  },

  /**
   * Spring configurations for physics-based animations
   * Healthcare context: Prefer gentle springs, avoid bouncy
   */
  spring: {
    // Calm, professional feel
    gentle: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
    
    // Quick, responsive (for interactive elements)
    responsive: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
    
    // Stiff, minimal overshoot
    stiff: {
      type: 'spring' as const,
      stiffness: 600,
      damping: 30,
    },
  },

  /**
   * Delay tokens for stagger animations
   */
  delay: {
    none: 0,
    short: 50,
    medium: 100,
    long: 200,
  },

  /**
   * Stagger configurations for list animations
   */
  stagger: {
    fast: 0.05,      // 50ms between items
    normal: 0.1,     // 100ms between items
    slow: 0.15,      // 150ms between items
  },
} as const;

/**
 * CSS Custom Properties for animations
 * Can be used in CSS files for non-JS animations
 */
export const cssAnimationVariables = {
  '--duration-instant': `${animationTokens.duration.instant}ms`,
  '--duration-fast': `${animationTokens.duration.fast}ms`,
  '--duration-normal': `${animationTokens.duration.normal}ms`,
  '--duration-slow': `${animationTokens.duration.slow}ms`,
  '--duration-slower': `${animationTokens.duration.slower}ms`,
  
  '--easing-standard': `cubic-bezier(${animationTokens.easing.standard.join(', ')})`,
  '--easing-decelerate': `cubic-bezier(${animationTokens.easing.decelerate.join(', ')})`,
  '--easing-accelerate': `cubic-bezier(${animationTokens.easing.accelerate.join(', ')})`,
  '--easing-gentle': `cubic-bezier(${animationTokens.easing.gentle.join(', ')})`,
  '--easing-sharp': `cubic-bezier(${animationTokens.easing.sharp.join(', ')})`,
} as const;

/**
 * Type exports for TypeScript support
 */
export type AnimationDuration = keyof typeof animationTokens.duration;
export type AnimationEasing = keyof typeof animationTokens.easing;
export type AnimationSpring = keyof typeof animationTokens.spring;
export type AnimationDelay = keyof typeof animationTokens.delay;
export type AnimationStagger = keyof typeof animationTokens.stagger;
