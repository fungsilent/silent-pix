import { randomUUID } from 'node:crypto'

import { z } from 'zod'

import { loadConfig } from '#/config'

import type { ComfyPrompt } from '#/lib/comfy/comfy.prompt'

const comfyImage = z.object({
    filename: z.string(),
    subfolder: z.string(),
    type: z.string(),
}).loose()

const comfyHistory = z.object({
    outputs: z.record(
        z.string(),
        z.object({
            images: z.array(comfyImage).optional(),
        }).loose(),
    ).optional(),
}).loose()

const comfyHistoryResponse = z.record(z.string(), comfyHistory)

const comfyPromptResponse = z.object({
    prompt_id: z.string().optional(),
    error: z.unknown().optional(),
    node_errors: z.unknown().optional(),
}).loose().refine(value => (
    value.prompt_id !== undefined || value.error !== undefined
))

const comfyPromptId = z.string().min(1)

const comfyNodeOutput = z.object({
    images: z.array(comfyImage).optional(),
}).loose()

const comfyExecutionStart = z.object({
    type: z.literal('execution_start'),
    data: z.object({
        prompt_id: comfyPromptId,
    }).loose(),
}).loose()

const comfyExecuted = z.object({
    type: z.literal('executed'),
    data: z.object({
        node: z.string(),
        output: comfyNodeOutput,
        prompt_id: comfyPromptId,
    }).loose(),
}).loose()

const comfyExecutionSuccess = z.object({
    type: z.literal('execution_success'),
    data: z.object({
        prompt_id: comfyPromptId,
    }).loose(),
}).loose()

const comfyExecutionError = z.object({
    type: z.literal('execution_error'),
    data: z.object({
        exception_message: z.string().optional(),
        prompt_id: comfyPromptId,
    }).loose(),
}).loose()

const comfyExecutionInterrupted = z.object({
    type: z.literal('execution_interrupted'),
    data: z.object({
        prompt_id: comfyPromptId,
    }).loose(),
}).loose()

const comfyExecutionMessage = z.discriminatedUnion('type', [
    comfyExecutionStart,
    comfyExecuted,
    comfyExecutionSuccess,
    comfyExecutionError,
    comfyExecutionInterrupted,
])

export type ComfyImage = z.output<typeof comfyImage>
export type ComfyHistory = z.output<typeof comfyHistory>
export type ComfyNodeOutput = z.output<typeof comfyNodeOutput>
export type ComfyExecutionResult = {
    promptId: string
    outputs: Record<string, ComfyNodeOutput>
}

export type ExecuteCallbacks = {
    onAccepted?: (promptId: string) => void | Promise<void>
    onRunning?: (promptId: string) => void | Promise<void>
    onCompleted: (result: ComfyExecutionResult) => void | Promise<void>
    onFailed: (error: ComfyError) => void | Promise<void>
}

type TerminalEvent =
    | { type: 'completed', result: ComfyExecutionResult }
    | { type: 'failed', error: ComfyError }

type PendingExecution = {
    promptId: string
    callbacks: ExecuteCallbacks
    outputs: Record<string, ComfyNodeOutput>
    promptAccepted: boolean
    runningSeen: boolean
    terminalEvent: TerminalEvent | undefined
    needsHistoryRecovery: boolean
    recoveryRunning: boolean
    recoveryRetryUntilAvailable: boolean
    timeout: ReturnType<typeof setTimeout>
}

type ConnectionWaiter = {
    resolve: () => void
    reject: (error: ComfyError) => void
    timeout: ReturnType<typeof setTimeout>
}

const connectionTimeoutMs = 10_000
const executionTimeoutMs = 30 * 60 * 1000
/*
 * 偵測 ComfyUI 死亡是即時的（RST 直接觸發 close），
 * 但偵測復活受限於這個退避上限——30 秒對本機工具太久。
 */
