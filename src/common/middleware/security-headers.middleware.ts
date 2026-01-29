import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { routeSecurityMap, defaultPolicy, SecurityPolicy, ContentSecurityPolicy, NONCE_PLACEHOLDER } from '@/config/security-headers.config';
import { LRUCache } from 'lru-cache';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
    private routeCache = new LRUCache<string, SecurityPolicy>({ max: 500 }); // Limit to 500 cached policies

    use(req: Request, res: Response, next: NextFunction) {
        // Check if security headers are enabled
        const securityHeadersEnabled = process.env.SECURITY_HEADERS_ENABLED !== 'false';

        if (!securityHeadersEnabled) {
            next();
            return;
        }

        const path = req.path;
        const policy = this.getPolicyForRoute(path, req);

        // Generate nonce for this request
        const nonce = this.generateNonce();

        // Store nonce in response locals for use in templates
        res.locals.cspNonce = nonce;

        // HEADER MERGE ORDER (ensures correct precedence):
        // 1. Global headers (applied to all routes as baseline)
        // 2. Route-specific policy headers (can override globals)
        // 3. Policy globalOverrides (final word on global headers)

        this.applyGlobalHeaders(res, req);
        this.applyPolicy(res, policy, nonce);

        next();
    }

    private generateNonce(): string {
        return randomBytes(16).toString('base64');
    }

    private applyGlobalHeaders(res: Response, req?: Request): void {
        // Check if response object has setHeader method
        if (!res || typeof res.setHeader !== 'function') {
            return;
        }

        // Base security headers applied to all routes
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // HTTPS enforcement (only set when using HTTPS)
        const isSecure = req?.secure || req?.get('X-Forwarded-Proto') === 'https' || process.env.NODE_ENV === 'production';
        if (isSecure) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        // Additional security headers
        res.setHeader('X-DNS-Prefetch-Control', 'off'); // Privacy protection
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none'); // Flash/Silverlight protection
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp'); // Isolation for SharedArrayBuffer
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); // Window isolation
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow frontend to access backend resources
    }

    private getPolicyForRoute(path: string, req: Request): SecurityPolicy {
        // Handle undefined or null paths gracefully
        const safePath = path || '';

        // Create cache key that includes HTTP method to prevent collision
        const cacheKey = `${req.method}:${safePath}`;

        // Check LRU cache first for performance
        const cachedPolicy = this.routeCache.get(cacheKey);
        if (cachedPolicy) {
            return cachedPolicy;
        }

        // Find the first matching rule (rules are sorted by priority)
        const matchingRule = routeSecurityMap.find((rule) => rule.matcher(safePath));

        let policy: SecurityPolicy;

        if (matchingRule) {
            // Deep clone policy to prevent mutation
            policy = structuredClone(matchingRule.policy);

            // Special handling for API routes based on method and sensitivity
            if (matchingRule.name === 'api') {
                policy = this.customizeApiPolicy(path, req, policy);
            }
        } else {
            // No rule matched, use default policy (also cloned)
            policy = structuredClone(defaultPolicy);
        }

        // Cache the result (LRU cache will handle size limits automatically)
        this.routeCache.set(cacheKey, policy);
        return policy;
    }
    private customizeApiPolicy(path: string, req: Request, basePolicy: SecurityPolicy): SecurityPolicy {
        // Check if this is a sensitive endpoint
        const isSensitive = routeSecurityMap.find((rule) => rule.name === 'sensitive')?.matcher(path);

        if (req.method === 'GET' && !isSensitive) {
            return basePolicy; // Use moderate policy as-is
        } else if (isSensitive) {
            // Sensitive endpoints get strict caching
            return { ...basePolicy, cache: { control: 'no-store, no-cache, must-revalidate' } };
        } else {
            // Non-GET API requests get no-cache
            return { ...basePolicy, cache: { control: 'no-cache' } };
        }
    }

    private applyPolicy(res: Response, policy: SecurityPolicy, nonce: string): void {
        // Check if response object has setHeader method
        if (!res || typeof res.setHeader !== 'function') {
            return;
        }

        // Apply route-specific headers
        res.setHeader('X-Frame-Options', policy.frameOptions);

        // Apply CSP with environment-based report-only mode
        const cspReportOnly = process.env.CSP_REPORT_ONLY !== 'false';
        const cspHeaderName = cspReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
        res.setHeader(cspHeaderName, this.buildCSP(policy.csp, nonce));

        res.setHeader('Cache-Control', policy.cache.control);

        // Cache headers
        if (policy.cache.pragma) res.setHeader('Pragma', policy.cache.pragma);
        if (policy.cache.expires) res.setHeader('Expires', policy.cache.expires);

        // Apply any global header overrides for this route
        if (policy.globalOverrides) {
            Object.entries(policy.globalOverrides).forEach(([header, value]) => {
                if (value) {
                    res.setHeader(header, value);
                }
            });
        }
    }
    private buildCSP(csp: ContentSecurityPolicy, nonce: string): string {
        const directives: string[] = [];

        // Standard CSP directives (type-safe access)
        const standardDirectives = [
            'default-src',
            'script-src',
            'style-src',
            'img-src',
            'font-src',
            'connect-src',
            'media-src',
            'object-src',
            'base-uri',
            'form-action',
            'frame-src',
            'frame-ancestors',
            'manifest-src',
            'worker-src',
            'child-src',
            'navigate-to',
        ] as const;

        standardDirectives.forEach((directive) => {
            const value = csp[directive];
            if (value && value !== '') {
                let processedValue: string;

                if (Array.isArray(value)) {
                    processedValue = value.join(' ');
                } else {
                    processedValue = value;
                }

                // Replace nonce placeholder with actual nonce
                if (processedValue && typeof processedValue === 'string') {
                    processedValue = processedValue.replace(/nonce-\{NONCE_PLACEHOLDER\}/g, `nonce-${nonce}`);
                }

                directives.push(`${directive} ${processedValue}`);
            }
        });

        // Special boolean directives
        if (csp['upgrade-insecure-requests']) {
            directives.push('upgrade-insecure-requests');
        }

        if (csp['block-all-mixed-content']) {
            directives.push('block-all-mixed-content');
        }

        // Report directives
        if (csp['report-uri']) {
            directives.push(`report-uri ${csp['report-uri']}`);
        }

        if (csp['report-to']) {
            directives.push(`report-to ${csp['report-to']}`);
        }

        return directives.filter(Boolean).join('; ');
    }
}
