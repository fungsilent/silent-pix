import { randomUUID } from 'node:crypto'

import type { ComfyPrompt } from '#/lib/comfy/comfy.prompt'

export type ComfyImage = {
    filename: string
    subfolder: string
    type: string
}

export type ComfyHistory = {
    outputs?: Record<string, {
        images?: ComfyImage[]
    }>
}

type ComfyPromptResponse = {
    prompt_id?: string
    error?: unknown
    node_errors?: unknown
}

type ComfyHistoryResponse = Record<string, ComfyHistory>

type ExecuteCallbacks = {
    onPromptCreated?: (promptId: string) => Promise<void>
    onRunning?: (promptId: string) => Promise<void>
}

type PendingExecution = {
    callbacks: ExecuteCallbacks
    resolve: (history: ComfyHistory) => void
    reject: (error: ComfyError) => void
    timeout: ReturnType<typeof setTimeout>
}

type ConnectionWaiter = {
    resolve: () => void
    reject: (error: ComfyError) => void
    timeout: ReturnType<typeof setTimeout>
}

const connectionTimeoutMs = 10_000
const executionTimeoutMs = 30 * 60 * 1000
const maximumReconnectDelayMs = 30_000

export class ComfyError extends Error {
    constructor(
        message: string,
        readonly code = 'COMFY_ERROR',
    ) {
        super(message)
        this.name = 'ComfyError'
    }
}

export class ComfyClient {
    private readonly baseUrl: URL
    private readonly clientId = randomUUID()
    private readonly pendingExecutions = new Map<string, PendingExecution>()
    private readonly connectionWaiters = new Set<ConnectionWaiter>()
    private socket: WebSocket | undefined
    private reconnectTimer: ReturnType<typeof setTimeout> | undefined
    private reconnectAttempt = 0
    private connecting = false
    private started = false

    constructor(baseUrl: string) {
        this.baseUrl = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
    }

