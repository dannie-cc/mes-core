import * as fs from 'fs';
import path from 'path';
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { createZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod';

import { CustomLoggerService } from '@/app/services/logger/logger.service';

import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './app/exceptions.filter';
import { API_CONFIG_TOKEN, ENVIRONMENT, IAppConfiguration } from './config';
import { setupSwagger } from './swagger';

async function bootstrap() {
    const logger = new CustomLoggerService();
    try {
        const app = await NestFactory.create(AppModule, {
            abortOnError: false,
            rawBody: true,
            cors: true,
            logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        });

        const configuration = app.get(ConfigService).getOrThrow<IAppConfiguration>(API_CONFIG_TOKEN);
        const { host, port } = configuration.server;
        const { url: clientUrl } = configuration.client;

        const excludePaths = ['/health', '/health/ready', '/health/detailed'];
        if (configuration.environment === ENVIRONMENT.DEVELOPMENT) {
            excludePaths.push('/docs', '/docs-json');
        }
        app.setGlobalPrefix('api', { exclude: excludePaths });
        const CustomZodValidationPipe = createZodValidationPipe({
            // Map Zod issues to proper HTTP exceptions:
            // - Unknown fields (unrecognized_keys) -> 400 Bad Request
            // - Invalid values for known fields -> 422 Unprocessable Entity
            createValidationException: (error: ZodError) => {
                // Some adapters may populate `errors` instead of `issues`; prefer `issues` but fall back gracefully
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const raw: any = error as any;
                const issues: ZodError['issues'] = Array.isArray(raw?.issues) ? raw.issues : Array.isArray(raw?.errors) ? raw.errors : [];

                type ZIssue = ZodError['issues'][number];
                type UnrecognizedIssue = ZIssue & { code: 'unrecognized_keys'; keys?: string[] };
                const isUnrecognized = (i: ZIssue): i is UnrecognizedIssue => i.code === 'unrecognized_keys';

                const unknownIssues = issues.filter(isUnrecognized);
                const otherIssues = issues.filter((i) => !isUnrecognized(i));

                // If we have invalid known fields, report 422 with all issues
                if (otherIssues.length > 0) {
                    return new UnprocessableEntityException({ message: 'Validation failed', errors: otherIssues });
                }

                // If we have unrecognized keys, collect and return 400
                if (unknownIssues.length > 0) {
                    const unknownFields = [...new Set(unknownIssues.flatMap((i) => (Array.isArray(i.keys) ? i.keys : [])))];
                    return new BadRequestException({
                        message: 'Unknown fields are not allowed',
                        unknownFields,
                        errors: unknownIssues,
                    });
                }

                // Fallback: when no structured issues are available, return 422 with the raw message
                return new UnprocessableEntityException({ message: error?.message || 'Validation failed' });
            },
        });
        app.useGlobalPipes(new CustomZodValidationPipe());
        app.useGlobalFilters(new HttpExceptionFilter());

        fs.mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true });
        // Only setup Swagger in development environment
        if (configuration.environment === ENVIRONMENT.DEVELOPMENT) {
            logger.log('Setting up Swagger documentation...');
            setupSwagger(app, 'docs');
            logger.log(`📚 Swagger documentation available at: http://${host}:${port}/docs`);
        }

        const origins = [clientUrl];
        if (configuration.environment === ENVIRONMENT.DEVELOPMENT) {
            origins.push(`http://${host}:${port}`);
            origins.push(`https://${host}:${port}`);
        }
        // Ensure both http and https versions of the actual clientUrl are also allowed
        if (clientUrl.startsWith('http:')) {
            origins.push(clientUrl.replace('http:', 'https:'));
        } else if (clientUrl.startsWith('https:')) {
            origins.push(clientUrl.replace('https:', 'http:'));
        }

        app.enableCors({
            origin: [...new Set(origins)],
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            credentials: true,
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        });

        logger.log(`<<<< Server is running at: http://${host}:${port}/api >>>>`);
        await app.listen(port);
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

bootstrap().catch((error) => {
    console.error('Error during bootstrap:', error);
});
