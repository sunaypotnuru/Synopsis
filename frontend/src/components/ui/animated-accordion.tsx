/**
 * AnimatedAccordion Component
 * 
 * Accordion with smooth expand/collapse animations.
 * Supports single or multiple items open at once.
 * 
 * Features:
 * - Smooth height animation
 * - Rotate chevron icon
 * - Single or multiple mode
 * - Keyboard navigation (Arrow keys, Home, End)
 * - WCAG 2.1 Level AA compliant
 * 
 * @example
 * <AnimatedAccordion items={[
 *   { id: '1', title: 'Section 1', content: <p>Content 1</p> },
 *   { id: '2', title: 'Section 2', content: <p>Content 2</p> },
 * ]} />
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useReducedMotion } from '@/animations';
import { animationTokens } from '@/animations/tokens';

export interface AnimatedAccordionItem {
  /** Unique identifier */
  id: string;
  /** Item title/header */
  title: string;
  /** Item content */
  content: React.ReactNode;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
}

export interface AnimatedAccordionProps {
  /** Accordion items */
  items: AnimatedAccordionItem[];
  /** Allow multiple items open at once */
  multiple?: boolean;
  /** Default open items (by id) */
  defaultOpen?: string[];
  /** Controlled open items */
  openItems?: string[];
  /** Callback when items change */
  onChange?: (openItems: string[]) => void;
  /** Custom className */
  className?: string;
}

export const AnimatedAccordion: React.FC<AnimatedAccordionProps> = ({
  items,
  multiple = false,
  defaultOpen = [],
  openItems: controlledOpenItems,
  onChange,
  className = '',
}) => {
  const [internalOpenItems, setInternalOpenItems] = useState<string[]>(defaultOpen);
  const prefersReducedMotion = useReducedMotion();

  const openItems = controlledOpenItems ?? internalOpenItems;

  const toggleItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.disabled) return;

    let newOpenItems: string[];

    if (multiple) {
      newOpenItems = openItems.includes(id)
        ? openItems.filter((itemId) => itemId !== id)
        : [...openItems, id];
    } else {
      newOpenItems = openItems.includes(id) ? [] : [id];
    }

    if (controlledOpenItems === undefined) {
      setInternalOpenItems(newOpenItems);
    }
    onChange?.(newOpenItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, index: number) => {
    const item = items.find((i) => i.id === id);
    if (item?.disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        toggleItem(id);
        break;
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = (index + 1) % items.length;
        document.getElementById(`accordion-button-${items[nextIndex].id}`)?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = (index - 1 + items.length) % items.length;
        document.getElementById(`accordion-button-${items[prevIndex].id}`)?.focus();
        break;
      }
      case 'Home':
        e.preventDefault();
        document.getElementById(`accordion-button-${items[0].id}`)?.focus();
        break;
      case 'End':
        e.preventDefault();
        document.getElementById(`accordion-button-${items[items.length - 1].id}`)?.focus();
        break;
    }
  };

  const contentVariants = prefersReducedMotion
    ? {
        collapsed: { opacity: 0, height: 0 },
        expanded: { opacity: 1, height: 'auto' },
      }
    : {
        collapsed: {
          opacity: 0,
          height: 0,
          transition: {
            height: {
              duration: animationTokens.duration.normal / 1000,
              ease: animationTokens.easing.standard,
            },
            opacity: {
              duration: animationTokens.duration.fast / 1000,
              ease: animationTokens.easing.standard,
            },
          },
        },
        expanded: {
          opacity: 1,
          height: 'auto',
          transition: {
            height: {
              duration: animationTokens.duration.normal / 1000,
              ease: animationTokens.easing.standard,
            },
            opacity: {
              duration: animationTokens.duration.fast / 1000,
              ease: animationTokens.easing.standard,
              delay: 0.05,
            },
          },
        },
      };

  return (
    <div className={`divide-y divide-gray-200 border border-gray-200 rounded-lg ${className}`}>
      {items.map((item, index) => {
        const isOpen = openItems.includes(item.id);

        return (
          <div key={item.id} className="bg-white">
            {/* Header Button */}
            <button
              id={`accordion-button-${item.id}`}
              onClick={() => toggleItem(item.id)}
              onKeyDown={(e) => handleKeyDown(e, item.id, index)}
              disabled={item.disabled}
              className={`
                w-full flex items-center justify-between p-4 text-left
                transition-colors duration-150
                ${
                  item.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500'
                }
              `}
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
              aria-disabled={item.disabled}
            >
              <div className="flex items-center gap-3">
                {item.icon && (
                  <span className="text-gray-500">{item.icon}</span>
                )}
                <span className="font-medium text-gray-900">{item.title}</span>
              </div>

              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{
                  duration: animationTokens.duration.fast / 1000,
                  ease: animationTokens.easing.standard,
                }}
              >
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </motion.div>
            </button>

            {/* Content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`accordion-content-${item.id}`}
                  variants={contentVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="overflow-hidden"
                  role="region"
                  aria-labelledby={`accordion-button-${item.id}`}
                >
                  <div className="p-4 pt-0 text-gray-700">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
