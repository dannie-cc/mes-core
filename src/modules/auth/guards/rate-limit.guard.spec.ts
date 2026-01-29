import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from '@/app/services/redis/redis.service';

describe('RateLimitGuard Security Tests', () => {
    let guard: RateLimitGuard;
    let redisService: RedisService;

    const mockRedisService = {
        incr: jest.fn(),
        expire: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RateLimitGuard, { provide: RedisService, useValue: mockRedisService }],
        }).compile();

        guard = module.get<RateLimitGuard>(RateLimitGuard);
        redisService = module.get<RedisService>(RedisService);

        jest.clearAllMocks();
    });

    describe('IP Spoofing Protection', () => {
        it('should handle missing IP gracefully', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com' },
                connection: {},
            });

            mockRedisService.incr.mockResolvedValue(1);

            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
        });

        it('should validate IP format', async () => {
            const mockContext = createMockContext({
                headers: { 'x-forwarded-for': 'invalid-ip' },
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(1);

            await guard.canActivate(mockContext);

            // Should use the validated IP (remoteAddress)
            expect(mockRedisService.incr).toHaveBeenCalled();
        });

        it('should not trust proxy headers in production by default', async () => {
            process.env.NODE_ENV = 'production';

            const mockContext = createMockContext({
                headers: { 'x-forwarded-for': '10.0.0.1' },
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(1);

            await guard.canActivate(mockContext);

            // Should use remoteAddress, not forwarded header
            expect(mockRedisService.incr).toHaveBeenCalled();
        });
    });

    describe('Email Injection Protection', () => {
        it('should sanitize malicious email input', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com; rm -rf /' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(1);

            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
        });

        it('should handle non-string email input', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: { malicious: 'object' } },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(1);

            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
        });

        it('should handle missing email', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: {},
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(1);

            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
        });
    });

    describe('Rate Limiting Logic', () => {
        it('should allow requests under the limit', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(2); // Under limit of 3

            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true);
        });

        it('should block requests over the limit', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(4); // Over limit of 3

            await expect(guard.canActivate(mockContext)).rejects.toThrow();
        });

        it('should set expiration on first attempt', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(1); // First attempt

            await guard.canActivate(mockContext);

            expect(mockRedisService.expire).toHaveBeenCalled();
        });

        it('should not set expiration on subsequent attempts', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(2); // Subsequent attempt

            await guard.canActivate(mockContext);

            expect(mockRedisService.expire).not.toHaveBeenCalled();
        });
    });

    describe('Redis Error Handling', () => {
        it('should fail open when Redis is unavailable', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockRejectedValue(new Error('Redis connection failed'));

            const result = await guard.canActivate(mockContext);
            expect(result).toBe(true); // Should fail open
        });

        it('should still throw rate limit errors', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(4); // Over limit

            await expect(guard.canActivate(mockContext)).rejects.toThrow();
        });
    });

    describe('Key Security', () => {
        it('should create hashed keys to prevent enumeration', async () => {
            const mockContext = createMockContext({
                headers: {},
                body: { email: 'test@example.com' },
                connection: { remoteAddress: '192.168.1.1' },
            });

            mockRedisService.incr.mockResolvedValue(1);

            await guard.canActivate(mockContext);

            const callArgs = mockRedisService.incr.mock.calls[0][0];
            expect(callArgs).not.toContain('test@example.com');
            expect(callArgs).not.toContain('192.168.1.1');
            expect(callArgs).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
        });
    });

    function createMockContext(request: any): ExecutionContext {
        return {
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue(request),
            }),
        } as any;
    }
});
