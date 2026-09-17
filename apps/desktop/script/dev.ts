import { spawn } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'

const desktopRoot = process.cwd()
const configPath = resolve(desktopRoot, 'tauri.conf.json')

if (!existsSync(configPath)) {
    process.stderr.write(`Tauri config not found: ${configPath}\n`)
    process.exit(1)
}

let sourceDesktopRoot: string

try {
    sourceDesktopRoot = dirname(realpathSync(configPath))
}
catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Unable to resolve Tauri config ${configPath}: ${detail}\n`)
    process.exit(1)
}

const repoRoot = resolve(sourceDesktopRoot, '..', '..')
const envPath = resolve(repoRoot, '.env')

if (existsSync(envPath)) {
    process.loadEnvFile(envPath)
}

function requireEnv(name: string): string {
    const value = process.env[name]

    if (!value || value.trim() === '') {
        process.stderr.write(`${name} must be set in the process environment or ${envPath}\n`)
        process.exit(1)
    }

    return value.trim()
}

function parsePort(name: string, value: string): number {
    if (!/^\d+$/.test(value)) {
        process.stderr.write(`${name} must be an integer between 1 and 65535\n`)
        process.exit(1)
    }

    const port = Number(value)

    if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
        process.stderr.write(`${name} must be an integer between 1 and 65535\n`)
        process.exit(1)
    }

    return port
}

function formatHost(host: string): string {
    if (/[\s/?#@]/.test(host)) {
        process.stderr.write('WEB_HOST must be a valid hostname or IPv6 address\n')
        process.exit(1)
    }

    if (host.startsWith('[') || host.includes(':')) {
        if (host.startsWith('[') && !host.endsWith(']')) {
            process.stderr.write('WEB_HOST must be a valid hostname or IPv6 address\n')
            process.exit(1)
        }

        return host.startsWith('[') ? host : `[${host}]`
    }

    return host
}

const webHost = formatHost(requireEnv('WEB_HOST'))
const webPort = parsePort('WEB_PORT', requireEnv('WEB_PORT'))
const tauriDevUrl = `http://${webHost}:${webPort}`

try {
    const parsedTauriDevUrl = new URL(tauriDevUrl)

    if (
        parsedTauriDevUrl.protocol !== 'http:'
        || parsedTauriDevUrl.username
        || parsedTauriDevUrl.password
        || parsedTauriDevUrl.pathname !== '/'
        || parsedTauriDevUrl.search
        || parsedTauriDevUrl.hash
    ) {
        throw new Error()
    }
}
catch {
    process.stderr.write('WEB_HOST and WEB_PORT must combine into a valid HTTP origin\n')
    process.exit(1)
}

const externalFrontend = process.argv.includes('--external-frontend')
const forwardedArgs = process.argv.slice(2).filter(argument => argument !== '--external-frontend')
const configOverride = {
    build: {
        devUrl: tauriDevUrl,
        ...(externalFrontend ? { beforeDevCommand: '' } : {}),
    },
}
const tauriCliPath = resolve(desktopRoot, 'node_modules', '@tauri-apps', 'cli', 'tauri.js')

if (!existsSync(tauriCliPath)) {
    process.stderr.write(`Tauri CLI not found: ${tauriCliPath}\nRun pnpm install in ${desktopRoot}\n`)
    process.exit(1)
}

const tauriArgs = [
    tauriCliPath,
    'dev',
    '--config',
    JSON.stringify(configOverride),
    ...forwardedArgs,
]
const child = spawn(process.execPath, tauriArgs, {
    cwd: desktopRoot,
    env: process.env,
    stdio: 'inherit',
})

child.on('error', error => {
    process.stderr.write(`Failed to start Tauri: ${error.message}\n`)
    process.exitCode = 1
})

child.on('close', (code, signal) => {
    if (signal) {
        process.stderr.write(`Tauri exited after signal ${signal}\n`)
    }

    process.exitCode = code ?? 1
})
