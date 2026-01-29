import { constants, promises } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { DATABASE_CONFIG_TOKEN, IDatabaseConfig } from '@/config';
import { CustomLoggerService } from '@/app/services/logger/logger.service';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
    private readonly pool: Pool;
    private readonly db;
    private readonly migrationPaths = {
        root: join(process.cwd(), 'drizzle'),
        meta: join(process.cwd(), 'drizzle', 'meta'),
        migrations: join(process.cwd(), 'drizzle', 'migrations'),
        journal: join(process.cwd(), 'drizzle', 'meta', '_journal.json'),
    };

    constructor(
        private readonly configService: ConfigService,
        private readonly logger: CustomLoggerService,
    ) {
        try {
            this.logger.setContext(DrizzleService.name);
            const poolConfig = this.createPoolConfig();
            this.pool = new Pool(poolConfig);
            this.db = drizzle(this.pool, { schema });

            this.logger.log('type', typeof this.db);

            this.setupPoolEventHandlers();
        } catch (error) {
            this.logger.error('Database initialization failed:', error);
            throw error;
        }
    }

    private createPoolConfig() {
        const dbConfig = this.configService.getOrThrow<IDatabaseConfig>(DATABASE_CONFIG_TOKEN);
        return {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.username,
            password: dbConfig.password,
            database: dbConfig.database,
            connectionTimeoutMillis: 5000,
            query_timeout: 5000,
            options: '-c timezone=UTC',
        };
    }

    private setupPoolEventHandlers(): void {
        this.pool.on('connect', () => {
            this.logger.log('New Database Connection Established!');
        });

        this.pool.on('error', (err) => {
            this.logger.error('Unexpected pool error:', err);
        });
    }

    private async validateConnection(): Promise<void> {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT current_user, current_database()');
            this.logger.log('Connected as:', result.rows[0]);
        } catch (error) {
            this.logger.error('Connection validation failed:', error);
            throw new Error('Database connection validation failed');
        } finally {
            client.release();
        }
    }

    private async setupMigrationInfrastructure(): Promise<void> {
        await this.validateMigrationPermissions();
        await this.ensureMigrationDirectories();
        await this.initializeJournalFile();
    }

    private async validateMigrationPermissions(): Promise<void> {
        try {
            await promises.access(this.migrationPaths.root, constants.W_OK);
        } catch {
            this.logger.error(`No write permission to migrations folder: ${this.migrationPaths.root}`);
            this.logger.error('Please run: chmod -R 755 drizzle/');
            throw new Error('Migration folder permission denied');
        }
    }

    private async ensureMigrationDirectories(): Promise<void> {
        await promises.mkdir(this.migrationPaths.meta, { recursive: true, mode: 0o755 });
    }

    private async initializeJournalFile(): Promise<void> {
        try {
            await promises.access(this.migrationPaths.journal);
        } catch {
            const initialJournal = { version: '5', dialect: 'pg', entries: [] };
            await promises.writeFile(this.migrationPaths.journal, JSON.stringify(initialJournal, null, 2), { mode: 0o644 });
        }
    }

    private async runMigrations(): Promise<void> {
        try {
            await migrate(this.db, {
                migrationsFolder: this.migrationPaths.root,
                migrationsTable: 'drizzle_migrations',
                migrationsSchema: 'public',
            });
            this.logger.log('Migrations completed successfully');
        } catch (error) {
            if (error.code === '42P07' || error.cause?.code === '42P07') {
                // Table already exists
                this.logger.warn('Tables already exist, skipping migration');
                return;
            }
            this.logger.error('Migrations failed:', error);
            throw error;
        }
    }

    async onModuleInit() {
        try {
            await this.validateConnection();
            await this.setupMigrationInfrastructure();
            await this.runMigrations();
        } catch (error) {
            this.logger.error('Module initialization failed:', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        await this.pool.end();
        this.logger.log('Database connection pool closed');
    }

    get database() {
        return this.db;
    }
}
