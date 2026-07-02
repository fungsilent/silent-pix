// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig(
    {
        ignores: [
            '**/dist/**',
            '**/.vite/**',
            '**/.turbo/**',
            '**/node_modules/**',
            'eslint.config.mjs',
            'pnpm-lock.yaml',
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,

    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                projectService: {
                    allowDefaultProject: [
                        'apps/web/vite.config.ts',
                        'packages/db/drizzle.config.ts',
                    ],
                },
                tsconfigRootDir: process.cwd(),
            },
        },
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            /**
             * TypeScript
             */
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],

            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    prefer: 'type-imports',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',

            /**
             * Base style
             */
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
            '@stylistic/quotes': ['error', 'single'],
            '@stylistic/semi': ['error', 'never'],

            /**
             * Spacing
             */
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/no-multi-spaces': 'error',
            '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
            '@stylistic/space-before-blocks': 'error',
            '@stylistic/space-infix-ops': 'error',

            /**
             * Variable / object / array
             */
            '@stylistic/object-curly-spacing': ['error', 'always'],
            '@stylistic/array-bracket-spacing': ['error', 'never'],
            '@stylistic/comma-spacing': ['error', { before: false, after: true }],
            '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],

            /**
             * Function
             */
            '@stylistic/space-before-function-paren': ['error', 'never'],
            '@stylistic/arrow-parens': ['error', 'as-needed'],
            '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
        },
    },

    {
        files: ['apps/web/**/*.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },

    {
        files: ['apps/server/**/*.ts', 'apps/desktop/**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
)
