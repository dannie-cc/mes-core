import { Controller, Get, Logger } from '@nestjs/common';
import { HealthCheckService, HealthCheck, MemoryHealthIndicator } from '@nestjs/terminus';
import { EventLoopHealthIndicator } from './event-loop.health';
import { DrizzleHealthIndicator } from './drizzle.health';
import { ok } from '@/utils';

/**
 * Health Check Controller
 * 
 * Provides multiple health check endpoints following Kubernetes best practices:
 * - GET /health - Liveness probe (lightweight, fast)
 * - GET /health/ready - Readiness probe (comprehensive checks)
 * - GET /health/detailed - Full diagnostics (monitoring/debugging)
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private drizzle: DrizzleHealthIndicator,
    private memory: MemoryHealthIndicator,
    private eventLoop: EventLoopHealthIndicator,
  ) {}

  /**
   * Liveness Probe - Lightweight check to verify the application is running
   * 
   * Use this for:
   * - Kubernetes liveness probes
   * - Load balancer health checks
   * - Quick "is the app alive?" checks
   * 
   * Expected response time: < 100ms
   * 
   * @returns Basic health status with minimal checks
   */
  @Get('')
  @HealthCheck()
  async check() {
    try {
      const result = await this.health.check([
        // Only check event loop - very fast, no external dependencies
        async () => this.eventLoop.isHealthy('event_loop', { maxLag: 100 }),
      ]);
      
      return ok(result);
    } catch (error) {
      this.logger.error(`Liveness check failed: ${JSON.stringify(error.response)}`);
      throw error;
    }
  }

  /**
   * Readiness Probe - Comprehensive check to verify the app can handle requests
   * 
   * Use this for:
   * - Kubernetes readiness probes
   * - Deployment verification
   * - Pre-traffic routing checks
   * 
   * Expected response time: < 1-2 seconds
   * 
   * @returns Detailed health status with all critical checks
   */
  @Get('ready')
  @HealthCheck()
  async ready() {
    try {
      const result = await this.health.check([
        // 1. Database Check - Can we connect to the database?
        async () => this.drizzle.pingCheck('database', { timeout: 1000 }),

        // 2. Memory Check - Is memory usage within acceptable limits?
        async () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        
        // 3. Event Loop Check - Is the app responsive? (stricter threshold)
        async () => this.eventLoop.isHealthy('event_loop', { maxLag: 70 }),
      ]);

      if (result.status === 'error') {
        this.logger.error(`Readiness check failed: ${JSON.stringify(result.details)}`);
        this.logger.warn('App is not ready to handle traffic. Possible causes: Database latency, CPU blocking, or Memory leak.');
      }

      return ok(result);
    } catch (error) {
      this.logger.error(`Readiness check failed: ${JSON.stringify(error.response)}`);
      this.logger.warn('Possible Causes: Database latency, CPU blocking, or Memory leak.');
      throw error;
    }
  }

  /**
   * Detailed Diagnostics - Full health check with extended metrics
   * 
   * Use this for:
   * - Monitoring dashboards
   * - Troubleshooting and debugging
   * - Detailed system health analysis
   * 
   * Expected response time: Can be slower (2-3 seconds)
   * 
   * @returns Comprehensive health status with all available checks and metrics
   */
  @Get('detailed')
  @HealthCheck()
  async detailed() {
    try {
      const result = await this.health.check([
        // 1. Database Check - Extended timeout for detailed check
        async () => this.drizzle.pingCheck('database', { timeout: 2000 }),

        // 2. Memory Heap Check
        async () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
        
        // 3. Memory RSS Check - Total memory usage
        async () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
        
        // 4. Event Loop Check - Detailed with warning threshold
        async () => this.eventLoop.isHealthy('event_loop', { 
          maxLag: 100, 
          warningThreshold: 50 
        }),
      ]);

      // Log detailed status for monitoring
      if (result.status === 'error') {
        this.logger.error(`Detailed health check failed: ${JSON.stringify(result.details)}`);
      } else if (result.status === 'ok') {
        this.logger.log(`Detailed health check passed: ${JSON.stringify(result.info)}`);
      }

      return ok(result);
    } catch (error) {
      this.logger.error(`Detailed health check failed: ${JSON.stringify(error.response)}`);
      throw error;
    }
  }
}
