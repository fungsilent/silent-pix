/// <reference types="node" />

import { defineConfig } from 'drizzle-kit'

import { loadEnv } from '#/config/env'

const env = loadEnv()

export default defineConfig({
    schema: './src/schema/schema.export.ts',
    out: './migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: env.databasePath,
    },
})
