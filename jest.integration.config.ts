import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';

const config: Config = {
    displayName: 'Integration Tests',
    preset: 'ts-jest',
    testEnvironment: 'node',

    // Test file patterns
    testMatch: ['<rootDir>/src/**/*.integration.spec.ts'],

    // Module resolution
    moduleNameMapper: pathsToModuleNameMapper(
        {
            '@/*': ['src/*'],
        },
        {
            prefix: '<rootDir>/',
        },
    ),

    // Setup and teardown
    globalSetup: '<rootDir>/test/jest-integration.setup.ts',
    globalTeardown: '<rootDir>/test/jest-integration.setup.ts',

    // Each test file gets a fresh database state
    setupFilesAfterEnv: ['<rootDir>/test/jest-integration-per-test.setup.ts'],

    // Test timeout (Docker startup can be slow)
    testTimeout: 60000,

    // Coverage
    collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.spec.ts', '!src/**/*.test.ts', '!src/**/*.d.ts', '!src/main.ts'],

    // Environment variables for test database
    setupFiles: ['<rootDir>/test/jest-integration.env.ts'],

    // Run tests serially to avoid database conflicts
    maxWorkers: 1,

    // Verbose output for debugging
    verbose: true,
};

export default config;
