import { registerAs } from '@nestjs/config';

export interface AuthConfig {
    jwt: {
        expiresIn: number; // in seconds
    };
    passwordReset: {
        tokenExpiry: number; // in seconds
        maxAttempts: number;
        rateLimitWindow: number; // in seconds
    };
    otp: {
        length: number;
        expiry: number; // in seconds
    };
}

export const AUTH_CONFIG_TOKEN = 'auth';

export const authConfig = registerAs(
    AUTH_CONFIG_TOKEN,
    (): AuthConfig => ({
        jwt: {
            expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '86400', 10), // 24 hours
        },
        passwordReset: {
            tokenExpiry: parseInt(process.env.PASSWORD_RESET_EXPIRY || '600', 10), // 10 minutes
            maxAttempts: parseInt(process.env.PASSWORD_RESET_MAX_ATTEMPTS || '3', 10),
            rateLimitWindow: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW || '900', 10), // 15 minutes
        },
        otp: {
            length: parseInt(process.env.OTP_LENGTH || '6', 10),
            expiry: parseInt(process.env.OTP_EXPIRY || '600', 10), // 10 minutes
        },
    }),
);

export default authConfig;
