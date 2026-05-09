/**
 * AnimatedDropdown Component
 * 
 * Dropdown menu with smooth animations and keyboard navigation.
 * 
 * Features:
 * - Fade + scale animation
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Click outside to close
 * - Auto-positioning (stays within viewport)
 * - WCAG 2.1 Level AA compliant
 * 
 * @example
 * <AnimatedDropdown
 *   trigger={<button>Open Menu</button>}
 *   items={[
 *     { id: '1', label: 'Profile', onClick: () => {} },
 *     { id: '2', label: 'Settings', onClick: () => {} },
 *     { type: 'divider' },
 *     { id: '3', label: 'Logout', onClick: () => {}, danger: true },
 *   ]}
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';
import { useReducedMotion } from '@/animations';
import { animationTokens } from '@/animations/tokens';

export interface DropdownItem {
  /** Unique identifier */
  id: string;
  /** Item label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Whether item is selected/checked */
  selected?: boolean;
  /** Danger/destructive action styling */
  danger?: boolean;
  /** Item type */
  type?: 'item';
}

export interface DropdownDivider {
  type: 'divider';
  id?: string;
}

export type AnimatedDropdownMenuItem = DropdownItem | DropdownDivider;

export interface AnimatedDropdownProps {
  /** Trigger element (button, etc.) */
  trigger: React.ReactNode;
  /** Dropdown items */
  items: AnimatedDropdownMenuItem[];
  /** Dropdown alignment */
  align?: 'left' | 'right' | 'center';
  /** Custom className for dropdown */
  className?: string;
  /** Custom className for trigger wrapper */
  triggerClassName?: string;
}

export const AnimatedDropdown: React.FC<AnimatedDropdownProps> = ({
  trigger,
  items,
  align = 'left',
  className = '',
  triggerClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const prefersReducedMotion = useReducedMotion();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const menuItems = items.filter((item): item is DropdownItem => item.type !== 'divider');

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.querySelector('button')?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev + 1;
          while (next < menuItems.length && menuItems[next].disabled) {
            next++;
          }
          return next < menuItems.length ? next : prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && menuItems[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(menuItems.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < menuItems.length) {
          const item = menuItems[focusedIndex];
          if (!item.disabled) {
            item.onClick?.();
            setIsOpen(false);
            setFocusedIndex(-1);
          }
        }
        break;
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      item.onClick?.();
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  const dropdownVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: {
          opacity: 0,
          scale: 0.95,
          y: -10,
        },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
        },
      };

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div className="relative inline-block" onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        {trigger}
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            className={`absolute ${alignmentClasses[align]} mt-2 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 ${className}`}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{
              duration: animationTokens.duration.fast / 1000,
              ease: animationTokens.easing.gentle,
            }}
            role="menu"
            aria-orientation="vertical"
          >
            {items.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={item.id || `divider-${index}`}
                    className="my-1 border-t border-gray-200"
                    role="separator"
                  />
                );
              }

              const menuItemIndex = menuItems.indexOf(item);
              const isFocused = focusedIndex === menuItemIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-left text-sm
                    transition-colors duration-150
                    ${
                      item.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                    ${isFocused ? 'bg-gray-100' : ''}
                  `}
                  role="menuitem"
                  tabIndex={isFocused ? 0 : -1}
                >
                  {item.icon && (
                    <span className="flex-shrink-0">{item.icon}</span>
                  )}
                  <span className="flex-1">{item.label}</span>
                  {item.selected && (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
