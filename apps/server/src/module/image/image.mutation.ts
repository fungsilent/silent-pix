type ImageMutationOperation<T> = () => T | PromiseLike<T>

let mutationTail: Promise<void> = Promise.resolve()

/**
 * Serialize image content mutations within this server process.
 *
 * Callers own the operation boundary. The operation must include every image
 * lookup/ingest and its reference commit, or every orphan check/delete/unlink.
 */
export function withImageMutation<T>(operation: ImageMutationOperation<T>): Promise<T> {
    const previous = mutationTail
    let release!: () => void
    const current = new Promise<void>(resolve => {
        release = resolve
    })

    /* The tail only contains a gate, so one rejected operation cannot poison the queue. */
    mutationTail = previous.then(() => current)

    return previous
        .then(operation)
        .finally(release)
}