    start(): void {
        if (this.started) return

        this.started = true
        this.openSocket()
    }

    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN
    }

    async execute(
        prompt: ComfyPrompt,
        callbacks: ExecuteCallbacks = {},
    ): Promise<{ promptId: string, history: ComfyHistory }> {
        await this.waitForConnection()

        const promptId = randomUUID()
        const completion = this.createPendingExecution(promptId, callbacks)
        void completion.catch(() => undefined)

        try {
            await this.submitPrompt(promptId, prompt)
            await callbacks.onPromptCreated?.(promptId)
            const history = await completion

            return { promptId, history }
        }
        catch (error) {
            this.rejectExecution(promptId, toComfyError(error))
            throw error
        }
    }

    async downloadImage(image: ComfyImage): Promise<Uint8Array> {
        const url = new URL('view', this.baseUrl)
        url.search = new URLSearchParams({
            filename: image.filename,
            subfolder: image.subfolder,
            type: image.type,
        }).toString()

        const response = await fetch(url)

        if (!response.ok) {
            throw new ComfyError(
                `Comfy image returned HTTP ${response.status}.`,
                'COMFY_IMAGE_ERROR',
            )
        }

        return new Uint8Array(await response.arrayBuffer())
    }

    async getSamplerNames(): Promise<string[]> {
        const response = await fetch(new URL('object_info/KSampler', this.baseUrl))
        const body = await readJson<unknown>(response)

        if (!response.ok) {
            throw new ComfyError(
                `Comfy object info returned HTTP ${response.status}.`,
                'COMFY_OBJECT_INFO_ERROR',
            )
        }

        const names = readSamplerNames(body)
        if (!names) {
            throw new ComfyError(
                'Comfy KSampler object info does not contain sampler options.',
                'COMFY_OBJECT_INFO_INVALID',
            )
        }

        return names
    }

    async getLoraNames(): Promise<string[]> {
        let response: Response

        try {
            response = await fetch(new URL('models/loras', this.baseUrl))
        }
        catch {
            throw new ComfyError(
                'Unable to load the Comfy LoRA catalog.',
                'COMFY_LORA_LIST_ERROR',
            )
        }

        let body: unknown
        try {
            body = await readJson<unknown>(response)
        }
        catch {
            if (!response.ok) {
                throw new ComfyError(
                    `Comfy LoRA list returned HTTP ${response.status}.`,
                    'COMFY_LORA_LIST_ERROR',
                )
            }

            throw new ComfyError(
                'Comfy LoRA list returned invalid JSON.',
                'COMFY_LORA_LIST_INVALID',
            )
        }

        if (!response.ok) {
            throw new ComfyError(
                `Comfy LoRA list returned HTTP ${response.status}.`,
                'COMFY_LORA_LIST_ERROR',
            )
        }

        if (!isStringArray(body)) {
            throw new ComfyError(
                'Comfy LoRA list has an invalid response shape.',
                'COMFY_LORA_LIST_INVALID',
            )
        }

        return body
    }

    close(): void {
        this.started = false
        this.connecting = false

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = undefined
        }

        const error = new ComfyError('Comfy client closed.', 'COMFY_CLIENT_CLOSED')

        for (const waiter of this.connectionWaiters) {
            clearTimeout(waiter.timeout)
            waiter.reject(error)
        }
        this.connectionWaiters.clear()

        for (const promptId of this.pendingExecutions.keys()) {
            this.rejectExecution(promptId, error)
        }

        const socket = this.socket
        this.socket = undefined
        socket?.close()
    }

    private openSocket(): void {
        if (!this.started || this.connecting || this.isConnected()) return

        this.connecting = true

        const url = new URL('ws', this.baseUrl)
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
        url.searchParams.set('clientId', this.clientId)

        const socket = new WebSocket(url)
        this.socket = socket

        socket.addEventListener('open', () => {
            if (this.socket !== socket) return

            this.connecting = false
            this.reconnectAttempt = 0
            this.resolveConnectionWaiters()
            void this.reconcilePendingExecutions()
        })

        socket.addEventListener('message', event => {
            if (this.socket !== socket || typeof event.data !== 'string') return
            void this.handleMessage(event.data)
        })

        socket.addEventListener('error', () => {
            socket.close()
        })

        socket.addEventListener('close', () => {
            if (this.socket !== socket) return

            this.socket = undefined
            this.connecting = false
            this.scheduleReconnect()
        })
    }

    private scheduleReconnect(): void {
        if (!this.started || this.reconnectTimer) return

        const delay = Math.min(
            1000 * 2 ** this.reconnectAttempt,
            maximumReconnectDelayMs,
        )
        this.reconnectAttempt += 1
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined
            this.openSocket()
        }, delay)
    }

    private waitForConnection(): Promise<void> {
        if (this.isConnected()) return Promise.resolve()

        this.start()

        return new Promise((resolve, reject) => {
            const waiter: ConnectionWaiter = {
                resolve,
                reject,
                timeout: setTimeout(() => {
                    this.connectionWaiters.delete(waiter)
                    reject(new ComfyError(
                        'ComfyUI is unavailable.',
                        'COMFY_UNAVAILABLE',
                    ))
                }, connectionTimeoutMs),
            }

            this.connectionWaiters.add(waiter)
        })
    }

    private resolveConnectionWaiters(): void {
        for (const waiter of this.connectionWaiters) {
            clearTimeout(waiter.timeout)
            waiter.resolve()
        }
        this.connectionWaiters.clear()
    }

    private createPendingExecution(
        promptId: string,
        callbacks: ExecuteCallbacks,
    ): Promise<ComfyHistory> {
        return new Promise((resolve, reject) => {
            const pending: PendingExecution = {
                callbacks,
                resolve,
                reject,
                timeout: setTimeout(() => {
                    this.rejectExecution(promptId, new ComfyError(
                        'Timed out while waiting for Comfy.',
                        'COMFY_TIMEOUT',
                    ))
                }, executionTimeoutMs),
            }

            this.pendingExecutions.set(promptId, pending)
        })
    }

    private resolveExecution(promptId: string, history: ComfyHistory): void {
        const pending = this.pendingExecutions.get(promptId)
        if (!pending) return

        clearTimeout(pending.timeout)
        this.pendingExecutions.delete(promptId)
        pending.resolve(history)
    }

    private rejectExecution(promptId: string, error: ComfyError): void {
        const pending = this.pendingExecutions.get(promptId)
        if (!pending) return

        clearTimeout(pending.timeout)
        this.pendingExecutions.delete(promptId)
        pending.reject(error)
    }

    private async handleMessage(value: string): Promise<void> {
        const message = parseJson<{
            type?: string
            data?: Record<string, unknown>
        }>(value)

        if (!message?.type || !message.data) return

        const promptId = typeof message.data.prompt_id === 'string'
            ? message.data.prompt_id
            : undefined
        if (!promptId) return

        const pending = this.pendingExecutions.get(promptId)
        if (!pending) return

        if (message.type === 'execution_start') {
            await pending.callbacks.onRunning?.(promptId)
            return
        }

        if (message.type === 'execution_error') {
            this.rejectExecution(promptId, new ComfyError(
                typeof message.data.exception_message === 'string'
                    ? message.data.exception_message
                    : 'Comfy execution failed.',
                'COMFY_EXECUTION_ERROR',
            ))
            return
        }

        if (message.type === 'execution_interrupted') {
            this.rejectExecution(promptId, new ComfyError(
                'Comfy execution was interrupted.',
                'COMFY_EXECUTION_INTERRUPTED',
            ))
            return
        }

        if (message.type === 'executing' && message.data.node === null) {
            void this.completeFromHistory(promptId, true)
        }
    }

    private async completeFromHistory(
        promptId: string,
        retryUntilAvailable = false,
    ): Promise<void> {
        const attempts = retryUntilAvailable ? 20 : 1

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            try {
                const history = await this.findHistory(promptId)

                if (history) {
                    this.resolveExecution(promptId, history)
                    return
                }
            }
            catch (error) {
                if (!retryUntilAvailable) return

                if (attempt === attempts - 1) {
                    this.rejectExecution(promptId, toComfyError(error))
                    return
                }
            }

            if (attempt < attempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

        if (retryUntilAvailable) {
            this.rejectExecution(promptId, new ComfyError(
                'Comfy history does not contain this prompt.',
                'COMFY_HISTORY_MISSING',
            ))
        }
    }

    private async reconcilePendingExecutions(): Promise<void> {
        await Promise.allSettled(
            [...this.pendingExecutions.keys()].map(promptId => (
                this.completeFromHistory(promptId)
            )),
        )
    }

    private async submitPrompt(promptId: string, prompt: ComfyPrompt): Promise<void> {
        const response = await fetch(new URL('prompt', this.baseUrl), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                prompt_id: promptId,
                client_id: this.clientId,
                prompt,
            }),
        })
        const body = await readJson<ComfyPromptResponse>(response)

        if (!response.ok || body.error) {
            throw new ComfyError(
                formatComfyError(body.error ?? body.node_errors ?? `Comfy prompt returned HTTP ${response.status}.`),
                'COMFY_PROMPT_ERROR',
            )
        }

        if (body.prompt_id && body.prompt_id !== promptId) {
            throw new ComfyError(
                'Comfy returned an unexpected prompt ID.',
                'COMFY_PROMPT_ID_ERROR',
            )
        }
    }

    private async findHistory(promptId: string): Promise<ComfyHistory | undefined> {
        const response = await fetch(
            new URL(`history/${encodeURIComponent(promptId)}`, this.baseUrl),
        )
        const body = await readJson<ComfyHistoryResponse>(response)

        if (!response.ok) {
            throw new ComfyError(
                `Comfy history returned HTTP ${response.status}.`,
                'COMFY_HISTORY_ERROR',
            )
        }

        return body[promptId]
    }
}

