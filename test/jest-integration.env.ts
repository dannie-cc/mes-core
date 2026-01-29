// Set environment variables for integration tests
process.env.NODE_ENV = 'test';

// Override production database settings with test database settings
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5433';
process.env.POSTGRES_USER = 'test_user';
process.env.POSTGRES_PASSWORD = 'test_password';
process.env.POSTGRES_DB = 'mes_test';

// Also set test-specific variables (for reference)
process.env.TEST_DB_HOST = 'localhost';
process.env.TEST_DB_PORT = '5433';
process.env.TEST_DB_USERNAME = 'test_user';
process.env.TEST_DB_PASSWORD = 'test_password';
process.env.TEST_DB_NAME = 'mes_test';
