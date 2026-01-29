import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodSerializationException } from 'nestjs-zod';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();

        const exceptionResponse = exception.getResponse() as unknown;

        if (exception instanceof ZodSerializationException) {
            const zodError = exception.getZodError();
            this.logger.error(zodError);
        } else if (status >= 500) {
            this.logger.error(exception.message);
        }

        let message: string | string[];
        if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        } else if (exceptionResponse && typeof exceptionResponse === 'object') {
            const maybeMsg = (exceptionResponse as { message?: unknown }).message;
            if (Array.isArray(maybeMsg) && maybeMsg.every((v): v is string => typeof v === 'string')) {
                message = maybeMsg;
            } else if (typeof maybeMsg === 'string') {
                message = maybeMsg;
            } else {
                message = exception.message ?? 'Internal server error';
            }
        } else {
            message = exception.message ?? 'Internal server error';
        }

        const debugDetails = typeof exceptionResponse === 'object' ? (exceptionResponse as Record<string, unknown>) : undefined;
        const errorResponse = {
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
            ...(process.env.NODE_ENV !== 'production' && debugDetails ? { details: debugDetails } : {}),
        };

        response.status(status).json(errorResponse);
    }
}
