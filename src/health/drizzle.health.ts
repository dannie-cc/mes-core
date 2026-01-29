import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { DrizzleService } from '@/models/model.service';

/**
 * Health indicator for Drizzle ORM database connection.
 * 
 * Performs a simple ping check to verify database connectivity and responsiveness.
 * This is essential for ensuring the application can communicate with the database.
 * 
 * @example
 * ```typescript
 * // In your health controller
 * @Get()
 * @HealthCheck()
 * check() {
 *   return this.health.check([
 *     () => this.drizzle.pingCheck('database', { timeout: 1000 })
 *   ]);
 * }
 * ```
 */
@Injectable()
export class DrizzleHealthIndicator {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * Checks if the database connection is healthy by executing a simple query.
   * 
   * @param key - The key to identify this health check in the response
   * @param options - Configuration options for the health check
   * @param options.timeout - Maximum time to wait for the database response in milliseconds (default: 1000ms)
   * @returns Health indicator result with database connection status
   */
  async pingCheck(
    key: string,
    options: { timeout?: number } = {},
  ): Promise<HealthIndicatorResult> {
    const { timeout = 1000 } = options;
    const indicator = this.healthIndicatorService.check(key);

    try {
      const startTime = performance.now();
      
      // Execute a simple query with timeout
      await this.executeWithTimeout(
        this.drizzleService.database.execute('SELECT 1'),
        timeout,
      );
      
      const responseTime = Math.round((performance.now() - startTime) * 100) / 100;

      return indicator.up({
        status: 'up',
        responseTime: `${responseTime}ms`,
        message: 'Database connection is healthy',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return indicator.down({
        status: 'down',
        message: `Database connection failed: ${errorMessage}`,
        error: errorMessage,
      });
    }
  }

  /**
   * Executes a promise with a timeout.
   * 
   * @param promise - The promise to execute
   * @param timeoutMs - Timeout in milliseconds
   * @returns The promise result
   * @throws Error if the timeout is exceeded
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Database query timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }
}
