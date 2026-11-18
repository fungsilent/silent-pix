import { FolderOpen, ImagePlus } from 'lucide-solid'
import { createSignal, onCleanup, onMount, Show } from 'solid-js'

import { Callout } from '#/components/base/Callout'
import { StatusMessage } from '#/components/base/StatusMessage'
import { t } from '#/lib/i18n'
import { useIssueSource } from '#/lib/issue'
import { MetadataFilePanel } from '#/pages/metadata/components/MetadataFilePanel'
import { MetadataResultPane } from '#/pages/metadata/components/MetadataResultPane'
import MetadataWorker from '#/pages/metadata/metadata.worker?worker'

import type { MetadataTab } from '#/pages/metadata/components/MetadataResultPane'
import type { ImageMetadata, MetadataOutcome } from '#/pages/metadata/metadata.parse'

type PageError = Extract<MetadataOutcome, { status: 'error' }>['code'] | 'TIMEOUT' | 'WORKER_FAILED' | 'TOO_MANY_FILES'

const acceptedFiles = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
const copiedResetMs = 1500

/*
 * 桌面 App 式的工作區：左側檔案面板＋右側分頁結果，尚未開檔時整區是開啟畫面。
 * 檔案可以從開檔鈕選，或拖進視窗任何位置；全部在本機讀取。
 */
export function MetadataPage() {
    const [file, setFile] = createSignal<File>()
    const [result, setResult] = createSignal<ImageMetadata>()
    const [previewUrl, setPreviewUrl] = createSignal<string>()
    const [dimensions, setDimensions] = createSignal<string>()
    const [previewFailed, setPreviewFailed] = createSignal(false)
    const [loading, setLoading] = createSignal(false)
    const [error, setError] = createSignal<PageError>()
    /* 讀檔失敗時 file 已清掉，另外留檔名給錯誤標題 */
    const [failedName, setFailedName] = createSignal<string>()
    const [activeTab, setActiveTab] = createSignal<MetadataTab>('generation')
    const [dragging, setDragging] = createSignal(false)
    const [copiedId, setCopiedId] = createSignal<string>()
    const [copyFailed, setCopyFailed] = createSignal(false)
    const [tooManyFiles, setTooManyFiles] = createSignal(false)
    let input: HTMLInputElement | undefined
    let worker: Worker | undefined
    let timeout: number | undefined
    let copiedTimer: number | undefined

    const stopWorker = () => {
        worker?.terminate()
        worker = undefined
        window.clearTimeout(timeout)
        timeout = undefined
    }

    const releasePreview = () => {
        const url = previewUrl()
        if (url) URL.revokeObjectURL(url)
        setPreviewUrl()
    }

    const clear = () => {
        stopWorker()
        releasePreview()
        window.clearTimeout(copiedTimer)
        setFile()
        setResult()
        setDimensions()
        setPreviewFailed(false)
        setLoading(false)
        setError()
        setCopiedId()
        setCopyFailed(false)
        setTooManyFiles(false)
    }

    const fail = (code: PageError) => {
        const name = file()?.name
        clear()
        setError(code)
        setFailedName(name)
    }

    const selectFile = (selected: File) => {
        clear()
        setFile(selected)
        setLoading(true)

        try {
            const activeWorker = new MetadataWorker()
            worker = activeWorker
            const failActive = (code: PageError) => {
                if (worker === activeWorker) fail(code)
            }
            activeWorker.onmessage = (event: MessageEvent<MetadataOutcome>) => {
                if (worker !== activeWorker) return
                if (event.data.status === 'error') {
                    fail(event.data.code)
                    return
                }

                stopWorker()
                setLoading(false)
                setResult(event.data.result)
                try {
                    setPreviewUrl(URL.createObjectURL(new Blob([selected], { type: event.data.result.mime })))
                } catch {
                    setPreviewFailed(true)
                }
            }
            activeWorker.onerror = () => failActive('WORKER_FAILED')
            activeWorker.onmessageerror = () => failActive('WORKER_FAILED')
            timeout = window.setTimeout(() => failActive('TIMEOUT'), 5000)
            activeWorker.postMessage(selected)
        } catch {
            fail('WORKER_FAILED')
        }
    }

    const openFiles = (files: FileList | null | undefined) => {
        if (!files || files.length === 0) return
        if (files.length > 1) {
            /* 已開檔時保留目前結果，只在 Header 的 Issue chip 提示；開啟畫面才顯示錯誤 */
            if (file()) setTooManyFiles(true)
            else fail('TOO_MANY_FILES')
            return
        }
        selectFile(files[0]!)
    }

    const openPicker = () => input?.click()

    /* 拖進視窗任何位置都能開檔；dragenter／dragleave 會在子元素間成對觸發，用計數判斷是否真的離開視窗 */
    onMount(() => {
        let depth = 0
        const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false
        const onEnter = (event: DragEvent) => {
            if (!hasFiles(event)) return
            depth += 1
            setDragging(true)
        }
        const onOver = (event: DragEvent) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        }
        const onLeave = (event: DragEvent) => {
            if (!hasFiles(event)) return
            depth = Math.max(0, depth - 1)
            if (depth === 0) setDragging(false)
        }
        const onDrop = (event: DragEvent) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            depth = 0
            setDragging(false)
            openFiles(event.dataTransfer?.files)
        }

        window.addEventListener('dragenter', onEnter)
        window.addEventListener('dragover', onOver)
        window.addEventListener('dragleave', onLeave)
        window.addEventListener('drop', onDrop)
        onCleanup(() => {
            window.removeEventListener('dragenter', onEnter)
            window.removeEventListener('dragover', onOver)
            window.removeEventListener('dragleave', onLeave)
            window.removeEventListener('drop', onDrop)
        })
    })

    onCleanup(() => {
        stopWorker()
        releasePreview()
        window.clearTimeout(copiedTimer)
    })

    const copy = async (id: string, text: string) => {
        const sourceFile = file()
        try {
            await navigator.clipboard.writeText(text)
            if (file() !== sourceFile) return
            setCopyFailed(false)
            setCopiedId(id)
            window.clearTimeout(copiedTimer)
            copiedTimer = window.setTimeout(() => setCopiedId(), copiedResetMs)
        } catch {
            if (file() === sourceFile) setCopyFailed(true)
        }
    }

    const field = () => t('metadata.title')
    useIssueSource(() => [
        ...(result()?.incomplete
            ? [{ id: 'incomplete', tone: 'warning' as const, field, message: () => t('metadata.incomplete') }]
            : []),
        ...(copyFailed()
            ? [{ id: 'copy-failed', tone: 'warning' as const, field, message: () => t('metadata.copyFailed'), onDismiss: () => setCopyFailed(false) }]
            : []),
        ...(tooManyFiles()
            ? [{ id: 'too-many-files', tone: 'warning' as const, field, message: () => t('metadata.errors.TOO_MANY_FILES'), onDismiss: () => setTooManyFiles(false) }]
            : []),
    ])

    return (
        <section class='relative flex min-h-0 flex-1 bg-surface'>
            <input
                ref={element => (input = element)}
                type='file'
                accept={acceptedFiles}
                class='hidden'
                onChange={event => {
                    openFiles(event.currentTarget.files)
                    event.currentTarget.value = ''
                }}
            />

            {/* keyed：換檔時重建，群組與 Raw 的展開狀態回到預設 */}
            <Show
                when={file()}
                keyed
                fallback={(
                    <OpeningScreen
                        dragging={dragging()}
                        error={error()}
                        failedName={failedName()}
                        onChoose={openPicker}
                    />
                )}
            >
                {selected => (
                    <>
                        <MetadataFilePanel
                            file={selected}
                            mime={result()?.mime}
                            loading={loading()}
                            previewUrl={previewUrl()}
                            previewFailed={previewFailed()}
                            dimensions={dimensions()}
                            onOpen={openPicker}
                            onClear={clear}
                            onPreviewLoad={setDimensions}
                            onPreviewError={() => {
                                setPreviewFailed(true)
                                releasePreview()
                            }}
                        />
                        <MetadataResultPane
                            tab={activeTab()}
                            entries={result()?.entries ?? []}
                            loading={loading()}
                            copiedId={copiedId()}
                            onTabChange={setActiveTab}
                            onCopy={(id, text) => void copy(id, text)}
                        />
                        <Show when={dragging()}>
                            <DropFrame />
                        </Show>
                    </>
                )}
            </Show>
        </section>
    )
}

