import { createStrictZodDto } from '@/common/helpers/zod-strict';
import { z } from 'zod';
import { createApiPaginatedResponseSchema, createApiResponseSchema } from '@/common/helpers/api-response';
import {
    userUpdateSchema,
    userSelectSchema,
    publicUserSelectSchema,
    type UserInsertInput,
    type UserUpdateInput,
    type UserSelectOutput,
    type PublicUserOutput,
} from '@/models/zod-schemas';
import { NAME_PATTERN, validateText } from '@/common/helpers/validations';

const resetcodeRegex = { pattern: /^[0-9]{6}$/, error: 'Reset code must be 6 numeric characters' };
const passwordRegex = { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
const phoneNumberRegex = { pattern: /^\+?[0-9\s\-()]{7,20}$/, error: 'Phone number must be 7–20 digits and may include spaces, hyphens, parentheses, and may start with +' };
const nameRegex = { pattern: NAME_PATTERN, error: 'name can only contain alphabets, spaces, apostrophes, or hyphens' };
// Base schemas for user operations
const loginSchema = z.object({
    email: z.email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

const updateUserProfileSchema = userUpdateSchema
    .omit({
        id: true,
        password: true,
        isVerified: true,
        verificationToken: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        roleId: true,
    })
    .extend({
        firstName: validateText({ regex: nameRegex }),
        lastName: validateText({ regex: nameRegex }),
        phone: validateText({ regex: phoneNumberRegex, isOptional: true }),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
        message: 'Request body cannot be empty',
        path: [],
    });

const verifyEmailSchema = z.object({
    code: z.string().min(1, 'Verification code is required'),
    email: z.email('Please enter a valid email address'),
});

const forgotPasswordSchema = z.object({
    email: z.email('Please enter a valid email address'),
});

const resetPasswordSchema = z
    .object({
        email: z.email('Please enter a valid email address'),
        code: validateText({ regex: resetcodeRegex, min: 6, max: 6 }),
        password: validateText({ regex: passwordRegex, min: 8, max: 15 }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        password: validateText({ regex: passwordRegex, min: 8, max: 15 }),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

const resendVerificationSchema = z.object({
    email: z.email('Please enter a valid email address'),
});

// Response schemas (using drizzle schemas with timestamp overrides)
const userResponseSchema = publicUserSelectSchema;

const fullUserResponseSchema = userSelectSchema;

// DTO Classes
export class LoginDto extends createStrictZodDto(loginSchema) {}
export class UpdateUserProfileDto extends createStrictZodDto(updateUserProfileSchema) {}
export class VerifyEmailDto extends createStrictZodDto(verifyEmailSchema) {}
export class ForgotPasswordDto extends createStrictZodDto(forgotPasswordSchema) {}
export class ResetPasswordDto extends createStrictZodDto(resetPasswordSchema) {}
export class ChangePasswordDto extends createStrictZodDto(changePasswordSchema) {}
export class ResendVerificationDto extends createStrictZodDto(resendVerificationSchema) {}

// API response wrappers matching ResponseInterceptor
const userApiResponseSchema = createApiResponseSchema(userResponseSchema);
const fullUserApiResponseSchema = createApiResponseSchema(fullUserResponseSchema);
const userPaginatedApiResponseSchema = createApiPaginatedResponseSchema(userResponseSchema);

// Response DTOs should NOT be strict-transformed; use original createZodDto behavior via wrapper
export class UserApiResponseDto extends createStrictZodDto(userApiResponseSchema) {}
export class FullUserApiResponseDto extends createStrictZodDto(fullUserApiResponseSchema) {}
export class UserPaginatedApiResponseDto extends createStrictZodDto(userPaginatedApiResponseSchema) {}

// Re-export from zod-schemas for service layer
export type { UserInsertInput, UserUpdateInput, UserSelectOutput, PublicUserOutput };
