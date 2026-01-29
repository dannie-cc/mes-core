import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    NotImplementedException,
    PreconditionFailedException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { SignupDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, ValidateResetCodeDto } from './auth.dto';

import { UsersService } from '../users/users.service';
import { RedisService } from '@/app/services/redis/redis.service';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { MailService } from '@/app/services/mail/mail.service';

import { type UserSelectOutput } from '@/models/zod-schemas';
import { EXPIRE_TIMESTAMP, RESET_TOKEN_EXPIRY, OTP_LENGTH, VERIFICATION_MAX_ATTEMPT_LIMIT, VERIFICATION_MAX_ATTEMPT_LIMIT_EXPIRY } from '@/common/constants';

import { RandomStringGenerator } from '@/utils/random';
import { RolesService } from '../roles/roles.service';
import * as Schema from '@/models/schema';
import { DrizzleService } from '@/models/model.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly mailService: MailService,
        private readonly jwtService: JwtService,
        private readonly redisService: RedisService,
        private readonly logger: CustomLoggerService,
        private readonly rolesService: RolesService,
        private readonly drizzle: DrizzleService,
    ) {
        this.logger.setContext(AuthService.name);
        this.db = this.drizzle.database;
    }

    private db;

    async artificialDelay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * ms));
    }

    private async setToken(userId: string, email: string, roleId: string, factoryId: string) {
        const payload = {
            email,
            sub: userId,
            roleId,
            factoryId,
            iat: Math.floor(Date.now() / 1000),
        };
        const token = this.jwtService.sign(payload);
        await this.redisService.set(`token:${userId}`, token, EXPIRE_TIMESTAMP);
        return token;
    }

    async signup(signupDto: SignupDto) {
        let user: UserSelectOutput | null = null;
        let token: string | null = null;

        try {
            const hashedPassword = await bcrypt.hash(signupDto.password!, 10);
            const verificationToken = RandomStringGenerator.generateSecure(OTP_LENGTH, 'numeric');

            const existingUser = await this.usersService.findByEmail(signupDto.email);

            if (existingUser) {
                if (existingUser.isVerified) {
                    // For security, don't reveal that account exists and is verified
                    this.logger.warn('Signup attempt for existing verified email', { email: signupDto.email });
                    return {
                        email: signupDto.email,
                        message: 'If this email is not already registered, you will receive verification instructions.',
                    };
                }

                if (signupDto.sendMail) {
                    if (!existingUser.verificationToken) {
                        const newToken = verificationToken;
                        await this.usersService.updateInternal(existingUser.id, { verificationToken: newToken });

                        const emailData = {
                            code: newToken,
                            email: signupDto.email,
                            name: `${signupDto.firstName} ${signupDto.lastName}`,
                        };
                        await this.mailService.sendVerification(emailData);
                    }
                }

                return {
                    email: signupDto.email,
                    message: 'If this email is not already registered, you will receive verification instructions.',
                };
            }

            const defaultRole = await this.rolesService.getDefault();

            const { userRecord, factoryRecord } = await this.db.transaction(async (tx) => {
                const [f] = await tx.insert(Schema.factory).values({
                    name: signupDto.factoryName,
                }).returning();

                const u = await this.usersService.create({
                    ...signupDto,
                    password: hashedPassword,
                    verificationToken,
                    isVerified: false,
                    roleId: defaultRole.id,
                    factoryId: f.id,
                });

                return { userRecord: u, factoryRecord: f };
            });

            user = userRecord;

            this.logger.log('User registration initiated', { email: signupDto.email, factoryId: factoryRecord.id });

            if (signupDto.sendMail) {
                const emailData = {
                    code: verificationToken,
                    email: signupDto.email,
                    name: `${signupDto.firstName} ${signupDto.lastName}`,
                };
                await this.mailService.sendVerification(emailData);
            }

            token = await this.setToken(user.id, signupDto.email, user.roleId, user.factoryId!);

            // Here you would typically send a verification email
            return { accessToken: token, email: signupDto.email, message: 'Registration successful. Please verify your email.' };
        } catch (error) {
            this.logger.error('Unexpected error on user signup:', error);

            if (user) {
                try {
                    await this.usersService.remove(user.id);
                } catch (cleanupError) {
                    this.logger.error('Failed to cleanup user after signup error:', cleanupError);
                }
            }
            if (token && user) {
                try {
                    await this.redisService.del(`token:${user.id}`);
                } catch (cleanupError) {
                    this.logger.error('Failed to cleanup token after signup error:', cleanupError);
                }
            }

            if (error instanceof BadRequestException || error instanceof PreconditionFailedException) {
                throw error;
            }

            // Handle ConflictException (e.g., from unique constraint violations in user creation)
            if (error instanceof ConflictException) {
                this.logger.warn('ConflictException during signup (likely duplicate email)', { email: signupDto.email, error: error.message });
                // Return consistent message to prevent user enumeration
                return {
                    email: signupDto.email,
                    message: 'If this email is not already registered, you will receive verification instructions.',
                };
            }

            // Handle database constraint violations (duplicate email)
            if (error && typeof error === 'object' && 'code' in error) {
                if (error.code === '23505') {
                    this.logger.warn('Email already registered during signup', { email: signupDto.email, error: error.message });
                    // Return consistent message to prevent user enumeration
                    return {
                        email: signupDto.email,
                        message: 'If this email is not already registered, you will receive verification instructions.',
                    };
                }
            }

            this.logger.error('Returning generic message due to unexpected signup error', {
                error: error.message,
                stack: error.stack,
                email: signupDto.email,
            });
            return {
                email: signupDto.email,
                message: 'If this email is not already registered, you will receive verification instructions.',
            };
        }
    }

    async verifyEmail(token: string) {
        const user = await this.usersService.findByVerificationToken(token);
        if (!user) {
            throw new BadRequestException('The verification link is invalid or has expired. Please request a new verification.');
        }

        await this.usersService.verify(user.id);
        return { message: 'Email verified successfully' };
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);

        // Security: Always use the same generic message to prevent user enumeration
        const genericErrorMessage =
            'The email or password you entered is incorrect. Please check your credentials and try again. If you recently signed up, please also check your email for a verification link.';

        if (!user) {
            // Add artificial delay to prevent timing attacks
            await this.artificialDelay(200);
            throw new UnauthorizedException(genericErrorMessage);
        }

        if (!user.isVerified) {
            const verificationToken = RandomStringGenerator.generateSecure(OTP_LENGTH, 'numeric');
            await this.usersService.updateVerificationToken(user.id, verificationToken);

            const emailData = {
                code: verificationToken,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
            };
            await this.mailService.sendVerification(emailData);

            // Use the same generic message - no distinction for security
            throw new UnauthorizedException(genericErrorMessage);
        }
        let userSettings = null;
        if (user.id) {
            userSettings = await this.usersService.getUserSettings(user.id);
        }

        try {
            const accessToken = await this.setToken(user.id, user.email, user.roleId, user.factoryId!);

            // Return public user data (excluding sensitive fields)
            const { verificationToken: _, deletedAt: __, ...userData } = user;
            return { accessToken, user: userData, settings: userSettings };
        } catch (error) {
            this.logger.error('Failed to generate authentication token', error);
            throw new UnauthorizedException('Something went wrong while logging you in. Please try again in a moment.');
        }
    }

    async logout(userId: string) {
        await this.redisService.del(`token:${userId}`);
        this.logger.log('User logged out successfully', { userId });
        return { message: 'Logged out successfully' };
    }

    async changePassword(userId: string, email: string, changePasswordDto: ChangePasswordDto) {
        const { oldPassword, newPassword, confirmPassword } = changePasswordDto;

        if (newPassword !== confirmPassword) {
            throw new BadRequestException('New password and confirmation password do not match.');
        }

        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('User not found.');
        }

        const isCurrentPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isCurrentPasswordValid) {
            // Add artificial delay to prevent timing attacks
            await this.artificialDelay(200);
            throw new UnauthorizedException('Current password is incorrect.');
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new BadRequestException('New password must be different from your current password.');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await this.usersService.updateInternal(userId, { password: hashedNewPassword });

        this.logger.log('Password changed successfully', { userId, email });

        await this.redisService.del(`token:${userId}`);

        return {
            success: true,
            message: 'Password changed successfully. Please log in again with your new password.',
            data: { message: 'Your password has been changed successfully' },
        };
    }

    async validateUser(email: string, password: string) {
        try {
            const user = await this.usersService.findByEmail(email);
            if (!user) return null;

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) return null;

            const { password: _, ...result } = user;
            return result;
        } catch (error) {
            this.logger.error('Failed to validate user', error);
            return null;
        }
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const { email } = forgotPasswordDto;

        try {
            const user = await this.usersService.findByEmail(email);

            // Always return the same message regardless of user existence
            if (!user) {
                this.logger.warn('Password reset requested for non-existent email', { email });
                return {
                    success: true,
                    message: 'If an account with this email exists, you will receive password reset instructions.',
                    data: { message: 'Reset email sent successfully' },
                };
            }

            const resetToken = RandomStringGenerator.generateSecure(OTP_LENGTH, 'numeric');
            await this.redisService.del(`otp:${user.id}`);
            const resetTokenKey = `otp:${user.id}`;

            await this.redisService.set(resetTokenKey, resetToken, RESET_TOKEN_EXPIRY);

            const clientProtocol = process.env.CLIENT_PROTOCOL as string;
            const clientHost = process.env.CLIENT_HOST as string;
            const clientUrl = `${clientProtocol}://${clientHost}`;

            const resetUrl = `${clientUrl}/reset-password?email=${email}&code=${resetToken}`;

            const emailData = {
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                resetUrl,
                resetToken,
            };

            await this.mailService.sendPasswordReset(emailData);

            this.logger.log('Password reset email sent', { email });

            return {
                // success: true,
                message: 'If an account with this email exists, you will receive password reset instructions.',
                // data: { message: 'Reset email sent successfully' },
            };
        } catch (error) {
            this.logger.error('Password reset error:', {
                error: error.message,
                email,
                stack: error.stack,
            });
            // Return same message even on error to prevent enumeration
            return {
                success: true,
                message: 'If an account with this email exists, you will receive password reset instructions.',
                data: { message: 'Reset email sent successfully' },
            };
        }
    }

    async validateResetCode(validateResetCodeDto: ValidateResetCodeDto): Promise<{ success: boolean; message: string; data: { valid: boolean } }> {
        const { email, code } = validateResetCodeDto;

        try {
            const user = await this.usersService.findByEmail(email);
            if (!user) {
                return {
                    success: false,
                    message: 'The reset code is invalid or expired.',
                    data: { valid: false },
                };
            }

            const otpKey = `otp:${user.id}`;
            const storedCode = await this.redisService.get(otpKey);

            if (!storedCode || !this.constantTimeStringCompare(storedCode, code!)) {
                return {
                    success: false,
                    message: 'The reset code is invalid or expired.',
                    data: { valid: false },
                };
            }

            return {
                success: true,
                message: 'Reset code is valid',
                data: { valid: true },
            };
        } catch (error) {
            this.logger.error('Reset code validation error:', {
                error: error.message,
                email,
                stack: error.stack,
            });

            return {
                success: false,
                message: 'The reset code is invalid or expired.',
                data: { valid: false },
            };
        }
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const user = await this.usersService.findByEmail(resetPasswordDto.email);
        if (!user) {
            throw new NotFoundException('User with the given email does not exist.');
        }

        if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
            throw new BadRequestException('New password and confirm password do not match.');
        }
        const verifyUserAndOtp = await this.verifyOTP(resetPasswordDto.code, resetPasswordDto.email, 'forgot-password');

        if (!verifyUserAndOtp) {
            throw new BadRequestException('The reset code is invalid or expired.');
        }

        const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
        await this.usersService.updateInternal(user.id, { password: hashedPassword });

        this.logger.log('Password reset successfully', { userId: user.id, email: user.email });

        // Invalidate all existing tokens for this user
        await this.redisService.del(`token:${user.id}`);
        await this.redisService.del(`otp:${user.id}`);

        return {
            message: 'Password has been reset successfully',
        };
    }

    async verifyOTP(otp: string, email: string, type: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('The reset code is invalid or expired.');
        }

        if (!otp) {
            throw new BadRequestException('Reset code is required.');
        }

        if (type === 'forgot-password' && otp) {
            const otpKey = `otp:${user.id}`;
            const storedCode = await this.redisService.get(otpKey);
            // Constant-time comparison to prevent timing attacks
            if (!storedCode || !this.constantTimeStringCompare(storedCode, otp)) {
                throw new BadRequestException('The reset code is invalid or expired.');
            }
            return true;
        } else {
            throw new NotImplementedException('This verification method is not supported.');
        }
    }

    async checkEmailExist(email: string) {
        const user = await this.usersService.findByEmail(email);
        return { exists: !!user };
    }
    private constantTimeStringCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        try {
            return crypto.timingSafeEqual(Buffer.from(a.padEnd(10)), Buffer.from(b.padEnd(10)));
        } catch {
            return false;
        }
    }

    async resendVerificationEmail(email: string): Promise<{ message: string; data: any }> {
        try {
            const rateLimitKey = `resend_verification:${email}`;
            const currentAttempts = await this.redisService.get(rateLimitKey);
            const attemptCount = currentAttempts ? parseInt(currentAttempts, 10) : 0;

            const getAttemptData = (attempts: number) => ({
                attempts,
                maxAttempts: VERIFICATION_MAX_ATTEMPT_LIMIT,
                remaining: Math.max(0, VERIFICATION_MAX_ATTEMPT_LIMIT - attempts),
            });

            if (attemptCount >= VERIFICATION_MAX_ATTEMPT_LIMIT) {
                this.logger.warn('Resend verification rate limit exceeded', { email, attempts: attemptCount });
                return {
                    message: 'Too many verification emails sent. Please wait before requesting another one.',
                    data: getAttemptData(attemptCount),
                };
            }

            const user = await this.usersService.findByEmail(email);

            if (!user) {
                // For security, return success even if user doesn't exist
                // But still increment the counter to prevent enumeration
                const newAttempts = await this.incrementResendAttempts(rateLimitKey, VERIFICATION_MAX_ATTEMPT_LIMIT_EXPIRY);
                return {
                    message: 'If an account with this email exists and is not verified, a verification email will be sent.',
                    data: getAttemptData(newAttempts),
                };
            }

            if (user.isVerified) {
                // For security, don't reveal that the account exists and is verified
                // Instead, use the same message and still increment attempts to prevent enumeration
                const newAttempts = await this.incrementResendAttempts(rateLimitKey, VERIFICATION_MAX_ATTEMPT_LIMIT_EXPIRY);
                return {
                    message: 'If an account with this email exists and is not verified, a verification email will be sent.',
                    data: getAttemptData(newAttempts),
                };
            }

            let verificationToken = user.verificationToken;
            if (!verificationToken) {
                verificationToken = RandomStringGenerator.generateSecure(OTP_LENGTH, 'numeric');
                await this.usersService.updateInternal(user.id, { verificationToken });
            }

            const emailData = {
                code: verificationToken,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
            };
            await this.mailService.sendVerification(emailData);

            const newAttempts = await this.incrementResendAttempts(rateLimitKey, VERIFICATION_MAX_ATTEMPT_LIMIT_EXPIRY);

            this.logger.log('Verification email resent', { email, userId: user.id });

            return {
                message: 'Verification email sent successfully. Please check your inbox.',
                data: getAttemptData(newAttempts),
            };
        } catch (error) {
            this.logger.error('Failed to resend verification email:', {
                error: error.message,
                email,
                stack: error.stack,
            });

            // Try to get current attempts safely
            let attemptCount = 0;
            try {
                const currentAttempts = await this.redisService.get(`resend_verification:${email}`);
                attemptCount = currentAttempts ? parseInt(currentAttempts, 10) : 0;
            } catch (redisError) {
                this.logger.warn('Failed to get attempt count from Redis', { email, error: redisError.message });
            }

            return {
                message: 'If an account with this email exists and is not verified, a verification email will be sent.',
                data: {
                    attempts: attemptCount,
                    maxAttempts: VERIFICATION_MAX_ATTEMPT_LIMIT,
                    remaining: Math.max(0, VERIFICATION_MAX_ATTEMPT_LIMIT - attemptCount),
                },
            };
        }
    }

    async getResendVerificationStatus(email: string): Promise<{ attempts: number; maxAttempts: number; remaining: number }> {
        try {
            const rateLimitKey = `resend_verification:${email}`;
            const currentAttempts = await this.redisService.get(rateLimitKey);
            const attemptCount = currentAttempts ? parseInt(currentAttempts, 10) : 0;

            return {
                attempts: attemptCount,
                maxAttempts: VERIFICATION_MAX_ATTEMPT_LIMIT,
                remaining: Math.max(0, VERIFICATION_MAX_ATTEMPT_LIMIT - attemptCount),
            };
        } catch (error) {
            this.logger.error('Failed to get resend verification status:', {
                error: error.message,
                email,
                stack: error.stack,
            });

            return {
                attempts: 0,
                maxAttempts: VERIFICATION_MAX_ATTEMPT_LIMIT,
                remaining: VERIFICATION_MAX_ATTEMPT_LIMIT,
            };
        }
    }

    private async incrementResendAttempts(rateLimitKey: string, windowDuration: number): Promise<number> {
        try {
            const current = await this.redisService.incr(rateLimitKey);
            if (current === 1) {
                await this.redisService.expire(rateLimitKey, windowDuration);
            }
            return current;
        } catch (error) {
            this.logger.error('Failed to increment resend attempts counter:', error);
            return 0;
        }
    }
}
