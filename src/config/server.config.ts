import { registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

import { DEFAULT_EXPIRY } from '@/common/constants';

export const API_CONFIG_TOKEN = 'server';

export interface IAppConfiguration {
    readonly environment: ENVIRONMENT;
    readonly smtp: ISMTPConfiguration;
    readonly openId: IOpenId;
    readonly server: {
        readonly host: string;
        readonly port: number;
        readonly protocol: string;
        readonly url: string;
    };
    readonly client: {
        readonly url: string;
    };
    readonly invitation: IInvitationConfiguration;
    readonly jwt: IJwtConfiguration;
    readonly minio: {
        readonly endPoint: string;
        readonly port: number;
        readonly useSSL: boolean;
        readonly accessKey: string;
        readonly secretKey: string;
        readonly bucketName: string;
        readonly expiry?: number; // Optional expiry time in seconds
    };
    readonly recaptcha: {
        readonly enabled: boolean;
        readonly secretKey: string;
    };
}

export enum ENVIRONMENT {
    DEVELOPMENT = 'development',
    STAGE = 'stage',
    PRODUCTION = 'production',
}

export interface ISMTPConfiguration {
    readonly username: string;
    readonly password: string;
    readonly from: string;
    readonly host: string;
    readonly port: number;
}

interface IOpenId {
    readonly issuer: string;
    readonly clientId: string;
    readonly clientSecret: string;
}

interface IInvitationConfiguration {
    readonly expirationDuration: number;
}

interface IJwtConfiguration {
    readonly secret: string; // e.g. 'my-secret-key'
    readonly expiration: StringValue | number; // e.g. 1h
    readonly algorithm: string; // e.g. HS256
    readonly issuer: string; // e.g. 'abbasi'
}

export const serverConfig = registerAs(API_CONFIG_TOKEN, (): IAppConfiguration => {
    const serverHost = process.env.SERVER_HOST as string;
    const serverPort = parseInt(process.env.SERVER_PORT as string, 10) || 4000;
    const serverProtocol = process.env.SERVER_PROTOCOL as string;
    const serverUrl = `${serverProtocol}://${serverHost}:${serverPort}`;

    const clientProtocol = process.env.CLIENT_PROTOCOL as string;
    const clientHost = process.env.CLIENT_HOST as string;
    const clientUrl = `${clientProtocol}://${clientHost}`;

    return {
        environment: (process.env.NODE_ENV as ENVIRONMENT) || ENVIRONMENT.DEVELOPMENT,
        smtp: {
            username: process.env.SMTP_USERNAME as string,
            password: process.env.SMTP_PASSWORD as string,
            from: process.env.SMTP_FROM as string,
            host: process.env.SMTP_HOST as string,
            port: parseInt(process.env.SMTP_PORT as string, 10) || 587,
        },
        openId: {
            issuer: process.env.OPENID_ISSUER as string,
            clientId: process.env.OPENID_CLIENT_ID as string,
            clientSecret: process.env.OPENID_CLIENT_SECRET as string,
        },
        server: {
            host: serverHost,
            port: serverPort,
            protocol: serverProtocol,
            url: serverUrl,
        },
        client: {
            url: clientUrl,
        },
        invitation: {
            expirationDuration: 3 * 60 * 1000, // 3 min in milliseconds
        },
        jwt: {
            secret: process.env.JWT_SECRET as string,
            expiration: (process.env.JWT_EXPIRATION ?? '1H') as StringValue,
            algorithm: process.env.JWT_ALGORITHM ?? 'HS256',
            issuer: process.env.JWT_ISSUER ?? 'abbasi',
        },
        minio: {
            endPoint: process.env.MINIO_ENDPOINT as string,
            port: parseInt(process.env.MINIO_PORT as string, 10) || 9000,
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY as string,
            secretKey: process.env.MINIO_SECRET_KEY as string,
            bucketName: process.env.MINIO_BUCKET_NAME as string,
            expiry: parseInt(process.env.MINIO_EXPIRY as string, 10) || DEFAULT_EXPIRY,
        },
        recaptcha: {
            enabled: process.env.RECAPTCHA_ENABLED === 'true',
            secretKey: process.env.RECAPTCHA_SECRET_KEY as string,
        },
    };
});

export default serverConfig;
