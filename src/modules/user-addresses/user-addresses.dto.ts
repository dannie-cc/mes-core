import { createStrictZodDto } from '@/common/helpers/zod-strict';
import { z } from 'zod';
import { userAddressInsertSchema, userAddressUpdateSchema, userAddressSelectSchema } from '@/models/zod-schemas';
import { createApiPaginatedResponseDto, createApiResponseDto } from '@/common/helpers/api-response';
import { validateText, validatePostalCode, NAME_PATTERN } from '@/common/helpers/validations';
import { DEFAULT_CHAR_LENGTH } from '@/common/constants';

const nameRegex = { pattern: NAME_PATTERN, error: 'Value can only contain alphabets, spaces, apostrophes, or hyphens' };
const phoneNumberRegex = { pattern: /^\+?[0-9\s\-()]{7,20}$/, error: 'Phone number must be 7–20 digits and may include spaces, hyphens, parentheses, and may start with +' };
const countryCodeRegex = { pattern: /^[A-Z]{2}$/, error: 'Country code must be 2 uppercase letters' };

// Create/Update address schemas (omit auto-generated fields)
const createUserAddressSchema = userAddressInsertSchema
    .omit({
        id: true,
        userId: true, // Will be set from JWT context
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
    })
    .extend({
        countryCode: validateText({ regex: countryCodeRegex, min: 2, max: 2 }),
        label: z.string().min(1, 'Label is required').max(255, " Label can't exceed 255 characters"),
        fullName: validateText({ regex: nameRegex, min: 1, max: 100 }),
        phone: validateText({ regex: phoneNumberRegex, isOptional: true }),
        company: validateText({ regex: nameRegex, min: 2, max: 100 }),
        line1: validateText({ min: 1, max: DEFAULT_CHAR_LENGTH }),
        line2: validateText({ max: DEFAULT_CHAR_LENGTH, isOptional: true }),
        city: z.string().min(1, 'City is required').max(255, "City can't exceed 255 characters"),
        state: validateText({ regex: nameRegex, min: 1, max: 100, isOptional: true }),
        postalCode: z.string().trim().min(1, 'Postal code is required'),
    })
    .superRefine((data, ctx) => {
        if (!validatePostalCode(data.countryCode, data.postalCode)) {
            ctx.addIssue({
                code: 'custom',
                message: `Invalid postal code format for ${data.countryCode}`,
                path: ['postalCode'],
            });
        }
    });

const updateUserAddressSchema = userAddressUpdateSchema
    .omit({
        id: true,
        userId: true, // Cannot be changed
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
    })
    .extend({});

const updateDefaultAddressSchema = z.object({
    addressId: z.uuid(),
    userId: z.uuid(),
});

const listAddressQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
});

// Input DTO's
export class CreateUserAddressDto extends createStrictZodDto(createUserAddressSchema) { }
export class UpdateUserAddressDto extends createStrictZodDto(updateUserAddressSchema) { }
export class updateDefaultAddressDto extends createStrictZodDto(updateDefaultAddressSchema) { }

//Response DTO's
export class AddressResponseDto extends createStrictZodDto(userAddressSelectSchema) { }
export class ListAddressQueryDto extends createStrictZodDto(listAddressQuerySchema) { }

export class AddressApiResponseDto extends createApiResponseDto(userAddressSelectSchema) { }
export class AddressPaginatedApiResponseDto extends createApiPaginatedResponseDto(userAddressSelectSchema) { }
