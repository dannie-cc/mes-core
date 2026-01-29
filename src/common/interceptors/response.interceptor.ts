import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { OkResponseBuilder, GET_PAYLOAD } from '@/utils';
import { StandardApiResponse, PaginatedApiResponse, OkResponse } from '@/types';

type ResponseData<T> = T | T[];

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<ResponseData<T>, StandardApiResponse<ResponseData<T>> | PaginatedApiResponse<ResponseData<T[]>>> {
    intercept(context: ExecutionContext, next: CallHandler<ResponseData<T>>): Observable<StandardApiResponse<ResponseData<T>> | PaginatedApiResponse<ResponseData<T[]>>> {
        const httpCtx = context.switchToHttp();
        const res = httpCtx.getResponse();

        return next.handle().pipe(
            map((data: unknown | OkResponseBuilder<T>) => {
                // 1) If response is already committed (e.g. manual @Res(), stream, etc.), do nothing
                if (res?.headersSent || res?.writableEnded) {
                    return data as any;
                }

                // 2) If this is a StreamableFile (e.g. thumbnail / binary), do not wrap as JSON
                if (data instanceof StreamableFile) {
                    return data as any;
                }

                let finalResponse: StandardApiResponse<ResponseData<T>> | PaginatedApiResponse<ResponseData<T[]>>;

                // 3) Normal OkResponseBuilder handling
                if (data instanceof OkResponseBuilder) {
                    const payload: OkResponse<T> = data[GET_PAYLOAD]();
                    const { data: extractedData, message, pagination } = payload;

                    if (pagination) {
                        finalResponse = {
                            success: true,
                            data: extractedData as T[],
                            message,
                            pagination: {
                                ...pagination,
                                totalPages: pagination.totalPages ?? Math.ceil(pagination.total / pagination.limit),
                            },
                        } as PaginatedApiResponse<T[]>;
                    } else {
                        finalResponse = {
                            success: true,
                            data: extractedData,
                            message,
                        } as StandardApiResponse<T>;
                    }
                } else {
                    // 4) Raw/plain objects fallbacks

                    // 4.a) If it's already in standardized form, pass through
                    if (data && typeof data === 'object' && 'success' in (data as Record<string, unknown>)) {
                        return data as StandardApiResponse<ResponseData<T>> | PaginatedApiResponse<ResponseData<T[]>>;
                    }

                    // 4.b) If it looks like { data, pagination?, message? }
                    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
                        const payload = data as OkResponse<T> & {
                            data: unknown;
                            pagination?: { total: number; limit: number; totalPages?: number };
                            message?: string;
                        };

                        const extractedData = payload.data as T | T[];
                        const { message, pagination } = payload;

                        if (pagination) {
                            finalResponse = {
                                success: true,
                                data: extractedData as T[],
                                message: message ?? 'Success',
                                pagination: {
                                    ...pagination,
                                    totalPages: pagination.totalPages ?? Math.ceil(pagination.total / pagination.limit),
                                },
                            } as PaginatedApiResponse<T[]>;
                        } else {
                            finalResponse = {
                                success: true,
                                data: extractedData as T,
                                message: message ?? 'Success',
                            } as StandardApiResponse<T>;
                        }
                    } else {
                        // 4.c) Completely raw value (primitive, null, or object with no `data` key)

                        let fallbackMessage = 'Success';

                        if (data && typeof data === 'object') {
                            const maybeMsg = (data as Record<string, unknown>).message;
                            if (typeof maybeMsg === 'string') {
                                fallbackMessage = maybeMsg;
                            }
                        }

                        finalResponse = {
                            success: true,
                            data: data as ResponseData<T>,
                            message: fallbackMessage,
                        } as StandardApiResponse<ResponseData<T>>;
                    }
                }

                return finalResponse;
            }),
        );
    }
}
