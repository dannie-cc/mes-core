import { Pagination, OkResponse } from '@/types';

export const GET_PAYLOAD = Symbol('getPayload');

export class OkResponseBuilder<T> {
    private _data: T;
    private _message?: string;
    private _pagination?: Pagination;

    constructor(data: T) {
        this._data = data;
    }

    get data(): T {
        return this._data;
    }

    message(message: string): OkResponseBuilder<T> {
        this._message = message;
        return this;
    }

    paginate(paginationDetails: Pagination): OkResponseBuilder<T> {
        if (paginationDetails.page < 1 || paginationDetails.limit < 1) {
            throw new Error('Invalid pagination parameters');
        }

        this._pagination = {
            ...paginationDetails,
            totalPages: paginationDetails.totalPages ?? Math.ceil(paginationDetails.total / paginationDetails.limit),
        };
        return this;
    }

    [GET_PAYLOAD](): OkResponse<T> {
        const payload: OkResponse<T> = {
            data: this._data,
            message: this._message || 'Success',
        };
        if (this._pagination !== undefined) {
            payload.pagination = this._pagination;
        }
        return payload;
    }
}

export function ok<T>(data: T): OkResponseBuilder<T> {
    return new OkResponseBuilder(data);
}
