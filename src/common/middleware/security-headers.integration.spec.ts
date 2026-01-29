import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SecurityHeadersMiddleware } from './security-headers.middleware';

describe('SecurityHeaders Integration Tests', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [SecurityHeadersMiddleware],
        }).compile();

        app = moduleFixture.createNestApplication();

        const securityMiddleware = new SecurityHeadersMiddleware();
        app.use(securityMiddleware.use.bind(securityMiddleware));

        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    describe('Global Security Headers', () => {
        it('should set security headers on all responses', async () => {
            const response = await request(app.getHttpServer()).get('/test-route').expect(404); // Route doesn't exist, but middleware should still run

            // Global headers
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
            expect(response.headers['x-dns-prefetch-control']).toBe('off');
            expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
            expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
            expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
            expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');

            // Route-specific headers (should use default policy)
            expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
            expect(response.headers['content-security-policy']).toContain("default-src 'self'");
            expect(response.headers['cache-control']).toBe('private, max-age=0');
        });
    });

    describe('Route-Specific Security Policies', () => {
        it('should apply strict policy to auth routes', async () => {
            const response = await request(app.getHttpServer()).get('/auth/login').expect(404);

            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['cache-control']).toContain('no-store');
            expect(response.headers['cache-control']).toContain('no-cache');
            expect(response.headers['content-security-policy']).toContain("default-src 'self'");
        });

        it('should apply static assets policy to CSS files', async () => {
            const response = await request(app.getHttpServer()).get('/styles.css').expect(404);

            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['content-security-policy']).toContain("default-src 'none'");
            // Cache control depends on environment
            expect(response.headers['cache-control']).toMatch(/public, max-age=\d+/);
        });

        it('should apply static assets policy case-insensitively', async () => {
            const response = await request(app.getHttpServer()).get('/script.JS').expect(404);

            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['content-security-policy']).toContain("default-src 'none'");
        });

        it('should apply moderate policy to API routes', async () => {
            const response = await request(app.getHttpServer()).get('/api/users').expect(404);

            expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
            expect(response.headers['cache-control']).toBe('private, max-age=300');
            expect(response.headers['content-security-policy']).toContain("default-src 'self'");
        });
    });

    describe('Content Security Policy Nonce', () => {
        it('should include unique nonces in CSP headers', async () => {
            const response1 = await request(app.getHttpServer()).get('/auth/login').expect(404);

            const response2 = await request(app.getHttpServer()).get('/auth/register').expect(404);

            const csp1 = response1.headers['content-security-policy'];
            const csp2 = response2.headers['content-security-policy'];

            // Both should have nonces
            expect(csp1).toMatch(/nonce-[A-Za-z0-9+/]+=*/);
            expect(csp2).toMatch(/nonce-[A-Za-z0-9+/]+=*/);

            // Extract nonces
            const nonce1 = csp1.match(/nonce-([A-Za-z0-9+/]+=*)/)?.[1];
            const nonce2 = csp2.match(/nonce-([A-Za-z0-9+/]+=*)/)?.[1];

            // Nonces should be different
            expect(nonce1).toBeDefined();
            expect(nonce2).toBeDefined();
            expect(nonce1).not.toBe(nonce2);
        });

        it('should not contain nonce placeholders in final CSP', async () => {
            const response = await request(app.getHttpServer()).get('/auth/login').expect(404);

            const csp = response.headers['content-security-policy'];
            expect(csp).not.toContain('{NONCE_PLACEHOLDER}');
            expect(csp).not.toContain('nonce-{NONCE_PLACEHOLDER}');
        });
    });

    describe('HTTPS Security Headers', () => {
        it('should set HSTS header for HTTPS requests', async () => {
            // Simulate HTTPS request
            const response = await request(app.getHttpServer()).get('/test').set('X-Forwarded-Proto', 'https').expect(404);

            expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains; preload');
        });

        it('should not set HSTS header for HTTP requests', async () => {
            const response = await request(app.getHttpServer()).get('/test').set('X-Forwarded-Proto', 'http').expect(404);

            expect(response.headers['strict-transport-security']).toBeUndefined();
        });
    });

    describe('Global Header Overrides', () => {
        it('should apply global overrides for static assets', async () => {
            const response = await request(app.getHttpServer()).get('/logo.png').expect(404);

            // Global override should apply
            expect(response.headers['x-content-type-options']).toBe('nosniff');
        });
    });

    describe('Performance and Caching', () => {
        it('should handle multiple requests efficiently', async () => {
            const startTime = Date.now();

            // Make multiple requests to test caching
            const promises = Array.from({ length: 10 }, (_, i) => request(app.getHttpServer()).get(`/api/test-${i}`).expect(404));

            await Promise.all(promises);

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should complete reasonably quickly (lenient threshold for CI stability)
            expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 requests
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed URLs gracefully', async () => {
            // Test with various malformed URLs
            const malformedUrls = ['/test%', '/test%zz', '/test/../../../etc/passwd', '/test?param=value%'];

            for (const url of malformedUrls) {
                const response = await request(app.getHttpServer()).get(url).expect(404);

                // Should still have security headers
                expect(response.headers['x-content-type-options']).toBe('nosniff');
                expect(response.headers['x-frame-options']).toBeDefined();
            }
        });
    });
});