/* MARK: OpeningScreen */
type OpeningScreenProps = {
    dragging: boolean
    error: PageError | undefined
    failedName: string | undefined
    onChoose: () => void
}

function OpeningScreen(props: OpeningScreenProps) {
    return (
        <div class='relative flex min-w-0 flex-1 items-center justify-center px-4'>
            <Show when={props.dragging}>
                <DropFrame />
            </Show>
            <div class='relative flex max-w-[320px] flex-col items-center gap-3 text-center'>
                <StatusMessage
                    kind='empty'
                    title={props.dragging ? t('metadata.dropTitle') : t('metadata.openTitle')}
                    message={props.dragging ? t('metadata.dropMessage') : t('metadata.openMessage')}
                    icon={(
                        <ImagePlus
                            size={21}
                            strokeWidth={1.5}
                        />
                    )}
                    {...(props.dragging
                        ? {}
                        : {
                            action: {
                                label: t('metadata.choose'),
                                icon: (
                                    <FolderOpen
                                        size={14}
                                        strokeWidth={1.8}
                                    />
                                ),
                                onClick: props.onChoose,
                            },
                        })}
                    classes={{ root: 'max-w-[320px]' }}
                />
                <Show when={!props.dragging && props.error}>
                    {code => (
                        <Callout
                            title={props.failedName && code() !== 'WORKER_FAILED' ? t('metadata.cantRead', { name: props.failedName }) : undefined}
                            class='mt-2 w-full'
                        >
                            {t(`metadata.errors.${code()}`)}
                        </Callout>
                    )}
                </Show>
            </div>
        </div>
    )
}

function DropFrame() {
    return <div class='pointer-events-none absolute inset-3 z-20 rounded-lg border-2 border-dashed border-accent bg-accent/10' />
}
