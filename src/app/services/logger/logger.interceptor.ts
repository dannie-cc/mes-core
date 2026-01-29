import { Injectable, NestInterceptor, ExecutionContext, CallHandler, StreamableFile } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RandomStringGenerator } from '@/utils/random';
import * as util from 'util';

interface LogEntry {
    timestamp: string;
    requestId: string;
    method: string;
    url: string;
}

interface RequestLogEntry extends LogEntry {
    headers?: Record<string, unknown>;
    body?: unknown;
    query?: unknown;
    params?: unknown;
    ip: string;
}

interface ResponseLogEntry extends LogEntry {
    statusCode: number;
    duration: string;
    body: unknown;
    responseSize?: string;
}

interface ErrorLogEntry extends LogEntry {
    statusCode: number;
    duration: string;
    error: string;
    stack?: string;
    body?: unknown;
}

interface LoggerConfig {
    logResponseSize: boolean;
    maxBodySize: number;
    prettyPrint: boolean;
    excludePaths: string[];
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private static get CONFIG(): LoggerConfig {
        return {
            logResponseSize: process.env.NODE_ENV === 'development',
            maxBodySize: parseInt(process.env.LOG_MAX_BODY_SIZE || '5000', 10),
            // NOTE: the original code used `|| true` which forces pretty printing on; keep existing behavior
            prettyPrint: process.env.LOG_PRETTY_PRINT === 'true' || true,
            excludePaths: ['/health', '/docs'],
        };
    }

    private static readonly METHODS_WITH_BODY = ['POST', 'PUT', 'PATCH', 'GET'] as const;
    private static readonly USEFUL_HEADERS = ['authorization', 'content-type', 'accept', 'origin', 'referer', 'x-forwarded-for', 'x-real-ip', 'host'] as const;

    constructor() { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();

        if (this.shouldSkipLogging(req.url)) {
            return next.handle();
        }

        const { method, url, headers, body, query, params, ip } = req;
        const requestId = this.generateRequestId();

        req.requestId = requestId;
        res.locals = res.locals || {};
        res.locals.requestId = requestId;

        const startTime = process.hrtime.bigint();

        const requestLog: RequestLogEntry = {
            timestamp: new Date().toISOString(),
            requestId,
            method,
            url,
            ip: ip || 'unknown',
            headers: this.sanitizeHeaders(headers),
            body: this.shouldLogBody(method) ? this.sanitizeBody(body) : undefined,
            query: this.sanitizeBody(query),
            params: this.sanitizeBody(params),
        };

        this.logEntry(requestLog, 'INCOMING REQUEST');

        return next.handle().pipe(
            tap((responseData: unknown) => {
                const duration = this.calculateDuration(startTime);

                const sanitizedBody = this.sanitizeBody(responseData);

                const responseLog: ResponseLogEntry = {
                    timestamp: new Date().toISOString(),
                    requestId,
                    method,
                    url,
                    body: this.shouldLogBody(method) ? sanitizedBody : undefined,
                    statusCode: res.statusCode,
                    duration,
                    responseSize: LoggingInterceptor.CONFIG.logResponseSize ? this.formatSize(this.calculateResponseSize(sanitizedBody)) : undefined,
                };

                this.logEntry(responseLog, 'RESPONSE SUCCESS');
            }),
            catchError((err: Error & { status?: number; getResponse?: () => unknown; getStatus?: () => number }) => {
                const duration = this.calculateDuration(startTime);
                let status = res.statusCode || 500;
                if (typeof err.getStatus === 'function') {
                    try {
                        status = err.getStatus();
                    } catch {
                        // ignore and keep existing status
                    }
                } else if (typeof err.status === 'number') {
                    status = err.status;
                }

                const errorLog: ErrorLogEntry = {
                    timestamp: new Date().toISOString(),
                    requestId,
                    method,
                    url,
                    statusCode: status,
                    duration,
                    error: err.message,
                    stack: err.stack,
                };

                // If it's a Nest HttpException (or compatible), capture the response payload details
                if (typeof err.getResponse === 'function') {
                    try {
                        const responsePayload = err.getResponse();
                        errorLog.body = this.sanitizeBody(responsePayload);
                    } catch {
                        // ignore if getResponse throws
                    }
                }

                this.logEntry(errorLog, 'RESPONSE ERROR', 'error');
                return throwError(() => err);
            }),
        );
    }

