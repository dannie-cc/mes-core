import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { Request, Response, NextFunction } from 'express';
import { Test, TestingModule } from '@nestjs/testing';

// Mock the security config
jest.mock('@/config/security-headers.config', () => ({
    routeSecurityMap: [
        {
            name: 'auth',
            priority: 1,
            matcher: (path: string) => path.startsWith('/auth'),
            policy: {
                frameOptions: 'DENY',
                csp: {
                    'default-src': "'self'",
                    'script-src': "'self' 'nonce-{NONCE_PLACEHOLDER}'",
                },
                cache: {
                    control: 'no-store, no-cache, must-revalidate',
                },
            },
        },
        {
            name: 'publicAssets',
            priority: 3,
            matcher: (path: string) => {
                const patterns = ['*.css', '*.js', '*.png', '/assets/*'];
                const lowerPath = path.toLowerCase();
                return patterns.some((pattern) => {
                    if (pattern.includes('*')) {
                        const regex = new RegExp('^' + pattern.toLowerCase().replace(/\*/g, '.*') + '$');
                        return regex.test(lowerPath);
                    }
                    return lowerPath.startsWith(pattern.toLowerCase());
                });
            },
            policy: {
                frameOptions: 'DENY',
                csp: {
                    'default-src': "'none'",
                },
                cache: {
                    control: 'public, max-age=31536000, immutable',
                },
                globalOverrides: {
                    'x-content-type-options': 'nosniff',
                },
            },
        },
        {
            name: 'api',
            priority: 5,
            matcher: (path: string) => path.startsWith('/api'),
            policy: {
                frameOptions: 'SAMEORIGIN',
                csp: {
                    'default-src': "'self'",
                    'script-src': "'self'",
                },
                cache: {
                    control: 'private, max-age=300',
                },
            },
        },
    ],
    defaultPolicy: {
        frameOptions: 'SAMEORIGIN',
        csp: {
            'default-src': "'self'",
        },
        cache: {
            control: 'private, max-age=0',
        },
    },
}));

