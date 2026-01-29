import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import eslintNestJs from '@darraghor/eslint-plugin-nestjs-typed';
import preferOkResponse from './src/common/eslint-rules/prefer-ok-response.js';
import noRawPermission from './src/common/eslint-rules/no-raw-permission.js';
import validatePermissions from './src/common/eslint-rules/validate-permissions.js';

export default [
    js.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                ecmaVersion: 2022,
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
                NodeJS: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'eslint-plugin-nestjs-typed': eslintNestJs,
            custom: {
                rules: {
                    'prefer-ok-response': preferOkResponse,
                    'no-raw-permission': noRawPermission,
                    'validate-permissions': validatePermissions,
                },
            },
        },
        rules: {
            // Spread recommended rules safely
            ...tseslint.configs.recommended.rules,

            'no-console': ['warn', { allow: ['warn', 'error', 'info', 'count', 'time', 'table'] }],
            'no-unused-vars': 'off',
            'no-redeclare': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    args: 'after-used',
                    ignoreRestSiblings: false,
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-expressions': [
                'warn',
                {
                    allowTaggedTemplates: true,
                },
            ],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/promise-function-async': 'error',
            'no-void': ['error', { allowAsStatement: true }],
            'custom/prefer-ok-response': 'warn',
            'custom/no-raw-permission': 'error',
            'custom/validate-permissions': 'error',
        },
    },

    // Controller specific rules
    {
        files: ['**/*.controller.ts'],
        rules: {
            'custom/prefer-ok-response': 'warn',
        },
    },

    // Test files (unit/integration/e2e) – use test tsconfig and jest globals
    {
        files: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'test/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.test.json',
                ecmaVersion: 2022,
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            // Tests may log intentionally
            'no-console': ['warn', { allow: ['warn', 'error', 'info', 'count', 'time', 'table', 'log'] }],
        },
    },

    // Global ignores
    {
        ignores: ['dist/**', 'node_modules/**', 'scripts/**', 'eslint-rules/**', 'lib/*', '*.config.*'],
    },
];
