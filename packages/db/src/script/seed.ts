import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { eq } from 'drizzle-orm'

import { createDatabaseClient } from '#/client'
import { loadConfig } from '#/config'
import { workflows } from '#/schema/schema.export'
import { assertUUID } from '#/uuid'

import type { ConfigSchema, JsonObject, } from '#/schema/schema.export'
import type { UUID } from '#/uuid'

const config = loadConfig()
const seedRoot = resolve(config.packageRoot, 'seed', 'workflows')

type WorkflowSeed = {
    id: UUID
    name: string
    graph: JsonObject
    configSchema: ConfigSchema
}

function readJson(path: string): unknown {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readWorkflow(directoryName: string): WorkflowSeed {
    const directory = resolve(seedRoot, directoryName)
    const metadata = readJson(resolve(directory, 'metadata.json'))
    const graph = readJson(resolve(directory, 'graph.json'))
    const rawConfigSchema = readJson(resolve(directory, 'config-schema.json'))

    if (!isRecord(metadata) || typeof metadata.id !== 'string' || typeof metadata.name !== 'string') {
        throw new Error(`Invalid workflow metadata: ${directory}`)
    }

    assertUUID(metadata.id, `${directory}/metadata.json.id`)

    if (!isRecord(graph)) {
        throw new Error(`Workflow graph must be an object: ${directory}/graph.json`)
    }

    if (!isRecord(rawConfigSchema)) {
        throw new Error(`Config schema must be an object: ${directory}/config-schema.json`)
    }

    const configSchema: ConfigSchema = {}

    for (const [key, mapping] of Object.entries(rawConfigSchema)) {
        if (!isRecord(mapping) || typeof mapping.nodeId !== 'string' || typeof mapping.input !== 'string') {
            throw new Error(`Invalid config mapping: ${directory}/config-schema.json.${key}`)
        }

        configSchema[key] = {
            nodeId: mapping.nodeId,
            input: mapping.input,
        }
    }

    return {
        id: metadata.id,
        name: metadata.name,
        graph,
        configSchema,
    }
}

const database = createDatabaseClient(config.databasePath)

try {
    const workflowDirectories = readdirSync(seedRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort()
    const workflowsToSeed = workflowDirectories.map(readWorkflow)
    const now = Date.now()

    database.db.transaction(transaction => {
        for (const workflow of workflowsToSeed) {
            const existing = transaction.select({ id: workflows.id }).from(workflows)
                .where(eq(workflows.id, workflow.id))
                .get()

            if (existing) {
                console.log(`Skipped workflow ${workflow.id}: already exists.`)
                continue
            }

            transaction.insert(workflows).values({
                id: workflow.id,
                name: workflow.name,
                graph: workflow.graph,
                configSchema: workflow.configSchema,
                createdAt: now,
                updatedAt: now,
            }).run()

            console.log(`Seeded workflow ${workflow.name} (${workflow.id}).`)
        }
    })
} finally {
    database.close()
}
