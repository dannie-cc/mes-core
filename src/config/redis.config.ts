import { registerAs } from '@nestjs/config';

export const REDIS_CONFIG_TOKEN = 'redis';

export const redisConfig = registerAs(
    REDIS_CONFIG_TOKEN,
    (): IRedisConfig =>
        ({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
            password: process.env.REDIS_PASSWORD,
        }) satisfies IRedisConfig,
);

export default redisConfig;

export interface IRedisConfig {
    readonly host: string;
    readonly port: number;
    readonly password?: string;
}
