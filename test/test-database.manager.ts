import { execSync } from 'child_process';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

/**
 * Test Database Manager
 * Handles Docker test database lifecycle for integration tests
 */
export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private pool: Pool | null = null;

  private constructor() {}

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  /**
   * Start the test database container
   */
  async startTestDatabase(): Promise<void> {
    console.log('🐳 Starting test PostgreSQL container...');
    
    try {
      // Start the test database using docker-compose
      execSync('docker compose -f compose.test.yml up -d test_postgres', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      // Wait for database to be ready
      await this.waitForDatabase();
      
      // Run migrations on test database
      await this.runMigrations();

      // Create test users after migrations
      await this.createTestUsers();
      
      console.log('✅ Test database ready');
    } catch (error) {
      console.error('❌ Failed to start test database:', error);
      throw error;
    }
  }

  /**
   * Stop and cleanup the test database container
   */
  async stopTestDatabase(): Promise<void> {
    console.log('🧹 Cleaning up test database...');
    
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      // Stop and remove the test database container
      execSync('docker compose -f compose.test.yml down -v', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      console.log('✅ Test database cleanup complete');
    } catch (error) {
      console.error('❌ Failed to cleanup test database:', error);
      throw error;
    }
  }

  /**
   * Clean test data between tests
   */
  async cleanTestData(): Promise<void> {
    if (!this.pool) {
      this.pool = new Pool({
        host: 'localhost',
        port: 5433,
        user: 'test_user',
        password: 'test_password',
        database: 'mes_test',
      });
    }

    const client = await this.pool.connect();
    try {
      // Clean all tables in reverse dependency order EXCEPT users (need to persist across tests)
      // Note: NOT using CASCADE to avoid accidentally deleting users due to foreign key relationships
      const tables = ['order_stage_files', 'order_stage_history', 'order_stages', 'orders', 'attachments', 'notifications'];
      
      for (const table of tables) {
        try {
          await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY`);
        } catch (error: any) {
          // Ignore table not found errors during cleanup
          console.warn(`Warning: Could not truncate table ${table}:`, error.message);
        }
      }
      
      console.log('🧽 Test data cleaned');
    } catch (error) {
      console.error('❌ Failed to clean test data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Wait for database to be ready
   */
  private async waitForDatabase(maxRetries = 30): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const pool = new Pool({
          host: 'localhost',
          port: 5433,
          user: 'test_user',
          password: 'test_password',
          database: 'mes_test',
        });

        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        await pool.end();
        
        console.log('✅ Database connection successful');
        return;
      } catch (error) {
        console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('❌ Database failed to start within timeout');
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Running database migrations...');
      
      // Create a Drizzle database connection for migrations
      const migrationPool = new Pool({
        host: 'localhost',
        port: 5433,
        user: 'test_user',
        password: 'test_password',
        database: 'mes_test',
      });

      const db = drizzle(migrationPool);

      // Run migrations using Drizzle's migrate function
      await migrate(db, {
        migrationsFolder: './drizzle',
        migrationsTable: 'drizzle_migrations',
        migrationsSchema: 'public',
      });

      await migrationPool.end();
      console.log('✅ Migrations completed');
    } catch (error: any) {
      console.error('❌ Migration failed:', error);
      console.error('Error details:', error.toString());
      throw error;
    }
  }

  /**
   * Create test users for integration tests
   */
  private async createTestUsers(): Promise<void> {
    try {
      console.log('👥 Creating test users...');
      
      if (!this.pool) {
        this.pool = new Pool({
          host: 'localhost',
          port: 5433,
          user: 'test_user',
          password: 'test_password',
          database: 'mes_test',
        });
      }

      const client = await this.pool.connect();
      
      try {
        // Create consistent test users with known UUIDs
        // These UUIDs must match the ones used in the integration tests
        const testUsers = [
          {
            id: 'edb93395-76c5-400f-a389-fd0c74ddf77e', // This is the testUserId from the test
            email: 'test@example.com',
            password: '$2b$10$placeholder.hash.for.testing',
            first_name: 'Test',
            last_name: 'User',
            is_verified: true
          },
          {
            id: 'f2a84c9b-8e7f-4d6c-9b2a-1e3f4a5b6c7d', // This will be otherUserId
            email: 'other@example.com', 
            password: '$2b$10$placeholder.hash.for.testing',
            first_name: 'Other',
            last_name: 'User',
            is_verified: true
          }
        ];

        for (const user of testUsers) {
          await client.query(`
            INSERT INTO users (id, email, password, first_name, last_name, is_verified, _created, _updated)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (email) DO UPDATE SET
              id = EXCLUDED.id,
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              is_verified = EXCLUDED.is_verified,
              _updated = NOW()
          `, [user.id, user.email, user.password, user.first_name, user.last_name, user.is_verified]);
        }

        // Verify users were actually created
        const verifyResult = await client.query('SELECT id, email FROM users ORDER BY email');
        console.log('✅ Test users created:', verifyResult.rows);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Failed to create test users:', error);
      throw error;
    }
  }
}
