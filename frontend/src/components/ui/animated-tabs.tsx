/**
 * AnimatedTabs Component
 * 
 * Tabs with smooth indicator animation and content transitions.
 * 
 * Features:
 * - Sliding indicator animation
 * - Content fade/slide transitions
 * - Keyboard navigation support
 * - Respects reduced motion preferences
 */

import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { useAnimationConfig } from '@/animations';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  /**
   * Disable animations
   * @default false
   */
  disableAnimations?: boolean;
  /**
   * Tab variant
   * @default 'underline'
   */
  variant?: 'underline' | 'pills';
}

export function AnimatedTabs({
  tabs,
  defaultTab,
  onChange,
  className,
  disableAnimations = false,
  variant = 'underline',
}: AnimatedTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { shouldReduceMotion, getTransition } = useAnimationConfig();
  const shouldAnimate = !disableAnimations && !shouldReduceMotion;

  // Update indicator position
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement) {
      setIndicatorStyle({
        left: activeTabElement.offsetLeft,
        width: activeTabElement.offsetWidth,
      });
    }
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    if (tabs.find((t) => t.id === tabId)?.disabled) return;
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={cn('w-full', className)}>
      {/* Tab List */}
      <div
        className={cn(
          'relative flex gap-1',
          variant === 'underline' && 'border-b border-border',
          variant === 'pills' && 'bg-muted p-1 rounded-lg'
        )}
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current[tab.id] = el;
            }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'relative px-4 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              variant === 'underline' && [
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              ],
              variant === 'pills' && [
                'rounded-md',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              ]
            )}
          >
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>

            {/* Pills background */}
            {variant === 'pills' && activeTab === tab.id && (
              <motion.div
                layoutId="pill-background"
                className="absolute inset-0 bg-background rounded-md shadow-sm"
                transition={
                  shouldAnimate
                    ? {
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }
                    : { duration: 0.01 }
                }
              />
            )}
          </button>
        ))}

        {/* Underline indicator */}
        {variant === 'underline' && (
          <motion.div
            className="absolute bottom-0 h-0.5 bg-primary"
            animate={indicatorStyle}
            transition={
              shouldAnimate
                ? {
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }
                : { duration: 0.01 }
            }
          />
        )}
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            initial={
              shouldAnimate
                ? { opacity: 0, y: 10 }
                : undefined
            }
            animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1 }}
            exit={
              shouldAnimate
                ? { opacity: 0, y: -10 }
                : undefined
            }
            transition={getTransition(200)}
          >
            {activeTabContent}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
