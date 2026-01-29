import { registerAs } from '@nestjs/config';

export interface IDatabaseConfig {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: string;
    readonly database: string;
}

export const DATABASE_CONFIG_TOKEN = 'database';

export const databaseConfig = registerAs(DATABASE_CONFIG_TOKEN, (): IDatabaseConfig => {
    // Validate required environment variables
    const requiredEnvVars = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required database environment variables: ${missingEnvVars.join(', ')}`);
    }

    return {
        host: process.env.POSTGRES_HOST!,
        port: parseInt(process.env.POSTGRES_PORT!, 10),
        username: process.env.POSTGRES_USER!,
        password: process.env.POSTGRES_PASSWORD!,
        database: process.env.POSTGRES_DB!,
    } satisfies IDatabaseConfig;
});

export const makeDrizzleConfigs = () => {
    const config = databaseConfig();
    return {
        host: config.host,
        port: config.port,
        user: config.username, // NOTE: drizzle uses 'user' instead of 'username'
        password: config.password,
        database: config.database,
        ssl: false,
    };
};
