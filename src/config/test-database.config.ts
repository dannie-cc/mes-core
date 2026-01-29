import { ConfigType, registerAs } from '@nestjs/config';

export const testDatabaseConfig = registerAs('testDatabase', () => ({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
    username: process.env.TEST_DB_USERNAME || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    database: process.env.TEST_DB_NAME || 'mes_test',
    ssl: process.env.TEST_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
}));

export type ITestDatabaseConfig = ConfigType<typeof testDatabaseConfig>;
export const TEST_DATABASE_CONFIG_TOKEN = 'testDatabase';
