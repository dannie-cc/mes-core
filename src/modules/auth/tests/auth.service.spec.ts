import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { MailService } from '@/app/services/mail/mail.service';
import { RedisService } from '@/app/services/redis/redis.service';

import { UsersService } from '../../users/users.service';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let usersService: UsersService;
    let _jwtService: JwtService;
    let redisService: RedisService;

    const mailService = {
        sendVerification: jest.fn().mockResolvedValue(undefined),
        sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };

    const usersServiceMock = {
        create: jest.fn(),
        findByEmail: jest.fn(),
        remove: jest.fn(),
        findByVerificationToken: jest.fn(),
        verify: jest.fn(),
        updateInternal: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
        getOrThrow: jest.fn().mockReturnValue({
            server: {
                url: 'https://localhost:4000',
            },
            jwt: {
                secret: 'test-jwt-secret',
                expiration: '1h',
            },
        }),
    };

    beforeEach(async () => {
        const mockJwtService = {
            sign: jest.fn().mockReturnValue('mock_token'),
        };

        const mockRedisService = {
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                { provide: RedisService, useValue: mockRedisService },
                { provide: 'CONFIGURATION(server)', useValue: { superAdmin: {} } },
                AuthService,
                { provide: UsersService, useValue: usersServiceMock },
                { provide: JwtService, useValue: mockJwtService },
                { provide: MailService, useValue: mailService },
                {
                    provide: CustomLoggerService,
                    useValue: {
                        log: jest.fn(),
                        error: jest.fn(),
                        debug: jest.fn(),
                        setContext: jest.fn(),
                    },
                },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();
        service = module.get<AuthService>(AuthService);
        usersService = module.get<UsersService>(UsersService);
        _jwtService = module.get<JwtService>(JwtService);
        redisService = module.get<RedisService>(RedisService);

        Object.values(usersServiceMock).forEach((fn) => fn.mockReset());
        Object.values(mailService).forEach((fn) => fn.mockReset());
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Signup', () => {
        it('should create a new user on signup', async () => {
            const signupDto = {
                email: 'test@example.com',
                password: 'password123',
                firstName: 'A',
                lastName: 'B',
                sendMail: false,
                acceptTerms: true,
                factoryName: 'Test Factory',
            };

            usersServiceMock.findByEmail.mockResolvedValue(null);

            usersServiceMock.create.mockResolvedValue({
                ...signupDto,
                id: '123',
                password: 'hashedPassword123',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                verificationToken: 'verificationToken123',
                isVerified: true,
                roleId: 'test-role-id',
                factoryId: 'factory-1',
            });

            const result = await service.signup(signupDto);

            expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(usersService.create).toHaveBeenCalled();

            // expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('email', 'test@example.com');
        });

        it('should call mailService.sendVerification if sendMail is true', async () => {
            const signupDto = {
                email: 'test@example.com',
                password: 'password123',
                firstName: 'John',
                lastName: 'Doe',
                sendMail: true,
                acceptTerms: true,
                factoryName: 'Test Factory',
            };

            const verificationToken = 'verificationToken123';

            usersServiceMock.findByEmail.mockResolvedValue(null);

            usersServiceMock.create.mockResolvedValue({
                ...signupDto,
                id: '123',
                password: 'hashedPassword123',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                verificationToken,
                isVerified: false,
                roleId: 'test-role-id',
                factoryId: 'factory-1',
            });

            await service.signup(signupDto);

            expect(mailService.sendVerification).toHaveBeenCalledWith({
                code: expect.any(String),
                email: signupDto.email,
                name: `${signupDto.firstName} ${signupDto.lastName}`,
            });
        });
        it('should return accessToken on successful signup', async () => {
            const signupDto = {
                email: 'success@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                sendMail: false,
                acceptTerms: true,
                factoryName: 'Test Factory',
            };

            usersServiceMock.findByEmail.mockResolvedValue(null);

            usersServiceMock.create.mockResolvedValue({
                ...signupDto,
                id: 'user-789',
                password: 'hashedPassword789',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                verificationToken: 'verificationToken789',
                isVerified: false,
                roleId: 'test-role-id',
                factoryId: 'factory-1',
            });

            const result = await service.signup(signupDto);

            // expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('accessToken');
            expect(typeof result.accessToken).toBe('string');
            expect(result).toHaveProperty('email', signupDto.email);
        });

        it('should write the token to Redis after successful signup', async () => {
            const signupDto = {
                email: 'test2@example.com',
                password: 'password123',
                firstName: 'Jane',
                lastName: 'Doe',
                sendMail: false,
                acceptTerms: true,
                factoryName: 'Test Factory',
            };

            usersServiceMock.findByEmail.mockResolvedValue(null);

            usersServiceMock.create.mockResolvedValue({
                ...signupDto,
                id: 'user-456',
                password: 'hashedPassword456',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                verificationToken: 'verificationToken456',
                isVerified: false,
                roleId: 'test-role-id',
                factoryId: 'factory-1',
            });

            const redisSetSpy = jest.spyOn(redisService, 'set');

            await service.signup(signupDto);

            expect(redisSetSpy).toHaveBeenCalledWith('token:user-456', expect.any(String), expect.any(Number));
        });
    });

    describe('verifyEmail', () => {
        it('should verify email successfully', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
                isVerified: false,
                verificationToken: 'valid-token',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                factoryId: 'factory-1',
            };

            usersServiceMock.findByVerificationToken.mockResolvedValue(mockUser);
            usersServiceMock.verify.mockResolvedValue(undefined);

            const result = await service.verifyEmail('valid-token');

            expect(usersServiceMock.findByVerificationToken).toHaveBeenCalledWith('valid-token');
            expect(usersServiceMock.verify).toHaveBeenCalledWith('user-123');
            expect(result).toEqual({ success: true, message: 'Email verified successfully' });
        });

        it('should throw an error if user is not found', async () => {
            usersServiceMock.findByVerificationToken.mockResolvedValue(null);

            await expect(service.verifyEmail('invalid-token')).rejects.toThrow('The verification link is invalid or has expired. Please request a new verification.');

            expect(usersServiceMock.findByVerificationToken).toHaveBeenCalledWith('invalid-token');
        });
    });

    describe('login', () => {
        it('should throw UnauthorizedException if credentials are invalid', async () => {
            jest.spyOn(service, 'validateUser').mockResolvedValue(null);

            await expect(service.login({ email: 'wrong@example.com', password: 'wrongpass' })).rejects.toThrow(
                "The email or password you entered is incorrect. Please check your credentials and try again, or sign up if you don't have an account yet.",
            );
        });

        it('should return accessToken on successful signup', async () => {
            const signupDto = {
                email: 'success@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
                sendMail: false,
                acceptTerms: true,
                factoryName: 'Test Factory',
            };

            usersServiceMock.findByEmail.mockResolvedValue(null);

            usersServiceMock.create.mockResolvedValue({
                ...signupDto,
                id: 'user-789',
                password: 'hashedPassword789',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                verificationToken: 'verificationToken789',
                isVerified: false,
                roleId: 'test-role-id',
                factoryId: 'factory-1',
            });

            const result = await service.signup(signupDto);

            // expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('accessToken');
            // expect(typeof result.data.accessToken).toBe('string');
            expect(result).toHaveProperty('email', signupDto.email);
        });

        it('should write the token to Redis after successful signup', async () => {
            const signupDto = {
                email: 'test2@example.com',
                password: 'password123',
                firstName: 'Jane',
                lastName: 'Doe',
                sendMail: false,
                acceptTerms: true,
                factoryName: 'Test Factory',
            };

            usersServiceMock.findByEmail.mockResolvedValue(null);

            usersServiceMock.create.mockResolvedValue({
                ...signupDto,
                id: 'user-456',
                password: 'hashedPassword456',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                verificationToken: 'verificationToken456',
                isVerified: false,
                roleId: 'test-role-id',
                factoryId: 'factory-1',
            });

            const redisSetSpy = jest.spyOn(redisService, 'set');

            await service.signup(signupDto);

            expect(redisSetSpy).toHaveBeenCalledWith('token:user-456', expect.any(String), expect.any(Number));
        });
    });

    describe('logout', () => {
        it('should delete the token from Redis', async () => {
            const userId = 'user-123';
            const redisDelSpy = jest.spyOn(redisService, 'del').mockResolvedValue(1);

            await service.logout(userId);

            expect(redisDelSpy).toHaveBeenCalledWith(`token:${userId}`);
        });

        it('should return success message', async () => {
            const userId = 'user-123';
            jest.spyOn(redisService, 'del').mockResolvedValue(1);

            const result = await service.logout(userId);

            expect(result).toEqual({ message: 'Logged out successfully' });
        });
    });

    describe('forgotPassword', () => {
        it('should send a reset password email when user exists', async () => {
            const email = 'test@mail.com';
            const forgotPasswordDto = { email };
            const mockUser = {
                id: 'user-123',
                email: 'test@mail.com',
                firstName: 'John',
                lastName: 'Doe',
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                verificationToken: 'token',
                isVerified: true,
                roleId: 'test-role-id',
                factoryId: 'factory-1',
            };

            const mockMailService = {
                sendPasswordReset: jest.fn().mockResolvedValue(undefined),
            };

            // mailService mock
            Object.assign(mailService, mockMailService);

            usersServiceMock.findByEmail.mockResolvedValue(mockUser);
            const redisSetSpy = jest.spyOn(redisService, 'set').mockResolvedValue('OK');

            const result = await service.forgotPassword(forgotPasswordDto);

            expect(usersService.findByEmail).toHaveBeenCalledWith(email);
            expect(redisSetSpy).toHaveBeenCalledWith(
                'otp:user-123',
                expect.any(String),
                600, // Updated timeout to match RESET_TOKEN_EXPIRY
            );
            expect(mailService.sendPasswordReset).toHaveBeenCalledWith({
                email: mockUser.email,
                name: 'John Doe',
                resetUrl: expect.stringContaining('reset-password?email='),
                resetToken: expect.any(String),
            });
            expect(result).toEqual({
                success: true,
                message: 'If an account with this email exists, you will receive password reset instructions.',
                data: { message: 'Reset email sent successfully' },
            });
        });

        it('should return success message when user does not exist', async () => {
            const email = 'nonexistent@mail.com';
            const forgotPasswordDto = { email };

            usersServiceMock.findByEmail.mockResolvedValue(null);

            const result = await service.forgotPassword(forgotPasswordDto);

            expect(usersService.findByEmail).toHaveBeenCalledWith(email);
            expect(redisService.set).not.toHaveBeenCalled();
            expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                message: 'If an account with this email exists, you will receive password reset instructions.',
                data: { message: 'Reset email sent successfully' },
            });
        });
    });

    describe('changePassword', () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            password: '$2b$10$hashedCurrentPassword',
            firstName: 'John',
            lastName: 'Doe',
            factoryId: 'factory-1',
        };

        const changePasswordDto = {
            oldPassword: 'currentPassword',
            newPassword: 'newPassword123!',
        };

        beforeEach(() => {
            usersServiceMock.findByEmail.mockResolvedValue(mockUser);
            usersServiceMock.updateInternal.mockResolvedValue(mockUser);
        });

        it('should change password successfully', async () => {
            // Mock bcrypt.compare to return true for current password
            const { compare: bcryptCompare } = await import('bcrypt');
            const compareHolder: { compare: (data: string, encrypted: string) => Promise<boolean> } = { compare: bcryptCompare };
            const bcryptCompareSpy = jest.spyOn(compareHolder, 'compare');
            // First call: current password check -> true, Second call: new password equality check -> false
            bcryptCompareSpy.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

            // Mock bcrypt.hash
            const { hash: bcryptHash } = await import('bcrypt');
            const hashHolder: { hash: (data: string, saltOrRounds: number) => Promise<string> } = { hash: bcryptHash };
            const bcryptHashSpy = jest.spyOn(hashHolder, 'hash');
            bcryptHashSpy.mockResolvedValue('$2b$10$hashedNewPassword');

            const result = await service.changePassword('user-123', 'test@example.com', changePasswordDto);

            expect(usersServiceMock.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcryptCompareSpy).toHaveBeenCalledWith('currentPassword', '$2b$10$hashedCurrentPassword');
            expect(bcryptCompareSpy).toHaveBeenCalledWith('newPassword123!', '$2b$10$hashedCurrentPassword');
            expect(bcryptHashSpy).toHaveBeenCalledWith('newPassword123!', 10);
            expect(usersServiceMock.updateInternal).toHaveBeenCalledWith('user-123', {
                password: '$2b$10$hashedNewPassword',
            });
            expect(redisService.del).toHaveBeenCalledWith('token:user-123');
            expect(result).toEqual({
                success: true,
                message: 'Password changed successfully. Please log in again with your new password.',
                data: { message: 'Your password has been changed successfully' },
            });

            bcryptCompareSpy.mockRestore();
            bcryptHashSpy.mockRestore();
        });

        it('should throw error if password confirmation does not match', async () => {
            const invalidDto = changePasswordDto;

            await expect(service.changePassword('user-123', 'test@example.com', invalidDto)).rejects.toThrow('New password and confirmation password do not match.');
        });

        it('should throw error if user not found', async () => {
            usersServiceMock.findByEmail.mockResolvedValue(null);

            await expect(service.changePassword('user-123', 'test@example.com', changePasswordDto)).rejects.toThrow('User not found.');
        });

        it('should throw error if current password is incorrect', async () => {
            const { compare: bcryptCompare2 } = await import('bcrypt');
            const compareHolder2: { compare: (data: string, encrypted: string) => Promise<boolean> } = { compare: bcryptCompare2 };
            const bcryptCompareSpy = jest.spyOn(compareHolder2, 'compare');
            bcryptCompareSpy.mockResolvedValue(false);

            await expect(service.changePassword('user-123', 'test@example.com', changePasswordDto)).rejects.toThrow('Current password is incorrect.');

            bcryptCompareSpy.mockRestore();
        });

        it('should throw error if new password is same as current password', async () => {
            const { compare: bcryptCompare3 } = await import('bcrypt');
            const compareHolder3: { compare: (data: string, encrypted: string) => Promise<boolean> } = { compare: bcryptCompare3 };
            const bcryptCompareSpy = jest.spyOn(compareHolder3, 'compare');
            bcryptCompareSpy.mockResolvedValue(true);

            await expect(service.changePassword('user-123', 'test@example.com', changePasswordDto)).rejects.toThrow('New password must be different from your current password.');

            bcryptCompareSpy.mockRestore();
        });
    });
});
