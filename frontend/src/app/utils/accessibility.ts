/**
 * Accessibility Utilities
 * Provides utilities for WCAG 2.2 Level AA compliance
 */

/**
 * Color contrast checker
 * Calculates the contrast ratio between two colors
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fgLuminance = getRelativeLuminance(foreground);
  const bgLuminance = getRelativeLuminance(background);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 * Used for contrast ratio calculation
 */
function getRelativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(contrastRatio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(contrastRatio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
}

/**
 * Keyboard event handlers
 */
export const keyboardEvents = {
  isEnter: (e: React.KeyboardEvent | KeyboardEvent) => e.key === 'Enter',
  isSpace: (e: React.KeyboardEvent | KeyboardEvent) => e.key === ' ',
  isEscape: (e: React.KeyboardEvent | KeyboardEvent) => e.key === 'Escape',
  isTab: (e: React.KeyboardEvent | KeyboardEvent) => e.key === 'Tab',
  isArrowUp: (e: React.KeyboardEvent | KeyboardEvent) => e.key === 'ArrowUp',
  isArrowDown: (e: React.KeyboardEvent | KeyboardEvent) => e.key === 'ArrowDown',
  isArrowLeft: (e: React.KeyboardEvent | KeyboardEvent) => e.key === 'ArrowLeft',
  isArrowRight: (e: React.KeyboardEvent | KeyboardEvent) => e.key === 'ArrowRight',
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Focus an element
   */
  focus: (element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  },

  /**
   * Focus first focusable element in container
   */
  focusFirst: (container: HTMLElement | null) => {
    if (!container) return;
    const focusable = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    if (focusable) {
      focusable.focus();
    }
  },

  /**
   * Focus last focusable element in container
   */
  focusLast: (container: HTMLElement | null) => {
    if (!container) return;
    const focusables = Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    if (focusables.length > 0) {
      focusables[focusables.length - 1].focus();
    }
  },

  /**
   * Trap focus within container (for modals)
   */
  trapFocus: (container: HTMLElement | null, e: KeyboardEvent | React.KeyboardEvent) => {
    if (!container || !keyboardEvents.isTab(e)) return;

    const focusables = Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];

    if (focusables.length === 0) return;

    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    if (e.shiftKey) {
      if (activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  },
};

/**
 * ARIA utilities
 */
export const ariaUtils = {
  /**
   * Announce message to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  /**
   * Set aria-label
   */
  setLabel: (element: HTMLElement, label: string) => {
    element.setAttribute('aria-label', label);
  },

  /**
   * Set aria-describedby
   */
  setDescription: (element: HTMLElement, descriptionId: string) => {
    element.setAttribute('aria-describedby', descriptionId);
  },

  /**
   * Set aria-invalid
   */
  setInvalid: (element: HTMLElement, invalid: boolean) => {
    element.setAttribute('aria-invalid', invalid.toString());
  },

  /**
   * Set aria-required
   */
  setRequired: (element: HTMLElement, required: boolean) => {
    element.setAttribute('aria-required', required.toString());
  },

  /**
   * Set aria-disabled
   */
  setDisabled: (element: HTMLElement, disabled: boolean) => {
    element.setAttribute('aria-disabled', disabled.toString());
  },

  /**
   * Set aria-expanded
   */
  setExpanded: (element: HTMLElement, expanded: boolean) => {
    element.setAttribute('aria-expanded', expanded.toString());
  },

  /**
   * Set aria-hidden
   */
  setHidden: (element: HTMLElement, hidden: boolean) => {
    element.setAttribute('aria-hidden', hidden.toString());
  },
};

/**
 * Skip link utilities
 */
export const skipLink = {
  /**
   * Create skip to main content link
   */
  createSkipLink: () => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = `
      absolute top-0 left-0 z-50 px-4 py-2 bg-teal-600 text-white
      transform -translate-y-full focus:translate-y-0 transition-transform
    `;
    document.body.insertBefore(skipLink, document.body.firstChild);
  },
};

/**
 * Screen reader only text
 */
export const srOnly = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;

/**
 * Semantic HTML helpers
 */
export const semanticHTML = {
  /**
   * Create semantic heading
   */
  createHeading: (level: 1 | 2 | 3 | 4 | 5 | 6, text: string, className?: string) => {
    const heading = document.createElement(`h${level}`);
    heading.textContent = text;
    if (className) heading.className = className;
    return heading;
  },

  /**
   * Create semantic button
   */
  createButton: (text: string, onClick?: () => void, className?: string) => {
    const button = document.createElement('button');
    button.textContent = text;
    if (onClick) button.addEventListener('click', onClick);
    if (className) button.className = className;
    return button;
  },

  /**
   * Create semantic link
   */
  createLink: (text: string, href: string, className?: string) => {
    const link = document.createElement('a');
    link.textContent = text;
    link.href = href;
    if (className) link.className = className;
    return link;
  },
};

/**
 * Test utilities for accessibility
 */
export const a11yTests = {
  /**
   * Check if all images have alt text
   */
  checkImageAltText: (): { passed: boolean; images: HTMLImageElement[] } => {
    const images = Array.from(document.querySelectorAll('img'));
    const imagesWithoutAlt = images.filter((img) => !img.getAttribute('alt'));
    return {
      passed: imagesWithoutAlt.length === 0,
      images: imagesWithoutAlt,
    };
  },

  /**
   * Check if all form inputs have labels
   */
  checkFormLabels: (): { passed: boolean; inputs: HTMLInputElement[] } => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    const inputsWithoutLabel = inputs.filter((input) => {
      const id = input.getAttribute('id');
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      const ariaLabel = input.getAttribute('aria-label');
      return !label && !ariaLabel;
    });
    return {
      passed: inputsWithoutLabel.length === 0,
      inputs: inputsWithoutLabel as HTMLInputElement[],
    };
  },

  /**
   * Check if all buttons have accessible names
   */
  checkButtonNames: (): { passed: boolean; buttons: HTMLButtonElement[] } => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const buttonsWithoutName = buttons.filter((button) => {
      const text = button.textContent?.trim();
      const ariaLabel = button.getAttribute('aria-label');
      return !text && !ariaLabel;
    });
    return {
      passed: buttonsWithoutName.length === 0,
      buttons: buttonsWithoutName,
    };
  },

  /**
   * Check if all headings are in order
   */
  checkHeadingOrder: (): { passed: boolean; headings: HTMLHeadingElement[] } => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLHeadingElement[];
    let lastLevel = 0;
    const outOfOrder: HTMLHeadingElement[] = [];

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName[1]);
      if (level > lastLevel + 1) {
        outOfOrder.push(heading);
      }
      lastLevel = level;
    });

    return {
      passed: outOfOrder.length === 0,
      headings: outOfOrder,
    };
  },
};
