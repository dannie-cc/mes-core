import { z } from 'zod';

import { createApiResponseDto } from '@/common/helpers/api-response';
import { nameRegex, passwordRegex, resetCodeRegex, validateText } from '@/common/helpers/validations';
import { createStrictZodDto } from '@/common/helpers/zod-strict';
import { publicUserSelectSchema, userInsertSchema, userSettingsSelectSchema } from '@/models/zod-schemas';

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
        password: validateText({ regex: passwordRegex, min: 8, max: 50 }),
        sendMail: z.boolean().optional(),
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
    code: validateText({ regex: resetCodeRegex }),
});

const resetPasswordSchema = z.object({
    email: z.email('Please enter a valid email address').transform((s) => s?.trim()?.toLowerCase()),
    code: validateText({ regex: resetCodeRegex }),
    newPassword: validateText({ regex: passwordRegex, min: 8, max: 50 }),
});

const changePasswordSchema = z.object({
    oldPassword: validateText({ regex: passwordRegex }),
    newPassword: validateText({ regex: passwordRegex, min: 8, max: 50 }),
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
export class SignupDto extends createStrictZodDto(signupSchema) {}
export class LoginDto extends createStrictZodDto(loginSchema) {}
export class VerifyEmailDto extends createStrictZodDto(verifyEmailSchema) {}
export class ForgotPasswordDto extends createStrictZodDto(forgotPasswordSchema) {}
export class ValidateResetCodeDto extends createStrictZodDto(validateResetCodeSchema) {}
export class ResetPasswordDto extends createStrictZodDto(resetPasswordSchema) {}
export class ChangePasswordDto extends createStrictZodDto(changePasswordSchema) {}
export class ResendVerificationDto extends createStrictZodDto(resendVerificationSchema) {}

// API Response DTO's
export class LoginApiResponseDto extends createApiResponseDto(loginResponseSchema) {}
export class SignupApiResponseDto extends createApiResponseDto(signupResponseSchema) {}
export class MessageApiResponseDto extends createApiResponseDto(messageResponseSchema) {}
export class ValidateResetCodeApiResponseDto extends createApiResponseDto(validateResetCodeResponseSchema) {}
export class ResendStatusApiResponseDto extends createApiResponseDto(resendStatusResponseSchema) {}
export class LoginApiResponseWithSettingsDto extends createApiResponseDto(loginResponseWithSettingsSchema) {}
