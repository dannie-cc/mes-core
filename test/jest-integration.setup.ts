import { TestDatabaseManager } from './test-database.manager';

// Global test setup - runs once before all tests
export default async function setupIntegrationTests() {
    console.log('🚀 Setting up integration tests...');

    const dbManager = TestDatabaseManager.getInstance();

    try {
        await dbManager.startTestDatabase();

        // Store the manager instance globally so we can access it in teardown
        (global as any).testDatabaseManager = dbManager;

        console.log('✅ Integration test setup complete');
    } catch (error) {
        console.error('❌ Integration test setup failed:', error);
        process.exit(1);
    }
}

// Global test teardown - runs once after all tests
export async function teardownIntegrationTests() {
    console.log('🧹 Tearing down integration tests...');

    const dbManager = (global as any).testDatabaseManager as TestDatabaseManager;

    if (dbManager) {
        try {
            await dbManager.stopTestDatabase();
            console.log('✅ Integration test teardown complete');
        } catch (error) {
            console.error('❌ Integration test teardown failed:', error);
        }
    }
}
