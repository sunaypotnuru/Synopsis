/**
 * useScrollAnimation Hook
 * 
 * Uses Intersection Observer API for performant scroll-triggered animations.
 * More efficient than scroll event listeners and better for battery life.
 * 
 * @param options - Intersection Observer options
 * @returns [ref, isVisible] - Ref to attach to element and visibility state
 */

import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  /**
   * Percentage of element that must be visible (0.0 to 1.0)
   * @default 0.25
   */
  threshold?: number;
  
  /**
   * Margin around the viewport (e.g., "-100px" triggers 100px before entering)
   * @default "0px"
   */
  rootMargin?: string;
  
  /**
   * Only trigger animation once
   * @default true
   */
  once?: boolean;
  
  /**
   * Custom root element (defaults to viewport)
   */
  root?: Element | null;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
) {
  const {
    threshold = 0.25,
    rootMargin = '0px',
    once = true,
    root = null,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: assume visible
      setIsVisible(true);
      return;
    }

    // Create observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          // Unobserve if once is true
          if (once && observerRef.current) {
            observerRef.current.unobserve(element);
          }
        } else if (!once) {
          // Allow re-triggering if once is false
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
        root,
      }
    );

    // Start observing
    observerRef.current.observe(element);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, once, root]);

  return [ref, isVisible] as const;
}

/**
 * useScrollProgress Hook
 * 
 * Tracks scroll progress of an element (0 to 1)
 * Useful for progress indicators and parallax effects
 * 
 * @returns [ref, progress] - Ref to attach and scroll progress (0-1)
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
  const [progress, setProgress] = useState(0);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate progress (0 when entering, 1 when leaving)
      const elementTop = rect.top;
      const elementHeight = rect.height;
      
      // Progress from 0 (top of viewport) to 1 (bottom of viewport)
      const scrollProgress = Math.max(
        0,
        Math.min(
          1,
          (windowHeight - elementTop) / (windowHeight + elementHeight)
        )
      );
      
      setProgress(scrollProgress);
    };

    // Initial calculation
    handleScroll();

    // Listen to scroll events (throttled by browser)
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return [ref, progress] as const;
}