    private generateRequestId(): string {
        return `${Date.now()}-${RandomStringGenerator.generateSecure(8, 'alphanumeric')}`;
    }

    private shouldSkipLogging(url: string): boolean {
        return LoggingInterceptor.CONFIG.excludePaths.some((path) => url.startsWith(path));
    }

    private calculateDuration(startTime: bigint): string {
        const endTime = process.hrtime.bigint();
        const durationNs = endTime - startTime;
        const durationMs = Number(durationNs) / 1_000_000;
        return `${durationMs.toFixed(2)}ms`;
    }

    private logEntry(entry: LogEntry, message: string, level: 'log' | 'error' = 'log'): void {
        if (LoggingInterceptor.CONFIG.prettyPrint) {
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            const methodColor = this.getMethodColor(entry.method);

            // Add spacing before the log entry
            console.info('\n');

            console.info('='.repeat(80));
            if (message === 'INCOMING REQUEST') {
                console.info(`🔵 \x1b[36m${message}\x1b[0m \x1b[90m[${timestamp}]\x1b[0m`);
                console.info(`${methodColor}[${entry.method}]\x1b[0m ${entry.url}`);
            } else if (message === 'RESPONSE SUCCESS') {
                const responseEntry = entry as ResponseLogEntry;
                const statusColor = this.getStatusColor(responseEntry.statusCode);
                console.info(`🟢 \x1b[32m${message}\x1b[0m \x1b[90m[${timestamp}]\x1b[0m`);
                console.info(`${methodColor}[${entry.method}]\x1b[0m ${entry.url} ${statusColor}${responseEntry.statusCode}\x1b[0m \x1b[33m${responseEntry.duration}\x1b[0m`);
            } else if (message === 'RESPONSE ERROR') {
                const errorEntry = entry as ErrorLogEntry;
                const statusColor = this.getStatusColor(errorEntry.statusCode);
                console.info(`🔴 \x1b[31m${message}\x1b[0m \x1b[90m[${timestamp}]\x1b[0m`);
                console.info(`${methodColor}[${entry.method}]\x1b[0m ${entry.url} ${statusColor}${errorEntry.statusCode}\x1b[0m \x1b[33m${errorEntry.duration}\x1b[0m`);
            }

            console.info(`\x1b[90mRequest ID: ${entry.requestId}\x1b[0m`);
            console.info('─'.repeat(80));

            const displayEntry = this.formatEntryForDisplay(entry);
            console.info(
                util.inspect(displayEntry, {
                    colors: true,
                    depth: 4,
                    compact: false,
                    breakLength: 100,
                    sorted: true,
                }),
            );
            console.info('='.repeat(80));

            // Add spacing after the log entry
            console.info('\n');
        } else {
            const logMessage = `[${entry.requestId}] ${message}`;
            if (level === 'error') {
                console.error(`${logMessage} ${JSON.stringify(entry)}`);
            } else {
                console.info(`${logMessage} ${JSON.stringify(entry)}`);
            }
        }
    }

    private getMethodColor(method: string): string {
        const colors = {
            GET: '\x1b[32m', // Green
            POST: '\x1b[33m', // Yellow
            PUT: '\x1b[34m', // Blue
            PATCH: '\x1b[35m', // Magenta
            DELETE: '\x1b[31m', // Red
        };
        return colors[method as keyof typeof colors] || '\x1b[37m'; // White default
    }

    private getStatusColor(statusCode: number): string {
        if (statusCode >= 200 && statusCode < 300) return '\x1b[32m'; // Green
        if (statusCode >= 300 && statusCode < 400) return '\x1b[33m'; // Yellow
        if (statusCode >= 400 && statusCode < 500) return '\x1b[31m'; // Red
        if (statusCode >= 500) return '\x1b[91m'; // Bright Red
        return '\x1b[37m'; // White
    }

