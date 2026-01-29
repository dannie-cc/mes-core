import { createStrictZodDto } from '@/common/helpers/zod-strict';
import { z } from 'zod';
import { userInsertSchema, publicUserSelectSchema, userSettingsSelectSchema } from '@/models/zod-schemas';
import { createApiResponseDto } from '@/common/helpers/api-response';
import { NAME_PATTERN, validateText } from '@/common/helpers/validations';

const passwordRegex = { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
const resetcodeRegex = { pattern: /^[0-9]{6}$/, error: 'Reset code must be 6 numeric characters' };
const nameRegex = { pattern: NAME_PATTERN, error: 'name can only contain alphabets, spaces, apostrophes, or hyphens' };

//Input Schemas
const signupSchema = userInsertSchema
    .omit({
        id: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        verificationToken: true,
        isVerified: true,
        roleId: true,
    })
    .extend({
        firstName: validateText({ regex: nameRegex }),
        lastName: validateText({ regex: nameRegex }),
        factoryName: validateText({ min: 2, max: 100 }),
        password: validateText({
            regex: passwordRegex,
            min: 8,
            max: 50,
        }),
        confirmPassword: z.string(),
        sendMail: z.boolean().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const loginSchema = z.object({
    email: z.email('Please enter a valid email address').transform((s) => s?.trim()?.toLowerCase()),
    password: z.string().min(1, 'Password is required'),
});

const verifyEmailSchema = z.object({
    code: z
        .string()
        .min(1, 'Verification code is required')
        .transform((s) => s?.trim()),
    email: z.email('Please enter a valid email address').transform((s) => s?.trim()?.toLowerCase()),
});

const forgotPasswordSchema = z.object({
    email: z.email('Please enter a valid email address').transform((s) => s?.trim()?.toLowerCase()),
});

const validateResetCodeSchema = z.object({
    email: z.email('Please enter a valid email address').transform((s) => s?.trim()?.toLowerCase()),
    code: validateText({ regex: resetcodeRegex, min: 6, max: 6 }),
});

const resetPasswordSchema = z
    .object({
        email: z.email('Please enter a valid email address').transform((s) => s?.trim()?.toLowerCase()),
        code: z.string().regex(/^[0-9]{6}$/, 'Reset code must be 6 numeric characters'),
        newPassword: validateText({
            regex: passwordRegex,
            min: 8,
            max: 50,
        }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const changePasswordSchema = z
    .object({
        oldPassword: z.string().min(1, 'Current password is required'),
        newPassword: validateText({ regex: passwordRegex, min: 8, max: 50 }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const resendVerificationSchema = z.object({
    email: z.email('Please enter a valid email address').transform((s) => s?.trim()?.toLowerCase()),
});

// Output Schemas
const loginResponseSchema = z.object({
    accessToken: z.string(),
    user: publicUserSelectSchema,
    settings: userSettingsSelectSchema,
});

const loginResponseWithSettingsSchema = loginResponseSchema.extend({
    settings: userSettingsSelectSchema,
});

const signupResponseSchema = z.object({
    accessToken: z.string().optional(),
    email: z.email(),
});

const messageResponseSchema = z.object({
    message: z.string(),
});

const validateResetCodeResponseSchema = z.object({
    valid: z.boolean(),
});

const resendStatusResponseSchema = z.object({
    attempts: z.number(),
    maxAttempts: z.number(),
    remaining: z.number(),
});

// Input DTO's
export class SignupDto extends createStrictZodDto(signupSchema) { }
export class LoginDto extends createStrictZodDto(loginSchema) { }
export class VerifyEmailDto extends createStrictZodDto(verifyEmailSchema) { }
export class ForgotPasswordDto extends createStrictZodDto(forgotPasswordSchema) { }
export class ValidateResetCodeDto extends createStrictZodDto(validateResetCodeSchema) { }
export class ResetPasswordDto extends createStrictZodDto(resetPasswordSchema) { }
export class ChangePasswordDto extends createStrictZodDto(changePasswordSchema) { }
export class ResendVerificationDto extends createStrictZodDto(resendVerificationSchema) { }

// API Response DTO's
export class LoginApiResponseDto extends createApiResponseDto(loginResponseSchema) { }
export class SignupApiResponseDto extends createApiResponseDto(signupResponseSchema) { }
export class MessageApiResponseDto extends createApiResponseDto(messageResponseSchema) { }
export class ValidateResetCodeApiResponseDto extends createApiResponseDto(validateResetCodeResponseSchema) { }
export class ResendStatusApiResponseDto extends createApiResponseDto(resendStatusResponseSchema) { }
export class LoginApiResponseWithSettingsDto extends createApiResponseDto(loginResponseWithSettingsSchema) { }
