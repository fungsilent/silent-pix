// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin'
import perfectionist from 'eslint-plugin-perfectionist'

export default defineConfig(
    {
        ignores: [
            '**/dist/**',
            '**/.vite/**',
            '**/.turbo/**',
            '**/node_modules/**',
            'apps/server/src/archive/**',
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
            'perfectionist': perfectionist,
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
            '@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
            '@stylistic/array-bracket-spacing': ['error', 'never'],
            '@stylistic/comma-spacing': ['error', { before: false, after: true }],
            '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],

            /**
             * Function
             */
            // '@stylistic/space-before-function-paren': ['error', 'never'],
            "@stylistic/space-before-function-paren": ["error", {
                "anonymous": "always",
                "named": "never",
                "asyncArrow": "always",
                "catch": "always"
            }],
            '@stylistic/arrow-parens': ['error', 'as-needed'],
            '@stylistic/arrow-spacing': ['error', { before: true, after: true }],

            /**
             * Import / Export
             */
            'perfectionist/sort-imports': [
                'error',
                {
                    type: 'alphabetical',
                    order: 'asc',
                    ignoreCase: true,
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        ['parent', 'sibling', 'index'],
                        'side-effect',
                        'unknown',
                        'type',
                    ],
                    'newlinesBetween': 1,
                }
            ],
            'perfectionist/sort-named-imports': [
                'error',
                {
                    type: 'alphabetical',
                    order: 'asc',
                    ignoreCase: true
                }
            ],

            /**
             * JSX
             */
            '@stylistic/jsx-quotes': ['error', 'prefer-single'],
            '@stylistic/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
            '@stylistic/jsx-max-props-per-line': [
                'error',
                {
                    maximum: {
                        single: 1,
                        multi: 1,
                    },
                },
            ],
            '@stylistic/jsx-indent-props': ['error', 4],
            '@stylistic/jsx-closing-bracket-location': ['error', 'tag-aligned'],
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

