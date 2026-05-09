/**
 * Animated UI Components
 * 
 * Collection of animated UI components with micro-interactions.
 * All components respect user's reduced motion preferences.
 * 
 * @example
 * import { AnimatedButton, AnimatedInput } from '@/components/ui/animated';
 */

// Buttons
export { AnimatedButton } from '../animated-button';

// Forms
export { AnimatedInput } from '../animated-input';
export { AnimatedCheckbox } from '../animated-checkbox';
export { AnimatedSwitch } from '../animated-switch';

// Layout
export {
  AnimatedCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '../animated-card';

// Navigation
export { AnimatedTabs } from '../animated-tabs';

// Feedback
export {
  AnimatedToast,
  ToastContainer,
  type Toast,
  type ToastType,
} from '../animated-toast';

// Loading States
export {
  AnimatedSkeleton,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonText,
  SkeletonButton,
  SkeletonTable,
  SkeletonDashboard,
} from '../animated-skeleton';

// Overlays & Dialogs (Phase 3)
export { AnimatedModal } from '../animated-modal';
export { AnimatedDrawer } from '../animated-drawer';
export { AnimatedTooltip } from '../animated-tooltip';
export { AnimatedDropdown } from '../animated-dropdown';

// Content (Phase 3)
export { AnimatedAccordion } from '../animated-accordion';
export type { AnimatedAccordionItem as AccordionItem } from '../animated-accordion';

// Progress (Phase 3)
export {
  AnimatedProgress,
  AnimatedProgressCircular,
  AnimatedProgressSteps,
} from '../animated-progress';

// Page Transitions (Phase 3)
export { AnimatedPageTransition } from '../animated-page-transition';
