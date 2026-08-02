/// <reference types="node" />

import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'drizzle-kit'

const packageRoot = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(packageRoot, '..', '..')
const configuredPath = process.env.DATABASE_PATH ?? './.local/data/silent-pix.sqlite'
const databasePath = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(repoRoot, configuredPath)

export default defineConfig({
    schema: resolve(packageRoot, 'src/schema.ts'),
    out: resolve(packageRoot, 'migrations'),
    dialect: 'sqlite',
    dbCredentials: {
        url: databasePath,
    },
})