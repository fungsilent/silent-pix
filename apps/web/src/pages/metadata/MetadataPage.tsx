import { FolderOpen, ImagePlus } from 'lucide-solid'
import { createSignal, onCleanup, onMount, Show } from 'solid-js'

import { Callout } from '#/components/base/Callout'
import { StatusMessage } from '#/components/base/StatusMessage'
import { t } from '#/lib/i18n'
import { getPlatform } from '#/lib/platform'
import { theme } from '#/lib/theme'
import { MetadataCopyTo } from '#/pages/metadata/components/MetadataCopyTo'
import { MetadataFilePanel } from '#/pages/metadata/components/MetadataFilePanel'
import { MetadataResultPane } from '#/pages/metadata/components/MetadataResultPane'
import { useMetadataSession } from '#/pages/metadata/session'
import { useIssueSource } from '#/store/issue'
import { mergeClasses } from '#/utils/style'

import type { MetadataError } from '#/pages/metadata/session'

const acceptedFiles = 'image/png,image/jpeg,.png,.jpg,.jpeg'
const copiedResetMs = 1500

/*
 * 桌面 App 式的工作區：左側檔案面板＋右側分頁結果，尚未開檔時整區是開啟畫面。
 * 檔案可以從開檔鈕選，或拖進視窗任何位置；全部在本機讀取。
 */
export function MetadataPage() {
    const session = useMetadataSession()
    const hasServer = getPlatform().endpoint !== null
    const file = () => session.state.file
    const result = () => session.state.result
    /* 以下是頁面的暫時狀態：離開頁面就消失 */
    const [dragging, setDragging] = createSignal(false)
    const [copiedId, setCopiedId] = createSignal<string>()
    const [copyFailed, setCopyFailed] = createSignal(false)
    const [tooManyFiles, setTooManyFiles] = createSignal(false)
    let input: HTMLInputElement | undefined
    let copiedTimer: number | undefined

    const resetFeedback = () => {
        window.clearTimeout(copiedTimer)
        setCopiedId()
        setCopyFailed(false)
        setTooManyFiles(false)
    }

    const clear = () => {
        resetFeedback()
        session.clear()
    }

    const dimensions = () => {
        const size = session.state.previewSize
        return size && `${size.width} × ${size.height}`
    }

    const openFiles = (files: FileList | null | undefined) => {
        if (!files || files.length === 0) return
        resetFeedback()
        if (session.openFiles(files) === 'too-many') setTooManyFiles(true)
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

    onCleanup(() => window.clearTimeout(copiedTimer))

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
        <section class='relative flex min-h-0 flex-1 gap-1'>
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
                        error={session.state.error}
                        failedName={session.state.failedName}
                        onChoose={openPicker}
                    />
                )}
            >
                {selected => (
                    <>
                        <MetadataFilePanel
                            file={selected}
                            mime={result()?.mime}
                            loading={session.state.loading}
                            previewUrl={session.state.previewUrl}
                            previewFailed={session.state.previewFailed}
                            dimensions={dimensions()}
                            onOpen={openPicker}
                            onClear={clear}
                        />
                        <MetadataResultPane
                            tab={session.state.activeTab}
                            entries={result()?.entries ?? []}
                            loading={session.state.loading}
                            copiedId={copiedId()}
                            onTabChange={session.setTab}
                            onCopy={(id, text) => void copy(id, text)}
                            actions={hasServer ? <MetadataCopyTo /> : undefined}
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
    error: MetadataError | undefined
    failedName: string | undefined
    onChoose: () => void
}

function OpeningScreen(props: OpeningScreenProps) {
    return (
        <div class={mergeClasses(theme.card, 'relative flex min-w-0 flex-1 items-center justify-center bg-surface px-4')}>
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
