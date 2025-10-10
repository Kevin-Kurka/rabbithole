/**
 * Performance Monitoring Utilities
 *
 * Tracks Web Vitals and custom performance metrics
 */

// Web Vitals metric types
export interface WebVitalMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Report Web Vitals to console and analytics
 */
export function reportWebVitals(metric: WebVitalMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      rating: metric.rating,
      id: metric.id,
    });
  }

  // Alert on poor performance
  if (metric.rating === 'poor') {
    console.warn(`[Performance Warning] Poor ${metric.name}:`, metric.value);
  }

  // In production, send to analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_rating: metric.rating,
      });
    }

    // Example: Send to custom analytics endpoint
    // fetch('/api/analytics/web-vitals', {
    //   method: 'POST',
    //   body: JSON.stringify(metric),
    //   headers: { 'Content-Type': 'application/json' },
    //   keepalive: true,
    // });
  }
}

/**
 * Measure custom performance operations
 */
export async function measureOperation<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = name;

  // Start measurement
  performance.mark(startMark);

  try {
    // Execute function
    const result = await fn();

    // End measurement
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    // Get measurement
    const measure = performance.getEntriesByName(measureName)[0];

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }

    // Warn if operation is slow
    if (measure.duration > 1000) {
      console.warn(`[Performance Warning] Slow operation ${name}: ${measure.duration.toFixed(2)}ms`);
    }

    // Clean up marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    return result;
  } catch (error) {
    // Clean up marks even on error
    performance.clearMarks(startMark);
    throw error;
  }
}

/**
 * Measure synchronous operations
 */
export function measureSync<T>(name: string, fn: () => T): T {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;
  const measureName = name;

  // Start measurement
  performance.mark(startMark);

  try {
    // Execute function
    const result = fn();

    // End measurement
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    // Get measurement
    const measure = performance.getEntriesByName(measureName)[0];

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    }

    // Warn if operation is slow
    if (measure.duration > 100) {
      console.warn(`[Performance Warning] Slow sync operation ${name}: ${measure.duration.toFixed(2)}ms`);
    }

    // Clean up marks
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    return result;
  } catch (error) {
    // Clean up marks even on error
    performance.clearMarks(startMark);
    throw error;
  }
}

/**
 * Track component render time
 */
export function trackComponentRender(componentName: string) {
  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;

    if (process.env.NODE_ENV === 'development') {
      if (duration > 16) { // Warn if render takes more than one frame (16ms)
        console.warn(`[Performance] Slow render for ${componentName}: ${duration.toFixed(2)}ms`);
      }
    }
  };
}

/**
 * Monitor bundle size
 */
export function logBundleSize() {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' && entry.name.includes('/_next/static/')) {
          const resourceEntry = entry as PerformanceResourceTiming;
          const size = resourceEntry.transferSize;

          if (size > 500000) { // Warn if bundle > 500KB
            console.warn(
              `[Performance] Large bundle detected: ${entry.name}`,
              `${(size / 1024).toFixed(2)}KB`
            );
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }
}

/**
 * Track API call performance
 */
export async function trackAPICall<T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Performance] ${endpoint}: ${duration.toFixed(2)}ms`);
    }

    // Warn on slow API calls
    if (duration > 3000) {
      console.warn(`[Performance Warning] Slow API call to ${endpoint}: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[API Error] ${endpoint} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}

/**
 * Memory usage tracking
 */
export function logMemoryUsage() {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as any).memory;

    const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
    const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
    const limitMB = (memory.jsHeapSizeLimit / 1048576).toFixed(2);

    console.log('[Memory Usage]', {
      used: `${usedMB}MB`,
      total: `${totalMB}MB`,
      limit: `${limitMB}MB`,
      percentage: `${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)}%`,
    });

    // Warn if memory usage is high
    if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.9) {
      console.warn('[Performance Warning] High memory usage detected!');
    }
  }
}

/**
 * Performance observer for long tasks
 */
export function observeLongTasks() {
  if (typeof window !== 'undefined' && 'PerformanceLongTaskTiming' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.warn(
          `[Performance Warning] Long task detected:`,
          `${entry.duration.toFixed(2)}ms`,
          entry
        );
      }
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Long task observation not supported
    }
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Observe long tasks
  observeLongTasks();

  // Log bundle sizes
  logBundleSize();

  // Log initial memory usage
  if (process.env.NODE_ENV === 'development') {
    setTimeout(logMemoryUsage, 5000);
  }

  // Log page load metrics
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        console.log('[Page Load Metrics]', {
          'DNS Lookup': `${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`,
          'TCP Connection': `${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`,
          'Request Time': `${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`,
          'Response Time': `${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`,
          'DOM Interactive': `${(navigation.domInteractive - navigation.fetchStart).toFixed(2)}ms`,
          'DOM Complete': `${(navigation.domComplete - navigation.fetchStart).toFixed(2)}ms`,
          'Load Complete': `${(navigation.loadEventEnd - navigation.fetchStart).toFixed(2)}ms`,
        });
      }
    }, 0);
  });
}

/**
 * Export performance data
 */
export function exportPerformanceData() {
  const data = {
    marks: performance.getEntriesByType('mark'),
    measures: performance.getEntriesByType('measure'),
    navigation: performance.getEntriesByType('navigation'),
    resources: performance.getEntriesByType('resource'),
  };

  console.log('[Performance Export]', data);
  return data;
}
