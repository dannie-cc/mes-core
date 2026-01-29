import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import serverConfig from '@/config/server.config';

interface RecaptchaVerifyResponse {
    success: boolean;
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
    score?: number;
    action?: string;
}

@Injectable()
export class RecaptchaService {
    private readonly secretKey: string;
    private readonly verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    private readonly enabled: boolean;

    constructor(
        @Inject(serverConfig.KEY)
        private readonly config: ConfigType<typeof serverConfig>,
        private readonly logger: CustomLoggerService,
    ) {
        this.logger.setContext(RecaptchaService.name);
        this.secretKey = this.config.recaptcha.secretKey;
        this.enabled = this.config.recaptcha.enabled;

        if (this.enabled && !this.secretKey) {
            this.logger.error('reCAPTCHA is enabled but RECAPTCHA_SECRET_KEY is not configured');
        }
    }

    /**
     * Verify reCAPTCHA token with Google
     * @param token - The reCAPTCHA token from frontend
     * @param remoteIp - Optional IP address of the user
     * @returns Promise<boolean> - true if verification succeeds
     * @throws BadRequestException if verification fails
     */
    async verifyToken(token: string | null | undefined, remoteIp?: string): Promise<boolean> {
        // Skip verification if disabled (for development/testing)
        if (!this.enabled) {
            this.logger.warn('reCAPTCHA verification is disabled');
            return true;
        }

        if (!token) {
            this.logger.warn('reCAPTCHA token is missing');
            throw new BadRequestException('reCAPTCHA verification failed. Please complete the captcha.');
        }

        if (!this.secretKey) {
            this.logger.error('reCAPTCHA secret key is not configured');
            throw new BadRequestException('reCAPTCHA verification is temporarily unavailable.');
        }

        try {
            const params = new URLSearchParams({
                secret: this.secretKey,
                response: token,
            });

            if (remoteIp) {
                params.append('remoteip', remoteIp);
            }

            const response = await fetch(this.verifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });

            if (!response.ok) {
                this.logger.error(`reCAPTCHA API request failed with status ${response.status}`);
                throw new BadRequestException('reCAPTCHA verification failed. Please try again.');
            }

            const data: RecaptchaVerifyResponse = await response.json();
            console.info('data ==> ', data);

            if (!data.success) {
                this.logger.warn('reCAPTCHA verification failed', {
                    errorCodes: data['error-codes'],
                    hostname: data.hostname,
                });

                // Log specific error codes for debugging
                if (data['error-codes']) {
                    const errorMessages: Record<string, string> = {
                        'missing-input-secret': 'Secret key is missing',
                        'invalid-input-secret': 'Secret key is invalid',
                        'missing-input-response': 'Token is missing',
                        'invalid-input-response': 'Token is invalid or has expired',
                        'bad-request': 'Request is malformed',
                        'timeout-or-duplicate': 'Token has already been used or has expired',
                    };

                    data['error-codes'].forEach((code) => {
                        this.logger.warn(`reCAPTCHA error: ${code} - ${errorMessages[code] || 'Unknown error'}`);
                    });
                }

                throw new BadRequestException('reCAPTCHA verification failed. Please try again.');
            }

            this.logger.debug('reCAPTCHA verification successful', {
                hostname: data.hostname,
                challenge_ts: data.challenge_ts,
            });

            return true;
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }

            this.logger.error('Error during reCAPTCHA verification', error);
            throw new BadRequestException('reCAPTCHA verification failed. Please try again.');
        }
    }

    /**
     * Check if reCAPTCHA is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }
}
