import type { Config } from 'jest';

const config: Config = {
    displayName: 'E2E Tests',
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testEnvironment: 'node',
    testRegex: '.*\\.e2e\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: ['src/**/*.(t|j)s', '!src/**/*.spec.ts', '!src/**/*.e2e.spec.ts'],
    coverageDirectory: './coverage/e2e',
    testTimeout: 30000, // E2E tests may take longer
    setupFilesAfterEnv: ['<rootDir>/test/jest-e2e.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    verbose: true,
    // Run E2E tests sequentially to avoid database conflicts
    maxWorkers: 1,
    // Fail fast on first test failure for quicker feedback
    bail: 1,
};

export default config;
