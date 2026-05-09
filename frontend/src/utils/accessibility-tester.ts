/**
 * Accessibility Testing Utility
 * 
 * Automated accessibility testing for animated components.
 * Tests WCAG 2.1 Level AA compliance.
 * 
 * Features:
 * - Keyboard navigation testing
 * - Screen reader compatibility checks
 * - Color contrast validation
 * - Focus management verification
 * - ARIA attribute validation
 */

interface AccessibilityTestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

class AccessibilityTester {
  /**
   * Test keyboard navigation
   */
  testKeyboardNavigation(): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    // Check for keyboard-accessible interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]'
    );

    interactiveElements.forEach((element) => {
      const el = element as HTMLElement;
      const tabIndex = el.getAttribute('tabindex');

      // Check if element is focusable
      if (tabIndex === '-1' && !el.hasAttribute('aria-hidden')) {
        warnings.push(`Element is not keyboard accessible: ${el.tagName} ${el.className}`);
      }

      // Check for visible focus indicator
      const computedStyle = window.getComputedStyle(el);
      if (computedStyle.outline === 'none' && !el.classList.contains('focus:')) {
        warnings.push(`Element may lack visible focus indicator: ${el.tagName} ${el.className}`);
      }
    });

    info.push(`✅ Tested ${interactiveElements.length} interactive elements`);

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Test ARIA attributes
   */
  testARIAAttributes(): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    // Check modals
    const modals = document.querySelectorAll('[role="dialog"]');
    modals.forEach((modal) => {
      const el = modal as HTMLElement;

      if (!el.getAttribute('aria-modal')) {
        errors.push('Modal missing aria-modal="true"');
      }

      if (!el.getAttribute('aria-labelledby') && !el.getAttribute('aria-label')) {
        errors.push('Modal missing aria-labelledby or aria-label');
      }
    });

    // Check buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
      if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
        errors.push(`Button without text or aria-label: ${button.className}`);
      }

      if (button.hasAttribute('disabled') && !button.getAttribute('aria-disabled')) {
        warnings.push('Disabled button should have aria-disabled="true"');
      }
    });

    // Check form inputs
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
      const el = input as HTMLInputElement;
      const label = document.querySelector(`label[for="${el.id}"]`);

      if (!label && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
        errors.push(`Form input without label: ${el.name || el.id || el.className}`);
      }

      if (el.hasAttribute('required') && !el.getAttribute('aria-required')) {
        warnings.push('Required input should have aria-required="true"');
      }
    });

    // Check live regions
    const liveRegions = document.querySelectorAll('[aria-live]');
    liveRegions.forEach((region) => {
      const el = region as HTMLElement;
      const ariaLive = el.getAttribute('aria-live');

      if (ariaLive !== 'polite' && ariaLive !== 'assertive' && ariaLive !== 'off') {
        errors.push(`Invalid aria-live value: ${ariaLive}`);
      }
    });

    info.push(`✅ Tested ARIA attributes on ${modals.length + buttons.length + inputs.length} elements`);

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Test color contrast (simplified check)
   */
  testColorContrast(): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label');

    let checkedCount = 0;
    textElements.forEach((element) => {
      const el = element as HTMLElement;
      const computedStyle = window.getComputedStyle(el);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;

      // Skip if no text content
      if (!el.textContent?.trim()) return;

      checkedCount++;

      // Parse RGB values
      const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const bgMatch = backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

      if (colorMatch && bgMatch) {
        const textRGB = [parseInt(colorMatch[1]), parseInt(colorMatch[2]), parseInt(colorMatch[3])];
        const bgRGB = [parseInt(bgMatch[1]), parseInt(bgMatch[2]), parseInt(bgMatch[3])];

        // Calculate relative luminance (simplified)
        const getLuminance = (rgb: number[]) => {
          const [r, g, b] = rgb.map((val) => {
            const sRGB = val / 255;
            return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const textLuminance = getLuminance(textRGB);
        const bgLuminance = getLuminance(bgRGB);

        // Calculate contrast ratio
        const lighter = Math.max(textLuminance, bgLuminance);
        const darker = Math.min(textLuminance, bgLuminance);
        const contrastRatio = (lighter + 0.05) / (darker + 0.05);

        // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
        const fontSize = parseFloat(computedStyle.fontSize);
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && computedStyle.fontWeight === 'bold');
        const requiredRatio = isLargeText ? 3 : 4.5;

        if (contrastRatio < requiredRatio) {
          warnings.push(
            `Low contrast ratio ${contrastRatio.toFixed(2)}:1 (required ${requiredRatio}:1) on ${el.tagName}.${el.className}`
          );
        }
      }
    });

    info.push(`✅ Checked color contrast on ${checkedCount} text elements`);

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Test focus management
   */
  testFocusManagement(): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    // Check if focus is trapped in modals
    const modals = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    modals.forEach((modal) => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) {
        errors.push('Modal without focusable elements - focus trap will fail');
      } else {
        info.push(`✅ Modal has ${focusableElements.length} focusable elements`);
      }
    });

    // Check for skip links
    const skipLinks = document.querySelectorAll('a[href^="#"]');
    if (skipLinks.length === 0) {
      warnings.push('No skip links found - consider adding for keyboard navigation');
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Test reduced motion support
   */
  testReducedMotion(): AccessibilityTestResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      info.push('✅ User prefers reduced motion');

      // Check if animations are still running
      const animatedElements = document.querySelectorAll('[style*="animation"], [class*="animate"]');
      
      if (animatedElements.length > 0) {
        warnings.push(
          `${animatedElements.length} animated elements found - ensure they respect reduced motion preference`
        );
      }
    } else {
      info.push('✅ Full animations enabled');
    }

    // Check for CSS that respects prefers-reduced-motion
    const styleSheets = Array.from(document.styleSheets);
    let hasReducedMotionQuery = false;

    try {
      styleSheets.forEach((sheet) => {
        if (sheet.cssRules) {
          Array.from(sheet.cssRules).forEach((rule) => {
            if (rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-reduced-motion')) {
              hasReducedMotionQuery = true;
            }
          });
        }
      });
    } catch (e) {
      // Cross-origin stylesheets can't be accessed
      info.push('⚠️ Some stylesheets could not be checked (cross-origin)');
    }

    if (hasReducedMotionQuery) {
      info.push('✅ CSS includes prefers-reduced-motion media query');
    } else {
      warnings.push('No prefers-reduced-motion media query found in CSS');
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  /**
   * Run all accessibility tests
   */
  runAllTests(): {
    summary: string;
    results: {
      keyboardNavigation: AccessibilityTestResult;
      ariaAttributes: AccessibilityTestResult;
      colorContrast: AccessibilityTestResult;
      focusManagement: AccessibilityTestResult;
      reducedMotion: AccessibilityTestResult;
    };
    overallPassed: boolean;
  } {
    console.log('🔍 Running accessibility tests...');

    const results = {
      keyboardNavigation: this.testKeyboardNavigation(),
      ariaAttributes: this.testARIAAttributes(),
      colorContrast: this.testColorContrast(),
      focusManagement: this.testFocusManagement(),
      reducedMotion: this.testReducedMotion(),
    };

    const overallPassed = Object.values(results).every((result) => result.passed);

    // Log results
    console.log('\n📊 Accessibility Test Results:');
    console.log('================================');

    Object.entries(results).forEach(([testName, result]) => {
      console.log(`\n${testName}:`, result.passed ? '✅ PASSED' : '❌ FAILED');
      
      if (result.errors.length > 0) {
        console.log('  Errors:');
        result.errors.forEach((error) => console.log(`    ❌ ${error}`));
      }

      if (result.warnings.length > 0) {
        console.log('  Warnings:');
        result.warnings.forEach((warning) => console.log(`    ⚠️ ${warning}`));
      }

      if (result.info.length > 0) {
        result.info.forEach((info) => console.log(`    ${info}`));
      }
    });

    console.log('\n================================');
    console.log(`Overall: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);

    return {
      summary: `Accessibility Test Report - ${new Date().toLocaleString()}`,
      results,
      overallPassed,
    };
  }

  /**
   * Generate accessibility report
   */
  generateReport(): string {
    const testResults = this.runAllTests();
    
    let report = `# Accessibility Test Report\n\n`;
    report += `Generated: ${new Date().toLocaleString()}\n\n`;
    report += `Overall Status: ${testResults.overallPassed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    Object.entries(testResults.results).forEach(([testName, result]) => {
      report += `## ${testName}\n`;
      report += `Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

      if (result.errors.length > 0) {
        report += `### Errors\n`;
        result.errors.forEach((error) => {
          report += `- ❌ ${error}\n`;
        });
        report += `\n`;
      }

      if (result.warnings.length > 0) {
        report += `### Warnings\n`;
        result.warnings.forEach((warning) => {
          report += `- ⚠️ ${warning}\n`;
        });
        report += `\n`;
      }

      if (result.info.length > 0) {
        report += `### Info\n`;
        result.info.forEach((info) => {
          report += `- ${info}\n`;
        });
        report += `\n`;
      }
    });

    return report;
  }
}

// Export singleton instance
export const accessibilityTester = new AccessibilityTester();

// Auto-log in development mode
if (import.meta.env.DEV) {
  console.log('♿ Accessibility Tester available');
  console.log('Use accessibilityTester.runAllTests() to test accessibility');
  console.log('Use accessibilityTester.generateReport() to generate a report');
}

export default accessibilityTester;
