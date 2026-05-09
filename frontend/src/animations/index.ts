/**
 * Animation System Exports
 * 
 * Central export file for all animation-related utilities, components, and hooks.
 * Import from this file to access the animation system.
 * 
 * @example
 * import { FadeIn, useReducedMotion, animationTokens } from '@/animations';
 */

// Configuration
export { AnimationProvider, animationConfig, commonVariants, interactionVariants } from './config';

// Tokens
export { animationTokens, cssAnimationVariables } from './tokens';
export type {
  AnimationDuration,
  AnimationEasing,
  AnimationSpring,
  AnimationDelay,
  AnimationStagger,
} from './tokens';

// Hooks
export { useReducedMotion, useAnimationConfig } from './hooks/useReducedMotion';
export { useScrollAnimation, useScrollProgress } from './hooks/useScrollAnimation';

// Components
export { FadeIn } from './components/FadeIn';
export { SlideIn } from './components/SlideIn';
export { ScaleIn } from './components/ScaleIn';
export { StaggerContainer, StaggerItem } from './components/StaggerContainer';
export { ScrollReveal } from './components/ScrollReveal';
