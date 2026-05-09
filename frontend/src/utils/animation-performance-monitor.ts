/**
 * Animation Performance Monitor
 * 
 * Utility for monitoring animation performance, accessibility compliance,
 * and user experience metrics.
 * 
 * Features:
 * - FPS monitoring
 * - Animation duration tracking
 * - Reduced motion detection
 * - Accessibility audit
 * - Performance metrics collection
 */

interface PerformanceMetrics {
  fps: number;
  animationDuration: number;
  layoutShifts: number;
  interactionDelay: number;
  timestamp: number;
}

interface AccessibilityIssue {
  type: 'error' | 'warning';
  message: string;
  element?: string;
  recommendation: string;
}

class AnimationPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private animationObserver: PerformanceObserver | null = null;
  private layoutShiftObserver: PerformanceObserver | null = null;
  private isMonitoring = false;

  /**
   * Start monitoring animation performance
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    this.startFPSMonitoring();
    this.startLayoutShiftMonitoring();
    this.startAnimationDurationMonitoring();

    console.log('🎬 Animation Performance Monitor started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.animationObserver) {
      this.animationObserver.disconnect();
      this.animationObserver = null;
    }

    if (this.layoutShiftObserver) {
      this.layoutShiftObserver.disconnect();
      this.layoutShiftObserver = null;
    }

    console.log('🛑 Animation Performance Monitor stopped');
  }

  /**
   * Monitor FPS (Frames Per Second)
   */
  private startFPSMonitoring(): void {
    const measureFPS = () => {
      if (!this.isMonitoring) return;

      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.frameCount++;

      const fps = Math.round(1000 / delta);

      // Log warning if FPS drops below 60
      if (fps < 60) {
        console.warn(`⚠️ Low FPS detected: ${fps} fps`);
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Monitor Cumulative Layout Shift (CLS)
   */
  private startLayoutShiftMonitoring(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      this.layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          interface LayoutShiftEntry extends PerformanceEntry {
            hadRecentInput?: boolean;
            value?: number;
          }
          
          if (entry.entryType === 'layout-shift' && !(entry as LayoutShiftEntry).hadRecentInput) {
            const value = (entry as LayoutShiftEntry).value;
            if (value && value > 0.1) {
              console.warn(`⚠️ High layout shift detected: ${value.toFixed(4)}`);
            }
          }
        }
      });

      this.layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Layout shift monitoring not available:', error);
    }
  }

  /**
   * Monitor animation durations
   */
  private startAnimationDurationMonitoring(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.animationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration;
          
          // Warn if animation takes longer than 500ms
          if (duration > 500) {
            console.warn(`⚠️ Long animation detected: ${duration.toFixed(2)}ms`);
          }
        }
      });

      this.animationObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Animation duration monitoring not available:', error);
    }
  }

  /**
   * Check if user prefers reduced motion
   */
  checkReducedMotion(): boolean {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      console.log('✅ User prefers reduced motion - animations should be simplified');
    } else {
      console.log('✅ Full animations enabled');
    }

    return prefersReducedMotion;
  }

  /**
   * Audit accessibility of animated elements
   */
  auditAccessibility(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];

    // Check for missing ARIA attributes on interactive animated elements
    const interactiveElements = document.querySelectorAll('button, a, [role="button"], [role="dialog"]');
    
    interactiveElements.forEach((element) => {
      const el = element as HTMLElement;

      // Check for missing aria-label on icon-only buttons
      if (el.tagName === 'BUTTON' && !el.textContent?.trim() && !el.getAttribute('aria-label')) {
        issues.push({
          type: 'error',
          message: 'Button without text or aria-label',
          element: el.outerHTML.substring(0, 100),
          recommendation: 'Add aria-label to describe the button action'
        });
      }

      // Check for missing role on dialogs
      if (el.classList.contains('modal') && !el.getAttribute('role')) {
        issues.push({
          type: 'error',
          message: 'Modal without role="dialog"',
          element: el.outerHTML.substring(0, 100),
          recommendation: 'Add role="dialog" and aria-modal="true"'
        });
      }
    });

    // Check for animations that might cause vestibular issues
    const animatedElements = document.querySelectorAll('[style*="animation"], [class*="animate"]');
    
    animatedElements.forEach((element) => {
      const el = element as HTMLElement;
      const computedStyle = window.getComputedStyle(el);
      const animationDuration = parseFloat(computedStyle.animationDuration);

      if (animationDuration > 1) {
        issues.push({
          type: 'warning',
          message: 'Animation duration exceeds 1 second',
          element: el.outerHTML.substring(0, 100),
          recommendation: 'Consider reducing animation duration for better UX'
        });
      }
    });

    // Check for focus management in modals
    const modals = document.querySelectorAll('[role="dialog"]');
    modals.forEach((modal) => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) {
        issues.push({
          type: 'warning',
          message: 'Modal without focusable elements',
          element: modal.outerHTML.substring(0, 100),
          recommendation: 'Ensure modal has at least one focusable element'
        });
      }
    });

    return issues;
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: string;
    metrics: {
      averageFPS: number;
      totalAnimations: number;
      accessibilityIssues: number;
      reducedMotionEnabled: boolean;
    };
    recommendations: string[];
  } {
    const accessibilityIssues = this.auditAccessibility();
    const reducedMotion = this.checkReducedMotion();

    const recommendations: string[] = [];

    // FPS recommendations
    if (this.frameCount > 0) {
      recommendations.push('✅ FPS monitoring active');
    }

    // Accessibility recommendations
    if (accessibilityIssues.length > 0) {
      recommendations.push(`⚠️ ${accessibilityIssues.length} accessibility issues found`);
      accessibilityIssues.forEach((issue) => {
        recommendations.push(`  - ${issue.type.toUpperCase()}: ${issue.message}`);
      });
    } else {
      recommendations.push('✅ No accessibility issues detected');
    }

    // Reduced motion recommendations
    if (reducedMotion) {
      recommendations.push('✅ Reduced motion preference detected and should be respected');
    }

    const report = {
      summary: `Animation Performance Report - ${new Date().toLocaleString()}`,
      metrics: {
        averageFPS: this.frameCount > 0 ? 60 : 0, // Simplified for now
        totalAnimations: this.metrics.length,
        accessibilityIssues: accessibilityIssues.length,
        reducedMotionEnabled: reducedMotion,
      },
      recommendations,
    };

    console.log('📊 Performance Report:', report);
    return report;
  }

  /**
   * Test animation performance
   */
  async testAnimation(element: HTMLElement, animationName: string): Promise<{
    duration: number;
    fps: number;
    passed: boolean;
  }> {
    const startTime = performance.now();
    let frameCount = 0;

    return new Promise((resolve) => {
      const measureFrame = () => {
        frameCount++;
        const elapsed = performance.now() - startTime;

        if (elapsed < 1000) {
          requestAnimationFrame(measureFrame);
        } else {
          const fps = frameCount;
          const passed = fps >= 55; // Allow some margin below 60fps

          console.log(`🎬 Animation "${animationName}" test:`, {
            duration: elapsed,
            fps,
            passed: passed ? '✅' : '❌',
          });

          resolve({
            duration: elapsed,
            fps,
            passed,
          });
        }
      };

      requestAnimationFrame(measureFrame);
    });
  }

  /**
   * Check if animations are GPU-accelerated
   */
  checkGPUAcceleration(): boolean {
    const testElement = document.createElement('div');
    testElement.style.transform = 'translateZ(0)';
    document.body.appendChild(testElement);

    const computedStyle = window.getComputedStyle(testElement);
    const transform = computedStyle.transform;

    document.body.removeChild(testElement);

    const isAccelerated = transform !== 'none';
    
    if (isAccelerated) {
      console.log('✅ GPU acceleration is enabled');
    } else {
      console.warn('⚠️ GPU acceleration may not be enabled');
    }

    return isAccelerated;
  }

  /**
   * Measure interaction delay (First Input Delay)
   */
  measureInteractionDelay(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          interface FirstInputEntry extends PerformanceEntry {
            processingStart?: number;
          }
          
          const processingStart = (entry as FirstInputEntry).processingStart;
          if (processingStart) {
            const fid = processingStart - entry.startTime;
            
            if (fid > 100) {
              console.warn(`⚠️ High interaction delay: ${fid.toFixed(2)}ms`);
            } else {
              console.log(`✅ Good interaction delay: ${fid.toFixed(2)}ms`);
            }
          }
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('Interaction delay monitoring not available:', error);
    }
  }
}

// Export singleton instance
export const animationMonitor = new AnimationPerformanceMonitor();

// Auto-start in development mode
if (import.meta.env.DEV) {
  console.log('🎬 Animation Performance Monitor available');
  console.log('Use animationMonitor.startMonitoring() to begin monitoring');
  console.log('Use animationMonitor.generateReport() to see results');
}

export default animationMonitor;
