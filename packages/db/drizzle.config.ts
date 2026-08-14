/// <reference types="node" />

import { defineConfig } from 'drizzle-kit'

import { loadConfig } from '#/config'

const env = loadConfig()

export default defineConfig({
    schema: './src/schema/schema.export.ts',
    out: './migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: env.databasePath,
    },
})