describe('SecurityHeadersMiddleware', () => {
    let middleware: SecurityHeadersMiddleware;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SecurityHeadersMiddleware],
        }).compile();

        middleware = module.get<SecurityHeadersMiddleware>(SecurityHeadersMiddleware);

        // Reset mocks with proper typing
        mockResponse = {
            setHeader: jest.fn(),
            locals: {},
        };
        mockNext = jest.fn();
    });

    const createMockRequest = (path: string, method: string = 'GET', secure: boolean = false): Request => {
        return {
            path,
            method,
            secure,
            get: jest.fn().mockReturnValue(secure ? 'https' : 'http'),
        } as any as Request;
    };

    describe('Basic Middleware Functionality', () => {
        it('should be defined', () => {
            expect(middleware).toBeDefined();
        });

        it('should call next() after processing', () => {
            const req = createMockRequest('/test');
            middleware.use(req, mockResponse as Response, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should generate and store nonce in response locals', () => {
            const req = createMockRequest('/test');
            middleware.use(req, mockResponse as Response, mockNext);
            expect(mockResponse.locals?.cspNonce).toBeDefined();
            expect(typeof mockResponse.locals?.cspNonce).toBe('string');
            expect(mockResponse.locals?.cspNonce.length).toBeGreaterThan(0);
        });
    });

    describe('Global Headers', () => {
        it('should set basic global headers', () => {
            const req = createMockRequest('/test');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'off');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Permitted-Cross-Domain-Policies', 'none');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cross-Origin-Embedder-Policy', 'require-corp');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'cross-origin');
        });

        it('should set HSTS header when secure', () => {
            const req = createMockRequest('/test', 'GET', true);
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        });

        it('should set HSTS header when X-Forwarded-Proto is https', () => {
            const req = createMockRequest('/test');
            req.get = jest.fn().mockReturnValue('https');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        });

        it('should not set HSTS header when not secure', () => {
            const req = createMockRequest('/test', 'GET', false);
            req.get = jest.fn().mockReturnValue('http');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).not.toHaveBeenCalledWith('Strict-Transport-Security', expect.any(String));
        });
    });

    describe('Route-Specific Policies', () => {
        it('should apply auth policy for authentication routes', () => {
            const req = createMockRequest('/auth/login');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate');
        });

        it('should apply static assets policy for CSS files', () => {
            const req = createMockRequest('/styles.css');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
        });

        it('should apply API policy for API routes', () => {
            const req = createMockRequest('/api/users');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=300');
        });

        it('should apply default policy for unmatched routes', () => {
            const req = createMockRequest('/unmatched-route');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=0');
        });
    });

    describe('Content Security Policy', () => {
        it('should generate CSP with nonce replacement', () => {
            const req = createMockRequest('/auth/login');
            middleware.use(req, mockResponse as Response, mockNext);

            const cspCalls = (mockResponse.setHeader as jest.Mock).mock.calls.filter((call) => call[0] === 'Content-Security-Policy');

            expect(cspCalls).toHaveLength(1);
            const cspValue = cspCalls[0][1];
            expect(cspValue).toContain("default-src 'self'");
            expect(cspValue).toContain("script-src 'self' 'nonce-");
            expect(cspValue).not.toContain('{NONCE_PLACEHOLDER}');
        });

        it('should handle CSP directives without nonce placeholders', () => {
            const req = createMockRequest('/api/test');
            middleware.use(req, mockResponse as Response, mockNext);

            const cspCalls = (mockResponse.setHeader as jest.Mock).mock.calls.filter((call) => call[0] === 'Content-Security-Policy');

            expect(cspCalls).toHaveLength(1);
            const cspValue = cspCalls[0][1];
            expect(cspValue).toContain("default-src 'self'");
            expect(cspValue).toContain("script-src 'self'");
        });
    });

    describe('Case-Insensitive Static Assets Matching', () => {
        it('should match uppercase file extensions', () => {
            const req = createMockRequest('/script.JS');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
        });

        it('should match mixed case file extensions', () => {
            const req = createMockRequest('/image.PnG');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
        });

        it('should match uppercase directory paths', () => {
            const req = createMockRequest('/ASSETS/logo.png');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
        });
    });

    describe('Global Overrides', () => {
        it('should apply global overrides from policy', () => {
            const req = createMockRequest('/styles.css');
            middleware.use(req, mockResponse as Response, mockNext);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('x-content-type-options', 'nosniff');
        });

        it('should not override headers when no global overrides are specified', () => {
            const req = createMockRequest('/api/test');
            middleware.use(req, mockResponse as Response, mockNext);

            // Should use default global header, not policy-specific override
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        });
    });

    describe('LRU Cache Functionality', () => {
        it('should handle multiple requests to same route efficiently', () => {
            // Multiple requests to same route should complete successfully
            for (let i = 0; i < 10; i++) {
                mockResponse = { setHeader: jest.fn(), locals: {} };
                const req = createMockRequest('/api/test', 'GET');
                middleware.use(req, mockResponse as Response, mockNext);
                expect(mockNext).toHaveBeenCalled();
            }
        });

        it('should handle different cache keys for different HTTP methods', () => {
            // GET request
            const req1 = createMockRequest('/api/test', 'GET');
            middleware.use(req1, mockResponse as Response, mockNext);

            // POST request to same path
            const req2 = createMockRequest('/api/test', 'POST');
            middleware.use(req2, mockResponse as Response, mockNext);

            // Both should complete without error
            expect(mockNext).toHaveBeenCalledTimes(2);
        });
    });
    describe('Nonce Generation', () => {
        it('should generate unique nonces for each request', () => {
            const nonces: string[] = [];

            for (let i = 0; i < 5; i++) {
                mockResponse.locals = {};
                const req = createMockRequest('/test');
                middleware.use(req, mockResponse as Response, mockNext);
                nonces.push(mockResponse.locals?.cspNonce);
            }

            const uniqueNonces = new Set(nonces);
            expect(uniqueNonces.size).toBe(5);
        });

        it('should generate base64 nonces of appropriate length', () => {
            const req = createMockRequest('/test');
            middleware.use(req, mockResponse as Response, mockNext);

            const nonce = mockResponse.locals?.cspNonce;
            expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
            expect(nonce.length).toBeGreaterThanOrEqual(20); // 16 bytes -> ~22 chars base64
        });
    });

    describe('Error Handling', () => {
        it('should handle missing policy gracefully', () => {
            const req = createMockRequest('/completely/unknown/route');

            expect(() => {
                middleware.use(req, mockResponse as Response, mockNext);
            }).not.toThrow();

            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('should handle malformed request objects', () => {
            const req = {
                path: undefined,
                method: 'GET',
                secure: false,
                get: jest.fn(),
            } as any as Request;

            expect(() => {
                middleware.use(req, mockResponse as Response, mockNext);
            }).not.toThrow();
        });

        it('should handle response objects without setHeader method', () => {
            const req = createMockRequest('/test');
            const brokenResponse = { locals: {} } as any as Response;

            expect(() => {
                middleware.use(req, brokenResponse, mockNext);
            }).not.toThrow();
        });
    });
});