async function readJson<T>(response: Response): Promise<T> {
    try {
        return await response.json() as T
    }
    catch {
        throw new ComfyError('Comfy returned invalid JSON.', 'COMFY_INVALID_RESPONSE')
    }
}

function formatComfyError(value: unknown): string {
    if (typeof value === 'string') {
        return value
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value as Record<string, unknown>
        const message = typeof record.message === 'string' ? record.message : undefined
        const details = typeof record.details === 'string' ? record.details : undefined
        const type = typeof record.type === 'string' ? record.type : undefined
        const summary = [type, message, details].filter(Boolean).join(': ')

        if (summary) {
            return summary
        }
    }

    try {
        return JSON.stringify(value)
    }
    catch {
        return 'Comfy returned an unknown prompt error.'
    }
}

function readSamplerNames(value: unknown): string[] | undefined {
    if (!isRecord(value)) return undefined

    const kSampler = value.KSampler
    if (!isRecord(kSampler) || !isRecord(kSampler.input) || !isRecord(kSampler.input.required)) {
        return undefined
    }

    const samplerName = kSampler.input.required.sampler_name
    if (!Array.isArray(samplerName) || !Array.isArray(samplerName[0])) {
        return undefined
    }

    const names = samplerName[0].filter((name): name is string => typeof name === 'string')
    return names.length ? names : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function parseJson<T>(value: string): T | undefined {
    try {
        return JSON.parse(value) as T
    }
    catch {
        return undefined
    }
}

function toComfyError(error: unknown): ComfyError {
    return error instanceof ComfyError
        ? error
        : new ComfyError(
            error instanceof Error ? error.message : 'Unknown Comfy error.',
        )
}
