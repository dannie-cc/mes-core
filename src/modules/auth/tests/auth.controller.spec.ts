import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { RedisService } from '@/app/services/redis/redis.service';
import { JwtUser } from '@/types/jwt.types';

import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockAuthService = {
        signup: jest.fn(),
        verifyEmail: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
    };

    const mockRedisService = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        ttl: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: mockAuthService },
                { provide: CustomLoggerService, useValue: { log: jest.fn(), error: jest.fn(), debug: jest.fn(), setContext: jest.fn() } },
                { provide: RedisService, useValue: mockRedisService },
            ],
        })
            .overrideGuard(RateLimitGuard)
            .useValue({ canActivate: jest.fn().mockReturnValue(true) })
            .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('signup', () => {
        it('should call signup and return result', async () => {
            const dto = { email: 'test@example.com', password: '123', firstName: 'A', lastName: 'B', sendMail: false, acceptTerms: true, factoryName: 'Test Factory' };
            const mockResult = { success: true, data: { accessToken: 'token', email: dto.email } };

            mockAuthService.signup.mockResolvedValue(mockResult);

            const result = await controller.signup(dto);

            expect(authService.signup).toHaveBeenCalledWith(dto);
            expect(result.data).toBe(mockResult);
        });

        it('Should throw if required fields are missing .', async () => {
            const dto = { email: '', password: '', firstName: 'A', lastName: 'B', sendMail: false, acceptTerms: true, factoryName: '' };
            // const mockResult = { success: false, message: 'Invalid credentials' };

            // const result = await controller.signup(dto);
            mockAuthService.signup.mockRejectedValue(new NotFoundException('Invalid credentials'));

            await expect(controller.signup(dto)).rejects.toThrow('Invalid credentials');

            expect(authService.signup).toHaveBeenCalledWith(dto);
        });
    });

    describe('verifyEmail', () => {
        it('should call verifyEmail and return result', async () => {
            const token = 'verify-token';
            const mockResult = { message: 'Email verified successfully', success: true };
            mockAuthService.verifyEmail.mockResolvedValue(mockResult);

            const result = await controller.verifyEmail(token);
            expect(authService.verifyEmail).toHaveBeenCalledWith(token);

            expect(result.data).toBe(mockResult);
        });

        it('sShould return error if token is invalid or expired', async () => {
            const token = 'invalid-token';

            mockAuthService.verifyEmail.mockRejectedValue(new NotFoundException('Invalid verification token'));

            await expect(controller.verifyEmail(token)).rejects.toThrow(NotFoundException);

            expect(authService.verifyEmail).toHaveBeenCalledWith(token);
        });
    });

    describe('login', () => {
        it('should call login and return result', async () => {
            const dto = { email: 'test@example.com', password: '123' };

            const mockResult = { data: { accessToken: 'token', email: dto.email }, success: true };
            mockAuthService.login.mockResolvedValue(mockResult);

            const result = await controller.login(dto);
            expect(authService.login).toHaveBeenCalledWith(dto);
            expect(result.data).toBe(mockResult);
        });

        it('should throw error if credentials are invalid', async () => {
            const credentials = { email: 'ohgodthatstheemail', password: 'ohgodthatsapassword' };

            mockAuthService.login.mockRejectedValue(new InternalServerErrorException('Invalid credentials'));

            await expect(controller.login(credentials)).rejects.toThrow(InternalServerErrorException);
            expect(authService.login).toHaveBeenCalledWith(credentials);
        });

        it(' handle and return error if authService throws an error', async () => {
            const credentials = { email: 'failagainsorry@example.com', password: 'failpass:(' };
            const error = new InternalServerErrorException('Unexpected error');

            mockAuthService.login.mockRejectedValue(error);

            await expect(controller.login(credentials)).rejects.toThrow(InternalServerErrorException);
            expect(authService.login).toHaveBeenCalledWith(credentials);
        });
    });

    describe('logout', () => {
        it('should call logout and return result', async () => {
            const req = { user: { id: 'user-1', email: '', roleId: '', factoryId: 'factory-1', permissions: [] } };
            const mockResult = { message: 'Logged out successfully' };

            mockAuthService.logout.mockResolvedValue(mockResult);

            const result = await controller.logout(req.user as JwtUser);
            expect(authService.logout).toHaveBeenCalledWith('user-1');
            expect(result.data).toBe(mockResult);
        });

        it('Should handle and return error if authService.logout throws', async () => {
            const req = { user: { id: 'user-1', email: '', roleId: '', factoryId: 'factory-1', permissions: [] } };
            const error = new InternalServerErrorException('Unexpected error');

            mockAuthService.logout.mockRejectedValue(error);

            await expect(controller.logout(req.user)).rejects.toThrow(InternalServerErrorException);
            expect(authService.logout).toHaveBeenCalledWith('user-1');
        });

        it('should respect JwtAuthGuard for logout', async () => {
            const guards = Reflect.getMetadata('__guards__', controller.logout);

            expect(guards).toBeDefined();
            expect(guards).toContain(JwtAuthGuard);
        });
    });

    describe('forgotPassword', () => {
        it('should call forgotPassword and return result', async () => {
            const dto = { email: 'test@mail.com' };
            const mockResult = { message: 'Password reset email sent', success: true };

            mockAuthService.forgotPassword.mockResolvedValue(mockResult);

            const result = await controller.forgotPassword(dto);

            expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
            expect(result.data).toBe(mockResult);
        });
    });
});
