/**
 * Jest E2E Test Setup
 * This file runs before each E2E test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/mes_test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Increase timeout for E2E tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
    // Add any global setup logic here
    console.log('🚀 Starting E2E Test Suite');
});

afterAll(async () => {
    // Add any global cleanup logic here
    console.log('✅ E2E Test Suite Complete');
});
