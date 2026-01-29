import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { IRedisConfig, REDIS_CONFIG_TOKEN } from '@/config';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit {
    private readonly redis: Redis;
    private readonly MAX_RETRIES = 10; // Maximum number of retry attempts
    private readonly RETRY_DELAY = 5000; // 5 seconds

    constructor(
        private readonly configService: ConfigService,
        private readonly logger: CustomLoggerService,
    ) {
        this.logger.setContext(RedisService.name);
        const redisConfig = this.configService.getOrThrow<IRedisConfig>(REDIS_CONFIG_TOKEN);
        this.logger.log('Initializing Redis connection with config:', redisConfig);
        this.redis = new Redis({
            ...redisConfig,
            retryStrategy: (times: number) => {
                if (times <= this.MAX_RETRIES) {
                    const delay = Math.min(times * this.RETRY_DELAY, 20000);
                    this.logger.warn(`Redis connection attempt ${times}/${this.MAX_RETRIES} failed. Retrying in ${delay}ms...`);
                    return delay;
                }
                this.logger.error('Max Redis connection retries reached. Giving up.');
                return null;
            },
        });

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.redis.on('error', (error) => {
            this.logger.error(`Redis connection error: ${error.message}`);
            if (error.message.includes('ECONNREFUSED')) {
                this.logger.error('Redis connection refused. Ensure Redis server is running.');
                process.exit(1);
            }
        });

        this.redis.on('connect', () => {
            this.logger.log('Successfully connected to Redis');
        });

        this.redis.on('ready', () => {
            this.logger.log('Redis client is ready to receive commands');
        });

        this.redis.on('close', () => {
            this.logger.warn('Redis connection closed');
        });
    }

    async onModuleInit() {
        try {
            await this.testConnection();
        } catch (error) {
            this.logger.error('Failed to establish Redis connection during initialization');
            this.logger.error(error);
            process.exit(1);
        }
    }

    private async testConnection() {
        let attempts = 0;
        while (attempts < this.MAX_RETRIES) {
            try {
                await this.redis.ping();
                this.logger.log('Redis connection test successful');
                return;
            } catch (error) {
                attempts++;
                this.logger.warn(`Redis connection test failed. Attempt ${attempts}/${this.MAX_RETRIES}`);
                if (attempts === this.MAX_RETRIES) {
                    throw new Error('Failed to connect to Redis after maximum retries');
                }
                await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
            }
        }
    }

    // Public methods to interact with Redis
    async set(key: string, value: string, expireTime?: number): Promise<'OK'> {
        if (typeof expireTime === 'number') {
            if (expireTime <= 0) {
                throw new Error('expireTime must be > 0 to avoid non-expiring keys');
            }
            return this.redis.set(key, value, 'EX', expireTime);
        }
        return this.redis.set(key, value);
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async del(key: string): Promise<number> {
        return this.redis.del(key);
    }

    async incr(key: string): Promise<number> {
        return this.redis.incr(key);
    }

    async expire(key: string, seconds: number): Promise<number> {
        return this.redis.expire(key, seconds);
    }

    async ttl(key: string): Promise<number> {
        return this.redis.ttl(key);
    }

    getClient(): Redis {
        return this.redis;
    }
}
