import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { performance } from 'perf_hooks';

/**
 * Health indicator for monitoring Node.js event loop lag.
 * 
 * Event loop lag occurs when the event loop is blocked by CPU-intensive operations,
 * preventing timely execution of asynchronous callbacks. High lag indicates the
 * server is struggling to handle requests efficiently.
 * 
 * @example
 * ```typescript
 * // In your health controller
 * @Get()
 * @HealthCheck()
 * check() {
 *   return this.health.check([
 *     () => this.eventLoop.isHealthy('event_loop', { maxLag: 100, warningThreshold: 50 })
 *   ]);
 * }
 * ```
 */
@Injectable()
export class EventLoopHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  /**
   * Checks if the event loop lag is within acceptable limits.
   * 
   * @param key - The key to identify this health check in the response
   * @param options - Configuration options for the health check
   * @param options.maxLag - Maximum acceptable lag in milliseconds (default: 100ms)
   * @param options.warningThreshold - Lag threshold for warnings in milliseconds (default: 50ms)
   * @returns Health indicator result with lag metrics and health status
   */
  async isHealthy(
    key: string,
    options: { maxLag?: number; warningThreshold?: number } = {}
  ): Promise<HealthIndicatorResult> {
    const { maxLag = 100, warningThreshold = 50 } = options;
    
    const lag = await this.measureLag();
    const isHealthy = lag < maxLag;
    const isWarning = lag >= warningThreshold && lag < maxLag;
    
    const data = {
      lag: Math.round(lag * 100) / 100, // Round to 2 decimal places
      maxLag,
      warningThreshold,
      status: isHealthy ? (isWarning ? 'warning' : 'healthy') : 'critical',
      message: this.getStatusMessage(lag, maxLag, warningThreshold),
    };

    // In Terminus v11+, use check(key) to get an indicator, then call .up() or .down()
    const indicator = this.healthIndicatorService.check(key);
    
    if (isHealthy) {
      return indicator.up(data);
    }
    
    // Use down() with data to indicate unhealthy state
    // The framework automatically handles this and returns 503
    return indicator.down(data);
  }

  /**
   * Measures the current event loop lag by scheduling a callback with setImmediate
   * and measuring how long it takes to execute.
   * 
   * Uses the modern Performance API (performance.now()) which provides high-resolution
   * timestamps with microsecond precision.
   * 
   * @returns Promise resolving to the measured lag in milliseconds
   */
  private async measureLag(): Promise<number> {
    return new Promise<number>((resolve) => {
      const start = performance.now();
      setImmediate(() => {
        const end = performance.now();
        const lag = end - start;
        resolve(lag);
      });
    });
  }

  /**
   * Generates a human-readable status message based on the current lag.
   * 
   * @param lag - Current event loop lag in milliseconds
   * @param maxLag - Maximum acceptable lag threshold
   * @param warningThreshold - Warning threshold
   * @returns Descriptive status message
   */
  private getStatusMessage(lag: number, maxLag: number, warningThreshold: number): string {
    const roundedLag = Math.round(lag);
    
    if (lag >= maxLag) {
      return `Critical: Event loop is severely blocked (${roundedLag}ms lag)`;
    } else if (lag >= warningThreshold) {
      return `Warning: Event loop experiencing elevated lag (${roundedLag}ms)`;
    } else {
      return `Healthy: Event loop operating normally (${roundedLag}ms lag)`;
    }
  }
}
