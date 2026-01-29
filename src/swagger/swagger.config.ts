import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule, OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { inspect } from 'util';
import * as fs from 'fs';
import * as nodePath from 'path';
import packageJson from '../../package.json';

/**
 * Sets up Swagger documentation for the NestJS application.
 * @param app The NestJS application instance.
 * @param path The path where Swagger UI will be served (e.g., 'api').
 */
export function setupSwagger(app: INestApplication, path: string = 'api') {
    const config = new DocumentBuilder()
        .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
        })
        .addSecurityRequirements('bearer')
        .setTitle(packageJson.name)
        .setDescription(packageJson.description)
        .setVersion('3.1')
        .build();

    // Use a lazy factory so we can catch and persist diagnostic info without hard-failing startup
    const documentFactory = (): OpenAPIObject => {
        try {
            // High-level start log (lint allows console.info)
            console.info('🔄 Starting Swagger document creation...');

            const doc = SwaggerModule.createDocument(app, config, {
                operationIdFactory: (controllerKey: string, methodKey: string) => {
                    // Per-operation progress log
                    // console.info(`📝 Processing operation: ${controllerKey}.${methodKey}`);
                    return methodKey;
                },
                ignoreGlobalPrefix: false,
            });

            // Success summary
            try {
                const pathCount = doc && doc.paths ? Object.keys(doc.paths).length : 0;
                console.info(`✅ Swagger document created successfully (paths: ${pathCount})`);
            } catch {
                // no-op
            }

            return cleanupOpenApiDoc(doc);
        } catch (error) {
            // Console block for immediate visibility
            console.error('\n----- SWAGGER DOCUMENT CREATION FAILED -----');
            console.error('📍 Error occurred during document creation');
            try {
                console.error('Message:', (error as Error)?.message ?? String(error));
                console.error('Stack:');
                console.error((error as Error)?.stack ?? inspect(error));
                console.error('Inspect:', inspect(error, { depth: 8 }));

                // Additional stack analysis to pinpoint likely source
                if (error instanceof Error && typeof error.stack === 'string') {
                    const stackLines = error.stack.split('\n');
                    console.error('📊 Stack analysis:');
                    stackLines.forEach((line, index) => {
                        const l = line.trim();
                        if (l.includes('node_modules') && (l.includes('zod') || l.includes('nestjs') || l.includes('swagger'))) {
                            console.error(`  ${index + 1}: ${l}`);
                        }
                    });
                }
            } catch (logErr) {
                console.error('Failed to log Swagger error details:', inspect(logErr));
            }

            // Extract DTO name if present in stack/message to make it easy to spot
            let offendingDto = '<not found in stack/message>';
            try {
                const errUnknown = error as unknown;
                const text = String(typeof (errUnknown as Error).stack === 'string' ? (errUnknown as Error).stack : inspect(errUnknown));
                const dtoMatch = /([A-Za-z0-9_]+Dto)\b/.exec(text);
                if (dtoMatch && dtoMatch[1]) offendingDto = dtoMatch[1];
            } catch {
                // ignore extraction errors
            }
            console.error('>>> OFFENDING DTO:', offendingDto);

            // Persist a diagnostic file for easier sharing/triage
            try {
                const logsDir = nodePath.join(process.cwd(), 'logs');
                fs.mkdirSync(logsDir, { recursive: true });
                const filename = `swagger-diagnostic-${Date.now()}.log`;
                const filePath = nodePath.join(logsDir, filename);
                const contents = [
                    'SWAGGER DIAGNOSTIC',
                    `time: ${new Date().toISOString()}`,
                    `offendingDto: ${offendingDto}`,
                    '',
                    'ERROR MESSAGE:',
                    (error as Error)?.message ?? String(error),
                    '',
                    'STACK:',
                    (error as Error)?.stack ?? inspect(error),
                    '',
                    'FULL INSPECT:',
                    inspect(error, { depth: 8 }),
                ].join('\n');
                fs.writeFileSync(filePath, contents, { encoding: 'utf8' });
                console.error(`Saved swagger diagnostic to: ${filePath}`);
            } catch (fileErr) {
                console.error('Failed to write swagger diagnostic file:', inspect(fileErr));
            }

            console.error('----- END SWAGGER FAILURE -----\n');

            // Return a minimal OpenAPI document so the app can continue to run and serve a stubbed Swagger UI
            return {
                openapi: '3.0.0',
                info: {
                    title: packageJson.name ?? 'API',
                    version: packageJson.version ?? '0.0.0',
                },
                paths: {},
                components: {},
            } as OpenAPIObject;
        }
    };

    type SwaggerResponse = {
        url?: string;
        status?: number;
        obj?: { data?: { accessToken?: string } };
    };

    const customOptions: SwaggerCustomOptions = {
        swaggerOptions: {
            responseInterceptor: (res: SwaggerResponse) => {
                const r = res as SwaggerResponse;
                if (typeof r.url === 'string' && r.url.includes('/auth/login') && (r.status === 200 || r.status === 201) && r.obj && r.obj.data && r.obj.data.accessToken) {
                    const token = r.obj.data.accessToken;
                    if (token) {
                        const g = globalThis as unknown as { window?: unknown };
                        type SwaggerWindow = { ui?: { authActions?: { authorize?: (arg: { bearer: { value: string } }) => void } } };
                        const w = (g.window as unknown as SwaggerWindow) ?? (g as unknown as SwaggerWindow);
                        if (w?.ui?.authActions && typeof w.ui.authActions.authorize === 'function') {
                            try {
                                w.ui.authActions.authorize({
                                    bearer: {
                                        value: `Bearer ${token}`,
                                    },
                                });
                                console.info('✅ Swagger UI: Authorization token automatically set.');
                            } catch (e) {
                                console.error('❌ Error caught during authorize call:', e);
                            }
                        } else {
                            console.warn('❌ window.ui.authActions.authorize is not a function or not available.');
                        }
                        console.info('Swagger UI: Authorization token automatically set.');
                    }
                }
                return res;
            },
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    };

    SwaggerModule.setup(path, app, documentFactory, customOptions);
}
