type ImageMutationOperation<T> = () => T | PromiseLike<T>

let mutationTail: Promise<void> = Promise.resolve()
let pendingMutationCount = 0
let mutationAdmissionOpen = true
let mutationDrain: Promise<void> | undefined
let resolveMutationDrain: (() => void) | undefined

export class ImageMutationUnavailableError extends Error {
    readonly code = 'SERVER_STOPPING'

    constructor() {
        super('Image mutations are unavailable while the server is stopping.')
        this.name = 'ImageMutationUnavailableError'
    }
}

/**
 * Serialize image content mutations within this server process.
 *
 * Callers own the operation boundary. The operation must include every image
 * lookup/ingest and its reference commit, or every orphan check/delete/unlink.
 */
export function withImageMutation<T>(operation: ImageMutationOperation<T>): Promise<T> {
    if (!mutationAdmissionOpen) {
        return Promise.reject(new ImageMutationUnavailableError())
    }

    pendingMutationCount += 1

    const previous = mutationTail
    let release!: () => void
    const current = new Promise<void>(resolve => {
        release = resolve
    })

    /* The tail only contains a gate, so one rejected operation cannot poison the queue. */
    mutationTail = previous.then(() => current)

    return previous
        .then(operation)
        .finally(() => {
            release()
            pendingMutationCount -= 1
            if (pendingMutationCount === 0) {
                resolveMutationDrain?.()
                resolveMutationDrain = undefined
                mutationDrain = undefined
            }
        })
}

export function stopImageMutationAdmission(): void {
    mutationAdmissionOpen = false
}

export function waitForImageMutationDrain(): Promise<void> {
    if (pendingMutationCount === 0) {
        return Promise.resolve()
    }

    if (!mutationDrain) {
        mutationDrain = new Promise(resolve => {
            resolveMutationDrain = resolve
        })
    }

    return mutationDrain
}