    private formatEntryForDisplay(entry: LogEntry): Record<string, unknown> {
        const display: Record<string, unknown> = {};

        display['Timestamp'] = new Date(entry.timestamp).toLocaleString();

        if ('ip' in entry) {
            const requestEntry = entry as RequestLogEntry;
            if (requestEntry.headers && Object.keys(requestEntry.headers).length > 0) {
                display['Headers'] = this.normalizeObject(requestEntry.headers);
            }
            if (requestEntry.query && Object.keys(requestEntry.query).length > 0) {
                display['Query'] = this.normalizeObject(requestEntry.query);
            }
            if (requestEntry.params && Object.keys(requestEntry.params).length > 0) {
                display['Params'] = this.normalizeObject(requestEntry.params);
            }
            if (requestEntry.body !== undefined) {
                display['Body'] = this.normalizeObject(requestEntry.body);
            }
            display['IP'] = requestEntry.ip;
        }

        if ('statusCode' in entry) {
            const responseEntry = entry as ResponseLogEntry | ErrorLogEntry;
            display['Status'] = responseEntry.statusCode;
            display['Duration'] = responseEntry.duration;

            if ('responseSize' in responseEntry && responseEntry.responseSize) {
                display['Size'] = responseEntry.responseSize;
            }

            // If there's a response body, include it
            if ((responseEntry as ResponseLogEntry).body !== undefined) {
                display['Body'] = this.normalizeObject((responseEntry as ResponseLogEntry).body);
            }

            if ('error' in responseEntry) {
                const errorEntry = responseEntry as ErrorLogEntry;
                display['Error'] = errorEntry.error;
                if (errorEntry.stack) {
                    display['Stack'] = errorEntry.stack;
                }
            }
        }

        return display;
    }

    private normalizeObject(obj: unknown): unknown {
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Primitive values (string/number/boolean) — return as-is
        if (typeof obj !== 'object') {
            return obj;
        }

        // Dates should be shown as ISO strings
        if (obj instanceof Date) {
            return obj.toISOString();
        }

        // Errors: include message and stack
        if (obj instanceof Error) {
            return {
                message: obj.message,
                stack: obj.stack,
            };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyObj = obj as any;
        if (typeof anyObj.toISOString === 'function') {
            return anyObj.toISOString();
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.normalizeObject(item));
        }

        // Create a new object with normal prototype
        const normalized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            normalized[key] = this.normalizeObject(value);
        }
        return normalized;
    }

    private calculateResponseSize(responseData: unknown): number {
        try {
            const json = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
            return Buffer.byteLength(json, 'utf8');
        } catch {
            return 0;
        }
    }

    private formatSize(bytesLength: number): string {
        if (bytesLength === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytesLength) / Math.log(1024));
        const size = bytesLength / Math.pow(1024, i);
        const rounded = Math.round(size * 10) / 10;

        return `${rounded} ${units[i]}`;
    }

    private shouldLogBody(httpMethod: string): boolean {
        return LoggingInterceptor.METHODS_WITH_BODY.includes(httpMethod.toUpperCase() as (typeof LoggingInterceptor.METHODS_WITH_BODY)[number]);
    }

    private sanitizeHeaders(headers: Record<string, string | string[]> | undefined): Record<string, unknown> | undefined {
        if (!headers || typeof headers !== 'object') {
            return undefined;
        }

        const sanitized: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();

            if (LoggingInterceptor.USEFUL_HEADERS.includes(lowerKey as (typeof LoggingInterceptor.USEFUL_HEADERS)[number])) {
                sanitized[key] = value;
            }
        }

        return Object.keys(sanitized).length > 0 ? sanitized : undefined;
    }

    private sanitizeBody(body: unknown): unknown {
        // 1) Don't try to JSON.stringify streams / binary responses
        if (body instanceof StreamableFile) {
            return '[StreamableFile]';
        }

        if (body == null || typeof body !== 'object') {
            return body;
        }

        const jsonString = typeof body === 'string' ? body : JSON.stringify(body);

        if (Buffer.byteLength(jsonString, 'utf8') > LoggingInterceptor.CONFIG.maxBodySize) {
            return `[Truncated body, size exceeds ${LoggingInterceptor.CONFIG.maxBodySize} bytes]`;
        }

        return typeof body === 'string' ? JSON.parse(jsonString) : body;
    }
}
