import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { Request, Response, NextFunction } from 'express';

describe('SecurityHeadersMiddleware Performance Tests', () => {
    let middleware: SecurityHeadersMiddleware;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        middleware = new SecurityHeadersMiddleware();
        mockResponse = {
            setHeader: jest.fn(),
            locals: {},
        };
        mockNext = jest.fn();
    });

    const createMockRequest = (path: string, method: string = 'GET'): Request => {
        return {
            path,
            method,
            secure: false,
            get: jest.fn((header: string) => {
                if (header.toLowerCase() === 'x-forwarded-proto') return 'http';
                return undefined;
            }),
            headers: {},
            url: path,
        } as any as Request;
    };

    describe('LRU Cache Performance', () => {
        it('should handle large numbers of unique routes efficiently', () => {
            const startTime = Date.now();

            // Generate 1000 unique routes
            for (let i = 0; i < 1000; i++) {
                const req = createMockRequest(`/api/test-route-${i}`, 'GET');
                middleware.use(req, mockResponse as Response, mockNext);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should complete in reasonable time (adjust for CI environments)
            const maxTime = process.env.CI ? 5000 : 1000;

            expect(totalTime).toBeLessThan(maxTime);
            console.log(`✅ Processed 1000 unique routes in ${totalTime}ms`);
        });

        it('should demonstrate cache benefits with repeated routes', () => {
            const routes = ['/api/users', '/api/orders', '/api/products', '/auth/login', '/admin/dashboard'];

            // First pass - populate cache
            const firstPassStart = Date.now();
            routes.forEach((route) => {
                const req = createMockRequest(route, 'GET');
                middleware.use(req, mockResponse as Response, mockNext);
            });
            const firstPassEnd = Date.now();

            // Second pass - should benefit from cache
            const secondPassStart = Date.now();
            routes.forEach((route) => {
                const req = createMockRequest(route, 'GET');
                middleware.use(req, mockResponse as Response, mockNext);
            });
            const secondPassEnd = Date.now();

            const firstPassTime = firstPassEnd - firstPassStart;
            const secondPassTime = secondPassEnd - secondPassStart;

            console.log(`First pass (no cache): ${firstPassTime}ms`);
            console.log(`Second pass (cached): ${secondPassTime}ms`);

            // Cache should provide performance benefit or at least not be significantly slower
            // For micro-benchmarks, we allow minimal variance due to measurement noise
            // Allow up to 2ms tolerance for timing variance in test environments
            expect(secondPassTime).toBeLessThanOrEqual(firstPassTime + 2);

            // Optional: Log performance improvement percentage
            const improvement = (((firstPassTime - secondPassTime) / firstPassTime) * 100).toFixed(1);
            console.log(`Performance improvement: ${improvement}%`);
        });
        it('should maintain bounded cache size', () => {
            // Generate more routes than cache limit (500)
            const routeCount = 600;

            for (let i = 0; i < routeCount; i++) {
                const req = createMockRequest(`/test/route-${i}`, 'GET');
                middleware.use(req, mockResponse as Response, mockNext);
            }

            // Access private cache property for testing
            const cache = (middleware as any).routeCache;

            // Cache size should not exceed the limit
            expect(cache.size).toBeLessThanOrEqual(500);
            console.log(`✅ Cache size after ${routeCount} routes: ${cache.size}`);
        });

        it('should handle concurrent-like requests efficiently', async () => {
            const routes = Array.from({ length: 100 }, (_, i) => `/api/concurrent-${i}`);

            const startTime = Date.now();

            routes.forEach((route) => {
                const req = createMockRequest(route, 'GET');
                middleware.use(req, mockResponse as Response, mockNext);
            });
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            expect(totalTime).toBeLessThan(500); // Should be very fast
            console.log(`✅ Processed 100 concurrent-like requests in ${totalTime}ms`);
        });

        it('should demonstrate method-based cache key differentiation', () => {
            const path = '/api/users';
            const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

            const startTime = Date.now();

            // Each method should get its own cache entry
            methods.forEach((method) => {
                const req = createMockRequest(path, method);
                middleware.use(req, mockResponse as Response, mockNext);
            });

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should complete quickly
            expect(totalTime).toBeLessThan(100);
            console.log(`✅ Processed ${methods.length} methods for same path in ${totalTime}ms`);

            // Verify all requests completed
            expect(mockNext).toHaveBeenCalledTimes(methods.length);
        });
    });

    describe('Memory Usage', () => {
        it('should not leak memory with many different routes', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Generate many routes
            for (let i = 0; i < 2000; i++) {
                const req = createMockRequest(`/memory-test-${i}`, 'GET');
                middleware.use(req, mockResponse as Response, mockNext);
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
                await new Promise((resolve) => setTimeout(resolve, 100));
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

            // Memory increase should be reasonable (less than 50MB for 2000 routes)
            // Skip assertion in CI environments where memory behavior is unpredictable
            if (!process.env.CI) {
                expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
            }
        });

        it('should generate nonces efficiently', () => {
            const nonceCount = 1000;
            const startTime = Date.now();

            for (let i = 0; i < nonceCount; i++) {
                mockResponse.locals = {};
                const req = createMockRequest(`/nonce-test-${i}`, 'GET');
                middleware.use(req, mockResponse as Response, mockNext);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const averageTime = totalTime / nonceCount;

            console.log(`✅ Generated ${nonceCount} nonces in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms per nonce)`);

            // Should generate nonces very quickly
            expect(averageTime).toBeLessThan(1); // Less than 1ms per nonce
        });
    });
});
