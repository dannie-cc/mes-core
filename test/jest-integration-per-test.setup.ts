import { TestDatabaseManager } from './test-database.manager';

// This runs before each test file to clean the database
beforeEach(async () => {
    const dbManager = (global as any).testDatabaseManager as TestDatabaseManager;

    if (dbManager) {
        try {
            await dbManager.cleanTestData();
        } catch (error) {
            console.warn('Warning: Failed to clean test data:', error);
        }
    }
});
