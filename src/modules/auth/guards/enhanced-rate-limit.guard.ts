import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { RedisService } from '@/app/services/redis/redis.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { createHash } from 'crypto';
import { authConfig } from '@/config/auth.config';

interface RateLimitOptions {
    windowDuration: number;
    maxAttempts: number;
    keyPrefix: string;
    blockDuration?: number;
}

@Injectable()
export class EnhancedRateLimitGuard implements CanActivate {
    private readonly logger = new CustomLoggerService();

    constructor(
        private readonly redisService: RedisService,
        @Inject(authConfig.KEY)
        private readonly config: ConfigType<typeof authConfig>,
    ) {
        this.logger.setContext(EnhancedRateLimitGuard.name);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // Get rate limiting options for password reset
        const options: RateLimitOptions = {
            windowDuration: this.config.passwordReset.rateLimitWindow,
            maxAttempts: this.config.passwordReset.maxAttempts,
            keyPrefix: 'rate_limit:password_reset',
            blockDuration: this.config.passwordReset.rateLimitWindow * 2, // Block for double the window
        };

        return this.checkRateLimit(request, options);
    }

    private async checkRateLimit(request: any, options: RateLimitOptions): Promise<boolean> {
        const ip = this.extractSecureIP(request);
        const email = this.sanitizeEmail(request.body?.email);
        const userAgent = this.sanitizeUserAgent(request.headers['user-agent']);

        // Create multiple keys for different types of rate limiting
        const ipKey = this.createSecureKey(options.keyPrefix, 'ip', ip);
        const emailKey = this.createSecureKey(options.keyPrefix, 'email', email);
        const combinedKey = this.createSecureKey(options.keyPrefix, 'combined', `${ip}:${email}`);
        const suspiciousKey = this.createSecureKey(options.keyPrefix, 'suspicious', `${ip}:${userAgent}`);

        try {
            // Check multiple rate limits
            const [ipAttempts, emailAttempts, combinedAttempts] = await Promise.all([
                this.getAndIncrementAttempts(ipKey, options.windowDuration),
                this.getAndIncrementAttempts(emailKey, options.windowDuration),
                this.getAndIncrementAttempts(combinedKey, options.windowDuration),
            ]);

            // Check for suspicious patterns
            await this.detectSuspiciousActivity(suspiciousKey, ip, email, userAgent, options.windowDuration);

            const rateLimitExceeded =
                ipAttempts > options.maxAttempts * 2 || // IP-based limit (higher threshold)
                emailAttempts > options.maxAttempts * 3 || // Email-based limit (even higher)
                combinedAttempts > options.maxAttempts; // Combined limit (strictest)

            if (rateLimitExceeded) {
                this.logger.warn('Rate limit exceeded for password reset', {
                    hashedIP: this.hashForLogging(ip),
                    hashedEmail: this.hashForLogging(email),
                    ipAttempts,
                    emailAttempts,
                    combinedAttempts,
                    timestamp: new Date().toISOString(),
                });

                // Implement progressive blocking
                if (combinedAttempts > options.maxAttempts * 2) {
                    await this.blockTemporarily(combinedKey, options.blockDuration || options.windowDuration * 2);
                }

                throw new HttpException(
                    {
                        success: false,
                        message: 'Too many password reset attempts. Please try again later.',
                        statusCode: HttpStatus.TOO_MANY_REQUESTS,
                        retryAfter: options.windowDuration,
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            return true;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            this.logger.error('Rate limiting Redis error:', {
                error: error.message,
                hashedIP: this.hashForLogging(ip),
            });

            // Fail open but log the incident for monitoring
            return true;
        }
    }

    private async detectSuspiciousActivity(suspiciousKey: string, ip: string, email: string, userAgent: string, windowDuration: number): Promise<void> {
        // Track rapid requests from same IP with different emails
        const rapidRequestKey = `${suspiciousKey}:rapid`;
        const rapidRequests = await this.getAndIncrementAttempts(rapidRequestKey, 60); // 1-minute window

        if (rapidRequests > 10) {
            this.logger.warn('Suspicious rapid requests detected', {
                hashedIP: this.hashForLogging(ip),
                rapidRequests,
                timestamp: new Date().toISOString(),
            });

            // Add to temporary block list
            await this.blockTemporarily(suspiciousKey, windowDuration * 3);
        }
    }

    private async blockTemporarily(key: string, blockDuration: number): Promise<void> {
        const blockKey = `blocked:${key}`;
        await this.redisService.set(blockKey, 'blocked', blockDuration);
    }

    private async isTemporarilyBlocked(key: string): Promise<boolean> {
        const blockKey = `blocked:${key}`;
        const blocked = await this.redisService.get(blockKey);
        return blocked !== null;
    }

    private extractSecureIP(request: any): string {
        // More secure IP extraction
        const forwardedFor = request.headers['x-forwarded-for'];
        const realIP = request.headers['x-real-ip'];
        const remoteAddress = request.connection?.remoteAddress || request.socket?.remoteAddress;

        let ip = remoteAddress || '127.0.0.1';

        // Only trust proxy headers in specific environments
        if (this.isTrustedEnvironment() && forwardedFor) {
            const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
            ip = ips[0]; // Get the first (client) IP
        } else if (realIP && this.isTrustedEnvironment()) {
            ip = realIP;
        }

        return this.validateAndNormalizeIP(ip);
    }

    private isTrustedEnvironment(): boolean {
        // Only trust proxy headers in development or when explicitly configured
        return process.env.NODE_ENV === 'development' || process.env.TRUST_PROXY === 'true';
    }

    private validateAndNormalizeIP(ip: string): string {
        ip = ip.replace(/^::ffff:/, '');

        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

        if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
            return '127.0.0.1';
        }

        return ip;
    }

    private sanitizeEmail(email: any): string {
        if (!email || typeof email !== 'string') {
            return 'unknown';
        }

        // Strict email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

        if (!emailRegex.test(email) || email.length > 254) {
            return 'invalid';
        }

        return email.trim().toLowerCase();
    }

    private sanitizeUserAgent(userAgent: any): string {
        if (!userAgent || typeof userAgent !== 'string') {
            return 'unknown';
        }

        // Truncate and sanitize user agent
        return userAgent.substring(0, 200).replace(/[^a-zA-Z0-9\s\-_./()]/g, '');
    }

    private createSecureKey(prefix: string, type: string, value: string): string {
        const rawKey = `${prefix}:${type}:${value}`;
        return createHash('sha256').update(rawKey).digest('hex');
    }

    private hashForLogging(value: string): string {
        return createHash('sha256')
            .update(value + process.env.LOG_SALT || 'default_salt')
            .digest('hex')
            .substring(0, 16);
    }

    private async getAndIncrementAttempts(key: string, windowDuration: number): Promise<number> {
        const attempts = await this.redisService.incr(key);

        if (attempts === 1) {
            await this.redisService.expire(key, windowDuration);
        }

        return attempts;
    }
}
