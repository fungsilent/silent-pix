/// <reference types="node" />

import { isAbsolute, resolve } from 'node:path'

import { defineConfig } from 'drizzle-kit'

const databasePath = process.env.DATABASE_PATH ?? './.local/data/silent-pix.sqlite'

export default defineConfig({
    schema: './src/schema.ts',
    out: './migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: isAbsolute(databasePath)
            ? databasePath
            : resolve(process.cwd(), databasePath),
    },
})
