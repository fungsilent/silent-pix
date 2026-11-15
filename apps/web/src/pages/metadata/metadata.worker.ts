import { parseMetadata } from '#/pages/metadata/metadata.parse'

import type { MetadataOutcome } from '#/pages/metadata/metadata.parse'

self.addEventListener('message', (event: MessageEvent<unknown>) => {
    void handleFile(event.data)
}, { once: true })

async function handleFile(value: unknown): Promise<void> {
    const outcome: MetadataOutcome = value instanceof File
        ? await parseMetadata(value)
        : { status: 'error', code: 'INVALID_IMAGE' }

    self.postMessage(outcome)
}