const maximumReconnectDelayMs = 5_000
/*
 * 選項清單是互動路徑，使用者在等。
 * 這個 timeout 只是「socket 還開著但 HTTP 卡住」的保底——
 * ComfyUI 真的掛掉時 assertConnected 會先擋下來，根本不會走到 fetch。
 */
const optionRequestTimeoutMs = 5_000

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
    private statusListener: ((connected: boolean) => void) | undefined
    private lastNotifiedStatus: boolean | undefined

    constructor() {
        const { comfyuiBaseUrl } = loadConfig()
        this.baseUrl = new URL(comfyuiBaseUrl.endsWith('/') ? comfyuiBaseUrl : `${comfyuiBaseUrl}/`)
    }

    /* socket 狀態一翻就通知，這是 health 能即時反應的來源 */
    onStatusChange(listener: (connected: boolean) => void): void {
        this.statusListener = listener
    }

    private notifyStatus(connected: boolean): void {
        if (this.lastNotifiedStatus === connected) {
            return
        }

        this.lastNotifiedStatus = connected
        this.statusListener?.(connected)
    }

    start(): void {
        if (this.started) return

        this.started = true
        this.openSocket()
    }

    isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN
    }

    private assertConnected(): void {
        if (!this.isConnected()) {
            throw new ComfyError(
                'ComfyUI is unavailable.',
                'COMFY_UNAVAILABLE',
            )
        }
    }

    execute(
        prompt: ComfyPrompt,
        callbacks: ExecuteCallbacks,
    ): void {
        void this.startExecution(prompt, callbacks).catch(error => {
            /* No pending prompt exists for failures before POST submission. */
            this.dispatchCallback(
                callbacks.onFailed,
                [toComfyError(error)],
                'onFailed',
            )
        })
    }

    private async startExecution(
        prompt: ComfyPrompt,
        callbacks: ExecuteCallbacks,
    ): Promise<void> {
        try {
            await this.waitForConnection()
        }
        catch (error) {
            this.dispatchCallback(
                callbacks.onFailed,
                [toComfyError(error)],
                'onFailed',
            )
            return
        }

        const promptId = randomUUID()
        const execution = this.createExecution(promptId, callbacks)

        try {
            await this.submitPrompt(promptId, prompt)
        }
        catch (error) {
            const promptError = toComfyError(error)
            const acceptedByWebSocket = (
                promptError.code === 'COMFY_PROMPT_TRANSPORT'
                && hasWebSocketEvidence(execution)
            )

            if (!acceptedByWebSocket) {
                this.claimFailure(execution, promptError)
                return
            }
        }

        this.acceptExecution(execution)
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

    async deleteHistory(promptId: string): Promise<void> {
        let response: Response

        try {
            response = await fetch(new URL('history', this.baseUrl), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    delete: [promptId],
                }),
            })
        }
        catch {
            throw new ComfyError(
                'ComfyUI is unavailable.',
                'COMFY_UNAVAILABLE',
            )
        }

        if (!response.ok) {
            throw new ComfyError(
                `Comfy history deletion returned HTTP ${response.status}.`,
                'COMFY_HISTORY_DELETE_ERROR',
            )
        }
    }

    async getSamplerNames(): Promise<string[]> {
        this.assertConnected()

        let response: Response

        try {
            response = await fetch(new URL('object_info/KSampler', this.baseUrl), {
                signal: AbortSignal.timeout(optionRequestTimeoutMs),
            })
        }
        catch {
            throw new ComfyError(
                'ComfyUI is unavailable.',
                'COMFY_UNAVAILABLE',
            )
        }

        const body = await readJson(response)

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
        this.assertConnected()

        let response: Response

        try {
            response = await fetch(new URL('models/loras', this.baseUrl), {
                signal: AbortSignal.timeout(optionRequestTimeoutMs),
            })
        }
        catch {
            throw new ComfyError(
                'ComfyUI is unavailable.',
                'COMFY_UNAVAILABLE',
            )
        }

        let body: unknown
        try {
            body = await readJson(response)
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

        for (const execution of this.pendingExecutions.values()) {
            this.claimFailure(execution, error)
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
            this.notifyStatus(true)
            this.resolveConnectionWaiters()
            this.reconcileExecutions()
        })

        socket.addEventListener('message', event => {
            if (this.socket !== socket || typeof event.data !== 'string') return
            try {
                this.handleMessage(event.data)
            }
            catch (error) {
                console.error('Failed to handle Comfy execution message.', error)
            }
        })

        socket.addEventListener('error', () => {
            socket.close()
        })

        socket.addEventListener('close', () => {
            if (this.socket !== socket) return

            this.socket = undefined
            this.connecting = false
            this.markExecutionsForRecovery()
            this.notifyStatus(false)
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

    private createExecution(
        promptId: string,
        callbacks: ExecuteCallbacks,
    ): PendingExecution {
        const execution: PendingExecution = {
            promptId,
            callbacks,
            outputs: {},
            needsHistoryRecovery: !this.isConnected(),
            promptAccepted: false,
            runningSeen: false,
            terminalEvent: undefined,
            recoveryRunning: false,
            recoveryRetryUntilAvailable: false,
            timeout: setTimeout(() => {
                this.claimFailure(execution, new ComfyError(
                    'Timed out while waiting for Comfy.',
                    'COMFY_TIMEOUT',
                ))
            }, executionTimeoutMs),
        }

        this.pendingExecutions.set(promptId, execution)
        return execution
    }

    private markExecutionsForRecovery(): void {
        for (const execution of this.pendingExecutions.values()) {
            execution.needsHistoryRecovery = true
            if (execution.terminalEvent?.type === 'completed') {
                this.startHistoryRecovery(execution, true)
            }
        }
    }

    private acceptExecution(execution: PendingExecution): void {
        if (this.pendingExecutions.get(execution.promptId) !== execution) return
        if (execution.promptAccepted) return

        execution.promptAccepted = true
        this.dispatchCallback(
            execution.callbacks.onAccepted,
            [execution.promptId],
            'onAccepted',
        )

        if (execution.runningSeen) {
            this.dispatchCallback(
                execution.callbacks.onRunning,
                [execution.promptId],
                'onRunning',
            )
        }

        if (execution.terminalEvent?.type === 'completed' && execution.needsHistoryRecovery) {
            this.startHistoryRecovery(execution, true)
            return
        }

        this.dispatchTerminal(execution)
    }

    private dispatchTerminal(execution: PendingExecution): void {
        const terminal = execution.terminalEvent
        if (
            !terminal
            || (terminal.type === 'completed' && !execution.promptAccepted)
            || (
                terminal.type === 'completed'
                && execution.needsHistoryRecovery
            )
            || this.pendingExecutions.get(execution.promptId) !== execution
        ) {
            return
        }

        clearTimeout(execution.timeout)
        this.pendingExecutions.delete(execution.promptId)

        if (terminal.type === 'completed') {
            this.dispatchCallback(
                execution.callbacks.onCompleted,
                [terminal.result],
                'onCompleted',
            )
        }
        else {
            this.dispatchCallback(
                execution.callbacks.onFailed,
                [terminal.error],
                'onFailed',
            )
        }
    }

    private claimFailure(execution: PendingExecution, error: ComfyError): void {
        if (this.pendingExecutions.get(execution.promptId) !== execution) return
        if (execution.terminalEvent?.type === 'failed') return

        /* A REST rejection or recovery error may replace an undelivered success. */
        execution.terminalEvent = { type: 'failed', error }
        execution.needsHistoryRecovery = false
        execution.recoveryRunning = false
        this.dispatchTerminal(execution)
    }

    private dispatchCallback<Args extends unknown[]>(
        callback: ((...args: Args) => void | Promise<void>) | undefined,
        args: Args,
        name: string,
    ): void {
        if (!callback) return

        try {
            const result = callback(...args)
            if (isThenable(result)) {
                void Promise.resolve(result).catch(error => {
                    this.reportCallbackError(name, error)
                })
            }
        }
        catch (error) {
            this.reportCallbackError(name, error)
        }
    }

    private reportCallbackError(name: string, error: unknown): void {
        console.error(`Comfy ${name} callback failed.`, error)
    }

    private handleMessage(value: string): void {
        const parsed = comfyExecutionMessage.safeParse(parseJson(value))
        if (!parsed.success) return

        const message = parsed.data
        const promptId = message.data.prompt_id

        const execution = this.pendingExecutions.get(promptId)
        if (!execution) return
        if (execution.terminalEvent) return

        switch (message.type) {
            case 'execution_start':
                if (execution.runningSeen) return
                execution.runningSeen = true
                if (execution.promptAccepted) {
                    this.dispatchCallback(
                        execution.callbacks.onRunning,
                        [promptId],
                        'onRunning',
                    )
                }
                return
            case 'executed':
                execution.outputs[message.data.node] = message.data.output
                return
            case 'execution_error':
                this.claimWebSocketFailure(execution, new ComfyError(
                    message.data.exception_message ?? 'Comfy execution failed.',
                    'COMFY_EXECUTION_ERROR',
                ))
                return
            case 'execution_interrupted':
                this.claimWebSocketFailure(execution, new ComfyError(
                    'Comfy execution was interrupted.',
                    'COMFY_EXECUTION_INTERRUPTED',
                ))
                return
            case 'execution_success':
                this.markExecutionTerminal(promptId)
                return
        }
    }

    private markExecutionTerminal(promptId: string): void {
        const execution = this.pendingExecutions.get(promptId)
        if (!execution || execution.terminalEvent) return

        execution.terminalEvent = {
            type: 'completed',
            result: {
                promptId,
                outputs: execution.outputs,
            },
        }

        if (execution.needsHistoryRecovery) {
            this.startHistoryRecovery(execution, true)
            return
        }

        this.dispatchTerminal(execution)
    }

    private claimWebSocketFailure(execution: PendingExecution, error: ComfyError): void {
        if (this.pendingExecutions.get(execution.promptId) !== execution) return
        if (execution.terminalEvent) return

        execution.terminalEvent = { type: 'failed', error }
        execution.needsHistoryRecovery = false

        /* WS execution failure proves acceptance even when REST has not replied. */
        if (!execution.promptAccepted) {
            this.acceptExecution(execution)
            return
        }

        this.dispatchTerminal(execution)
    }

    private startHistoryRecovery(
        execution: PendingExecution,
        retryUntilAvailable: boolean,
    ): void {
        if (
            this.pendingExecutions.get(execution.promptId) !== execution
            || !execution.needsHistoryRecovery
        ) {
            return
        }

        if (retryUntilAvailable) {
            execution.recoveryRetryUntilAvailable = true
        }
        if (execution.recoveryRunning) return

        execution.recoveryRunning = true
        void this.completeFromHistory(execution).catch(error => {
            execution.recoveryRunning = false
            this.claimFailure(execution, toComfyError(error))
        })
    }

    private async completeFromHistory(execution: PendingExecution): Promise<void> {
        let attempts = execution.recoveryRetryUntilAvailable ? 20 : 1

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            if (this.pendingExecutions.get(execution.promptId) !== execution) {
                execution.recoveryRunning = false
                return
            }

            try {
                const history = await this.findHistory(execution.promptId)
                if (this.pendingExecutions.get(execution.promptId) !== execution) {
                    execution.recoveryRunning = false
                    return
                }

                if (history) {
                    execution.recoveryRunning = false
                    execution.needsHistoryRecovery = false

                    if (execution.terminalEvent?.type === 'failed') return

                    execution.terminalEvent = {
                        type: 'completed',
                        result: {
                            promptId: execution.promptId,
                            outputs: history.outputs ?? {},
                        },
                    }
                    this.acceptExecutionFromEvidence(execution)
                    this.dispatchTerminal(execution)
                    return
                }
            }
            catch (error) {
                if (this.pendingExecutions.get(execution.promptId) !== execution) {
                    execution.recoveryRunning = false
                    return
                }

                if (!execution.recoveryRetryUntilAvailable) {
                    execution.recoveryRunning = false
                    return
                }

                if (attempt === attempts - 1) {
                    execution.recoveryRunning = false
                    this.claimFailure(execution, toComfyError(error))
                    return
                }
            }

            if (execution.recoveryRetryUntilAvailable && attempts === 1) {
                attempts = 20
            }

            if (attempt < attempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

        execution.recoveryRunning = false
        if (execution.recoveryRetryUntilAvailable) {
            this.claimFailure(execution, new ComfyError(
                'Comfy history does not contain this prompt.',
                'COMFY_HISTORY_MISSING',
            ))
        }
    }

    private acceptExecutionFromEvidence(execution: PendingExecution): void {
        if (execution.promptAccepted) return

        execution.promptAccepted = true
        this.dispatchCallback(
            execution.callbacks.onAccepted,
            [execution.promptId],
            'onAccepted',
        )
        if (execution.runningSeen) {
            this.dispatchCallback(
                execution.callbacks.onRunning,
                [execution.promptId],
                'onRunning',
            )
        }
    }

    private reconcileExecutions(): void {
        for (const execution of this.pendingExecutions.values()) {
            if (execution.needsHistoryRecovery) {
                this.startHistoryRecovery(execution, false)
            }
        }
    }

    private async submitPrompt(promptId: string, prompt: ComfyPrompt): Promise<void> {
        let response: Response

        try {
            response = await fetch(new URL('prompt', this.baseUrl), {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    prompt_id: promptId,
                    client_id: this.clientId,
                    prompt,
                }),
            })
        }
        catch {
            throw new ComfyError(
                'Comfy prompt submission could not be confirmed.',
                'COMFY_PROMPT_TRANSPORT',
            )
        }

        const parsed = comfyPromptResponse.safeParse(await readJson(response))
        if (!parsed.success) {
            throw new ComfyError(
                'Comfy prompt returned an invalid response shape.',
                'COMFY_INVALID_RESPONSE',
            )
        }

        const body = parsed.data

        if (!response.ok || body.error) {
            throw new ComfyError(
                formatComfyError(body.error ?? body.node_errors ?? `Comfy prompt returned HTTP ${response.status}.`),
                'COMFY_PROMPT_ERROR',
            )
        }

        if (!body.prompt_id) {
            throw new ComfyError(
                'Comfy prompt response does not contain a prompt ID.',
                'COMFY_INVALID_RESPONSE',
            )
        }

        if (body.prompt_id !== promptId) {
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
        const parsed = comfyHistoryResponse.safeParse(await readJson(response))
        if (!parsed.success) {
            throw new ComfyError(
                'Comfy history returned an invalid response shape.',
                'COMFY_INVALID_RESPONSE',
            )
        }

        const body = parsed.data

        if (!response.ok) {
            throw new ComfyError(
                `Comfy history returned HTTP ${response.status}.`,
                'COMFY_HISTORY_ERROR',
            )
        }

        return body[promptId]
    }
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json()
    }
    catch {
        throw new ComfyError('Comfy returned invalid JSON.', 'COMFY_INVALID_RESPONSE')
    }
}

function formatComfyError(value: unknown): string {
    if (typeof value === 'string') {
        return value
    }

    if (isRecord(value)) {
        const record = value
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

function parseJson(value: string): unknown {
    try {
        return JSON.parse(value)
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

function hasWebSocketEvidence(execution: PendingExecution): boolean {
    return execution.runningSeen
        || execution.terminalEvent !== undefined
        || Object.keys(execution.outputs).length > 0
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
    return (
        (typeof value === 'object' && value !== null)
        || typeof value === 'function'
    ) && typeof (value as { then?: unknown }).then === 'function'
}
