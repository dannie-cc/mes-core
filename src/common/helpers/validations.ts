import { z } from 'zod';

const GENERIC_PATTERN = /^[A-Za-z0-9\s-]+$/;
export const NAME_PATTERN = /^[\p{Script=Latin}\p{M}\p{Pd}\p{Zs}'’.·.]+$/u;

const DANGEROUS_PATTERNS = [
    /<script[^>]*>/i,
    /<\/script>/i,
    /javascript:/i,
    /vbscript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /onmouseover\s*=/i,
    /onmouseout\s*=/i,
    /onfocus\s*=/i,
    /onblur\s*=/i,
    /onchange\s*=/i,
    /onsubmit\s*=/i,
    /data:text\/html/i,
    /eval\s*\(/i,
    /alert\s*\(/i,
    /confirm\s*\(/i,
    /prompt\s*\(/i,
    /document\./i,
    /window\./i,
    /location\./i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /<applet/i,
    /<meta/i,
    /<link/i,
    /<style/i,
] as const;

export function detectScriptInjection(text: string): boolean {
    if (!text) return false;

    const normalizedText = text.toLowerCase();
    return DANGEROUS_PATTERNS.some((pattern) => pattern.test(normalizedText));
}

export function validatePostalCode(_countryCode: string, postalCode: string): boolean {
    const value = postalCode.trim();
    return GENERIC_PATTERN.test(value);
}

// 1) Base builder for the "core" string without preprocess
function buildBaseString(params: { regex?: { pattern: RegExp; error: string }; min?: number; max?: number }) {
    const { regex, min, max } = params;
    let base = z.string();
    if (min !== undefined) base = base.min(min, `Min ${min} characters should be needed`);
    if (max !== undefined) base = base.max(max, `Maximum ${max} characters allowed`);
    if (regex) base = base.regex(regex.pattern, regex.error);
    return base.refine((val) => !detectScriptInjection(val), {
        message: 'Invalid input: potential script injection detected',
    });
}

// 2) Strongly typed helpers

export function requiredText(params: { regex?: { pattern: RegExp; error: string }; min?: number; max?: number }): z.ZodString {
    const base = buildBaseString(params);
    // preprocess returns a pipeline, but the OUTER type is still string at runtime.
    // For TS typing, cast to ZodString; this is safe for consumers.
    const piped = z.preprocess((val) => {
        if (typeof val === 'string') return val.trim();
        if (val === null || val === undefined) return '';
        return String(val);
    }, base) as unknown as z.ZodString;
    return piped;
}

export function optionalText(params: { regex?: { pattern: RegExp; error: string }; min?: number; max?: number }): z.ZodOptional<z.ZodString> {
    const base = buildBaseString(params);
    const piped = z.preprocess((val) => {
        if (val === null || val === undefined) return undefined;
        const s = typeof val === 'string' ? val : String(val);
        const t = s.trim();
        return t === '' ? undefined : t;
    }, base.optional()) as unknown as z.ZodOptional<z.ZodString>;
    return piped;
}

// 3) Keep validateText API for existing callers, but with precise types

export function validateText(params: { regex?: { pattern: RegExp; error: string }; min?: number; max?: number; isOptional: true }): z.ZodOptional<z.ZodString>;
export function validateText(params: { regex?: { pattern: RegExp; error: string }; min?: number; max?: number; isOptional?: false }): z.ZodString;
export function validateText(params: { regex?: { pattern: RegExp; error: string }; min?: number; max?: number; isOptional?: boolean }): z.ZodString | z.ZodOptional<z.ZodString> {
    const { isOptional, ...rest } = params;
    return isOptional ? optionalText(rest) : requiredText(rest);
}

export const resetCodeRegex = { pattern: /^[0-9]{6}$/, error: 'Reset code must be 6 numeric characters' };
export const passwordRegex = { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
export const phoneNumberRegex = { pattern: /^\+?[0-9\s\-()]{7,20}$/, error: 'Phone number must be 7–20 digits and may include spaces, hyphens, parentheses, and may start with +' };
export const nameRegex = { pattern: NAME_PATTERN, error: 'name can only contain alphabets, spaces, apostrophes, or hyphens' };
