import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@/app/services/redis/redis.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { createHash } from 'crypto';

@Injectable()
export class RateLimitGuard implements CanActivate {
    private readonly logger = new CustomLoggerService();
    private readonly maxAttempts = 10;
    private readonly windowDuration = 15 * 60; // 15 minutes in seconds

    constructor(private readonly redisService: RedisService) {
        this.logger.setContext(RateLimitGuard.name);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // Get the endpoint path for more specific rate limiting
        const endpoint = request.route?.path || request.url || 'unknown';

        // Secure IP extraction with validation
        const ip = this.extractSecureIP(request);
        const email = this.sanitizeEmail(request.body?.email);

        // Create a secure, hashed key for rate limiting (include endpoint for specificity)
        const rateLimitKey = this.createSecureKey(ip, email, endpoint);

        try {
            // Use atomic operation to prevent race conditions
            const attempts = await this.getAndIncrementAttempts(rateLimitKey);

            // Get current TTL for better error messages
            const ttl = await this.redisService.ttl(rateLimitKey);

            if (attempts > this.maxAttempts) {
                this.logger.warn('Rate limit exceeded', {
                    hashedKey: this.hashForLogging(rateLimitKey),
                    attempts,
                    maxAttempts: this.maxAttempts,
                    endpoint,
                    ttlRemaining: ttl,
                    timestamp: new Date().toISOString(),
                });

                throw new HttpException(
                    {
                        success: false,
                        message: `Too many requests. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
                        statusCode: HttpStatus.TOO_MANY_REQUESTS,
                        retryAfter: ttl > 0 ? ttl : this.windowDuration,
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            return true;
        } catch (error) {
            // If it's our rate limit error, re-throw it
            if (error instanceof HttpException) {
                throw error;
            }

            // Log Redis errors but don't block the request
            this.logger.error('Rate limiting Redis error:', {
                error: error.message,
                key: this.hashForLogging(rateLimitKey),
            });

            // Fail open - allow request if Redis is down
            return true;
        }
    }

    /**
     * Extract IP address securely, prioritizing real IP over potentially spoofed headers
     */
    private extractSecureIP(request: any): string {
        // In production, validate X-Forwarded-For against trusted proxies
        const forwardedFor = request.headers['x-forwarded-for'];
        const realIP = request.headers['x-real-ip'];
        const remoteAddress = request.connection?.remoteAddress || request.socket?.remoteAddress;

        // Use the most reliable IP source
        let ip = remoteAddress || '127.0.0.1';

        // Only trust X-Forwarded-For in development or from trusted proxies
        if (process.env.NODE_ENV === 'development' && forwardedFor) {
            ip = forwardedFor.split(',')[0].trim();
        } else if (realIP && this.isTrustedProxy(request)) {
            ip = realIP;
        }

        // Validate IP format
        return this.validateAndNormalizeIP(ip);
    }

    /**
     * Check if request comes from a trusted proxy
     */
    private isTrustedProxy(request: any): boolean {
        // In production, implement proper trusted proxy validation
        // For now, we'll be conservative and not trust proxy headers
        return false;
    }

    /**
     * Validate and normalize IP address
     */
    private validateAndNormalizeIP(ip: string): string {
        // Remove IPv6 prefix if present
        ip = ip.replace(/^::ffff:/, '');

        // Basic IP validation
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;

        if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
            return '127.0.0.1'; // Fallback to localhost
        }

        return ip;
    }

    /**
     * Sanitize email input to prevent injection attacks
     */
    private sanitizeEmail(email: any): string {
        if (!email || typeof email !== 'string') {
            return 'unknown';
        }

        // Basic email validation and sanitization
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return 'invalid';
        }

        // Normalize email (lowercase, trim)
        return email.trim().toLowerCase();
    }

    /**
     * Create a secure, hashed key for rate limiting
     */
    private createSecureKey(ip: string, email: string, endpoint: string): string {
        const rawKey = `rate_limit:password_reset:${endpoint}:${ip}:${email}`;
        // Hash the key to prevent Redis key enumeration
        return createHash('sha256').update(rawKey).digest('hex');
    }

    /**
     * Create a hash for logging (different from the storage key)
     */
    private hashForLogging(key: string): string {
        return createHash('sha256')
            .update(key + 'logging_salt')
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Atomically get and increment attempts counter
     */
    private async getAndIncrementAttempts(key: string): Promise<number> {
        // Use Redis INCR for atomic operation - this is race-condition safe
        const attempts = await this.redisService.incr(key);

        // Set expiration only on first attempt
        if (attempts === 1) {
            await this.redisService.expire(key, this.windowDuration);
        }

        return attempts;
    }

    /**
     * Check current rate limit status for a specific endpoint (for debugging)
     */
    async getRateLimitStatus(ip: string, email: string, endpoint: string): Promise<{ attempts: number; ttl: number; isBlocked: boolean }> {
        const rateLimitKey = this.createSecureKey(ip, email, endpoint);
        const attempts = await this.redisService.get(rateLimitKey);
        const ttl = await this.redisService.ttl(rateLimitKey);

        return {
            attempts: attempts ? parseInt(attempts, 10) : 0,
            ttl: ttl > 0 ? ttl : 0,
            isBlocked: attempts ? parseInt(attempts, 10) > this.maxAttempts : false,
        };
    }

    /**
     * Reset rate limit for a specific endpoint (for testing/admin purposes)
     */
    async resetRateLimit(ip: string, email: string, endpoint: string): Promise<boolean> {
        const rateLimitKey = this.createSecureKey(ip, email, endpoint);
        const result = await this.redisService.del(rateLimitKey);

        this.logger.log('Rate limit reset for endpoint', {
            hashedKey: this.hashForLogging(rateLimitKey),
            endpoint,
            success: result > 0,
            timestamp: new Date().toISOString(),
        });

        return result > 0;
    }
}
