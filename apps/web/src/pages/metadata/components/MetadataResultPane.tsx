import { ArrowLeft, Check, ChevronDown, ChevronRight, Copy, Dot } from 'lucide-solid'
import { createMemo, createSignal, For, Match, onCleanup, Show, Switch } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { SegmentGroup } from '#/components/base/SegmentGroup'
import { StatusMessage } from '#/components/base/StatusMessage'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { formatJsonText } from '#/lib/json'
import { theme } from '#/lib/theme'

import type { SegmentGroupOption } from '#/components/base/SegmentGroup'
import type { MetadataEntry, MetadataNode, MetadataNodeValue } from '#/pages/metadata/metadata.parse'
import type { JSX } from 'solid-js'

export type MetadataTab = 'generation' | 'raw'

const highlightResetMs = 1500

const tabOptions = [
    { value: 'generation', label: () => t('metadata.tabs.generation') },
    { value: 'raw', label: () => t('metadata.tabs.raw') },
] as const satisfies readonly SegmentGroupOption<MetadataTab>[]

/* MARK: ResultPane */
type PromptCard = {
    id: string
    title: string
    nodeId: string | undefined
    field: string | undefined
    sourceId: string | undefined
    text: string
    /* 複製一律用原文；整段 JSON 顯示時排版過 */
    copyText: string
}

type JsonSection = {
    id: string
    entry: MetadataEntry
}

type ResultPaneProps = {
    tab: MetadataTab
    entries: MetadataEntry[]
    loading: boolean
    copiedId: string | undefined
    onTabChange: (tab: MetadataTab) => void
    onCopy: (id: string, text: string) => void
}

export function MetadataResultPane(props: ResultPaneProps) {
    const empty = () => props.entries.length === 0

    return (
        <section class={cn(theme.card, 'flex min-w-0 flex-1 flex-col bg-surface')}>
            <Bar.Root classes={{ root: 'border-b border-line-subtle' }}>
                <SegmentGroup
                    value={props.tab}
                    options={tabOptions}
                    onChange={props.onTabChange}
                />
            </Bar.Root>

            <Switch>
                <Match when={props.loading}>
                    <div class='flex flex-col gap-3 p-4'>
                        <Loading.Skeleton class='h-3 w-48' />
                        <Loading.Skeleton class='h-28 w-full' />
                        <Loading.Skeleton class='h-20 w-full' />
                    </div>
                </Match>
                <Match when={props.tab === 'generation'}>
                    <GenerationView
                        entries={props.entries}
                        copiedId={props.copiedId}
                        onCopy={props.onCopy}
                    />
                </Match>
                <Match when={empty()}>
                    <EmptyResult message={t('metadata.missing.raw')} />
                </Match>
                <Match when={props.tab === 'raw'}>
                    <div class='scrollbar-thin min-h-0 flex-1 overflow-y-auto'>
                        <div class='flex flex-col gap-3 p-4'>
                            <For each={props.entries}>
                                {entry => (
                                    <RawRow
                                        entry={entry}
                                        copied={props.copiedId === rawId(entry)}
                                        onCopy={() => props.onCopy(rawId(entry), entry.text)}
                                    />
                                )}
                            </For>
                        </div>
                    </div>
                </Match>
            </Switch>
        </section>
    )
}

function EmptyResult(props: { message: string }) {
    return (
        <div class='flex min-h-0 flex-1 items-center justify-center px-4'>
            <StatusMessage
                kind='empty'
                message={props.message}
            />
        </div>
    )
}

/* MARK: GenerationView */
type GenerationViewProps = {
    entries: MetadataEntry[]
    copiedId: string | undefined
    onCopy: (id: string, text: string) => void
}

/* 加工過的生成資訊：Prompt、Nodes、Workflow (API)、Workflow 依序排列，沒有的群組不顯示 */
function GenerationView(props: GenerationViewProps) {
    /* ComfyUI 的 prompt 欄位其實是 API 節點圖；能解析成節點圖時才拆成提示詞、節點與 API JSON */
    const apiEntry = createMemo(() => props.entries.find(entry => entry.kind === 'prompt' && entry.format === 'api-graph'))
    const workflowEntry = createMemo(() => props.entries.find(entry => entry.kind === 'workflow'))

    /* 節點圖逐一取出提示詞；不是節點圖的文字（A1111 parameters、無法辨識的 prompt）整段一張卡片 */
    const promptCards = createMemo<PromptCard[]>(() => props.entries
        .filter(entry => entry.kind === 'prompt' || entry.kind === 'parameters')
        .flatMap((entry): PromptCard[] => entry.format === 'api-graph'
            ? entry.prompts.map(prompt => ({
                id: `prompt:${entry.source}:${entry.key}:${prompt.nodeId}:${prompt.field}`,
                title: prompt.title ?? t('metadata.textNode'),
                nodeId: prompt.nodeId,
                field: prompt.field === 'text' ? undefined : prompt.field,
                sourceId: prompt.sourceId,
                text: prompt.text,
                copyText: prompt.text,
            }))
            : [{
                id: `prompt:${entry.source}:${entry.key}`,
                title: entry.key,
                nodeId: undefined,
                field: undefined,
                sourceId: undefined,
                text: payloadText(entry),
                copyText: payload(entry),
            }]))

    const nodes = () => apiEntry()?.nodes ?? []
    const nodeById = createMemo(() => new Map(nodes().map(node => [node.id, node])))

    /* 群組展開狀態由這裡持有，跳轉到節點時才能先展開 Nodes */
    const [openGroups, setOpenGroups] = createSignal<Record<string, boolean>>({ prompt: true, nodes: true })
    const isOpen = (id: string) => openGroups()[id] ?? false
    const setGroupOpen = (id: string, open: boolean) => setOpenGroups(groups => ({ ...groups, [id]: open }))

    /* 點連線：捲到來源節點卡並短暫標亮 */
    const cards = new Map<string, HTMLElement>()
    const [highlightedId, setHighlightedId] = createSignal<string>()
    let highlightTimer: number | undefined
    onCleanup(() => window.clearTimeout(highlightTimer))

    const jumpTo = (nodeId: string) => {
        setGroupOpen('nodes', true)
        cards.get(nodeId)?.scrollIntoView({ block: 'center' })
        setHighlightedId(nodeId)
        window.clearTimeout(highlightTimer)
        highlightTimer = window.setTimeout(() => setHighlightedId(), highlightResetMs)
    }

    const linkProps = (nodeId: string) => {
        const source = nodeById().get(nodeId)
        return { label: source?.title ?? source?.classType, onJump: source ? () => jumpTo(nodeId) : undefined }
    }

    const jsonSections = createMemo(() => {
        const sections: (JsonSection & { title: string })[] = []
        const api = apiEntry()
        const workflow = workflowEntry()
        if (api) sections.push({ id: 'json:api', entry: api, title: t('metadata.groups.api') })
        if (workflow) sections.push({ id: 'json:workflow', entry: workflow, title: t('metadata.groups.workflow') })
        return sections
    })

    const empty = () => promptCards().length === 0 && nodes().length === 0 && jsonSections().length === 0

    return (
        <Show
            when={!empty()}
            fallback={<EmptyResult message={t('metadata.missing.generation')} />}
        >
            <div class='scrollbar-thin min-h-0 flex-1 overflow-y-auto'>
                <div class='flex flex-col gap-4 p-4'>
                    <Show when={promptCards().length > 0}>
                        <Group
                            title={t('metadata.groups.prompt')}
                            meta={[String(promptCards().length)]}
                            open={isOpen('prompt')}
                            onOpenChange={open => setGroupOpen('prompt', open)}
                        >
                            <For each={promptCards()}>
                                {card => (
                                    <PromptCardView
                                        card={card}
                                        copied={props.copiedId === card.id}
                                        source={card.sourceId === undefined ? undefined : { nodeId: card.sourceId, output: 0, ...linkProps(card.sourceId) }}
                                        onCopy={() => props.onCopy(card.id, card.copyText)}
                                    />
                                )}
                            </For>
                        </Group>
                    </Show>
                    <Show when={nodes().length > 0}>
                        <Group
                            title={t('metadata.groups.nodes')}
                            meta={[String(nodes().length)]}
                            open={isOpen('nodes')}
                            onOpenChange={open => setGroupOpen('nodes', open)}
                        >
                            <For each={nodes()}>
                                {node => (
                                    <NodeCard
                                        ref={element => cards.set(node.id, element)}
                                        node={node}
                                        highlighted={highlightedId() === node.id}
                                        link={linkProps}
                                    />
                                )}
                            </For>
                        </Group>
                    </Show>
                    <For each={jsonSections()}>
                        {section => (
                            <Group
                                title={section.title}
                                meta={[t(`metadata.sources.${section.entry.source}`), section.entry.key]}
                                open={isOpen(section.id)}
                                onOpenChange={open => setGroupOpen(section.id, open)}
                                copied={props.copiedId === section.id}
                                onCopy={() => props.onCopy(section.id, payload(section.entry))}
                            >
                                <pre class='scrollbar-thin m-0 max-h-[480px] overflow-auto whitespace-pre rounded-md border border-line-subtle bg-elevated p-3 font-mono text-[11px] leading-relaxed text-fg-secondary'>
                                    {payloadText(section.entry)}
                                </pre>
                            </Group>
                        )}
                    </For>
                </div>
            </div>
        </Show>
    )
}

type GroupProps = {
    title: string
    meta: string[]
    open: boolean
    onOpenChange: (open: boolean) => void
    children: JSX.Element
    copied?: boolean
    onCopy?: () => void
}

/* 可收合的群組：整列標頭可點；有複製鈕時收合狀態下也能複製 */
function Group(props: GroupProps) {
    const open = () => props.open

    return (
        <section class='flex flex-col gap-2'>
            <div class='flex h-7 items-center gap-1.5 rounded pr-0.5 hover:bg-hover'>
                <button
                    type='button'
                    class='flex min-w-0 flex-1 items-center gap-1.5 self-stretch border-0 bg-transparent pl-1 pr-0 text-left outline-none'
                    onClick={() => props.onOpenChange(!props.open)}
                >
                    <Show
                        when={open()}
                        fallback={(
                            <ChevronRight
                                size={13}
                                strokeWidth={1.8}
                                class='shrink-0 text-fg-muted'
                            />
                        )}
                    >
                        <ChevronDown
                            size={13}
                            strokeWidth={1.8}
                            class='shrink-0 text-fg-muted'
                        />
                    </Show>
                    <h3 class='m-0 shrink-0 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-fg-title'>{props.title}</h3>
                    <Dotted
                        parts={props.meta}
                        classes={{ part: 'min-w-0 truncate' }}
                    />
                </button>
                <Show when={props.onCopy}>
                    {onCopy => (
                        <CopyIconButton
                            copied={props.copied ?? false}
                            onClick={() => onCopy()()}
                        />
                    )}
                </Show>
            </div>
            <Show when={open()}>
                <div class='flex flex-col gap-2'>{props.children}</div>
            </Show>
        </section>
    )
}

type PromptCardViewProps = {
    card: PromptCard
    source: LinkProps | undefined
    copied: boolean
    onCopy: () => void
}

function PromptCardView(props: PromptCardViewProps) {
    return (
        <div class='overflow-hidden rounded-md border border-line-subtle'>
            <div class='flex h-9 items-center gap-2 border-b border-line-subtle bg-elevated pl-3 pr-1.5'>
                <span class='min-w-0 truncate text-xs font-medium text-fg'>{props.card.title}</span>
                <Show when={props.card.nodeId}>
                    {nodeId => <span class='shrink-0 font-mono text-[11px] text-fg-muted'>#{nodeId()}</span>}
                </Show>
                <Show when={props.card.field}>
                    {field => <span class='shrink-0 font-mono text-[11px] text-fg-muted'>{field()}</span>}
                </Show>
                <Show when={props.source}>
                    {source => <LinkButton {...source()} />}
                </Show>
                <CopyIconButton
                    copied={props.copied}
                    classes={{ root: 'ml-auto' }}
                    onClick={() => props.onCopy()}
                />
            </div>
            <p class='m-0 whitespace-pre-wrap break-words p-3 text-xs leading-relaxed text-fg'>{props.card.text}</p>
        </div>
    )
}

type NodeCardProps = {
    ref: (element: HTMLDivElement) => void
    node: MetadataNode
    highlighted: boolean
    link: (nodeId: string) => Pick<LinkProps, 'label' | 'onJump'>
}

function NodeCard(props: NodeCardProps) {
    const title = () => props.node.title ?? props.node.classType

    return (
        <div
            ref={props.ref}
            class={cn(
                'overflow-hidden rounded-md border transition-shadow',
                props.highlighted ? 'border-accent ring-2 ring-accent/40' : 'border-line-subtle',
            )}
        >
            <div class='flex h-8 items-center gap-2 border-b border-line-subtle bg-elevated px-2.5'>
                <span class='min-w-0 truncate text-xs font-medium text-fg'>{title()}</span>
                <Show when={title() !== props.node.classType}>
                    <span class='min-w-0 truncate font-mono text-[11px] text-fg-muted'>{props.node.classType}</span>
                </Show>
                <span class='ml-auto shrink-0 font-mono text-[11px] text-fg-muted'>#{props.node.id}</span>
            </div>
            <Show when={props.node.inputs.length > 0}>
                <div class='flex flex-col gap-1.5 px-2.5 py-2'>
                    <For each={props.node.inputs}>
                        {input => (
                            <div class='grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-baseline gap-3'>
                                <span
                                    class='truncate font-mono text-[11px] text-fg-muted'
                                    title={input.name}
                                >
                                    {input.name}
                                </span>
                                <NodeValue
                                    value={input.value}
                                    link={props.link}
                                />
                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    )
}

type NodeValueProps = {
    value: MetadataNodeValue
    link: NodeCardProps['link']
}

function NodeValue(props: NodeValueProps) {
    return (
        <Switch>
            <Match when={props.value.kind === 'link' && props.value}>
                {link => (
                    <span class='flex min-w-0'>
                        <LinkButton
                            nodeId={link().nodeId}
                            output={link().output}
                            {...props.link(link().nodeId)}
                        />
                    </span>
                )}
            </Match>
            <Match when={props.value.kind === 'json' && props.value}>
                {value => (
                    <pre class='scrollbar-thin m-0 max-h-[400px] overflow-auto whitespace-pre rounded border border-line-subtle bg-elevated px-2 py-1.5 font-mono text-[11px] leading-relaxed text-fg-secondary'>
                        {value().text}
                    </pre>
                )}
            </Match>
            <Match when={props.value.kind === 'number' && props.value}>
                {value => <span class='break-all font-mono text-[11px] text-fg-secondary tabular-nums'>{value().text}</span>}
            </Match>
            <Match when={props.value.kind === 'other' && props.value}>
                {value => <span class='break-all font-mono text-[11px] text-fg-secondary'>{value().text}</span>}
            </Match>
            <Match when={props.value.kind === 'text' && props.value}>
                {value => <span class='whitespace-pre-wrap break-words text-xs leading-relaxed text-fg-secondary'>{value().text}</span>}
            </Match>
        </Switch>
    )
}

type LinkProps = {
    nodeId: string
    output: number
    /* 來源節點的標題或類型；來源不在節點圖裡時沒有 */
    label: string | undefined
    onJump: (() => void) | undefined
}

/* 連線寫成「ArrowLeft 來源標題 #ID」，輸出序號不是 0 才標出；可點時跳到來源節點卡 */
function LinkButton(props: LinkProps) {
    return (
        <button
            type='button'
            disabled={!props.onJump}
            class='-mx-1 inline-flex min-w-0 max-w-full items-center gap-1 rounded border-0 bg-transparent px-1 text-left text-xs text-fg-secondary outline-none enabled:hover:bg-hover enabled:hover:text-fg'
            onClick={() => props.onJump?.()}
        >
            <ArrowLeft
                size={12}
                strokeWidth={1.6}
                class='shrink-0 text-fg-muted'
            />
            <Show when={props.label}>
                {label => <span class='min-w-0 truncate'>{label()}</span>}
            </Show>
            <span class='shrink-0 font-mono text-[11px] text-fg-muted'>#{props.nodeId}</span>
            <Show when={props.output !== 0}>
                <SeparatorDot />
                <span class='shrink-0 text-fg-muted'>{t('metadata.output', { index: props.output })}</span>
            </Show>
        </button>
    )
}

/* 並列的短資訊用圓點 icon 分隔，不用文字「·」 */
function SeparatorDot() {
    return (
        <Dot
            size={12}
            strokeWidth={5}
            class='shrink-0 text-fg-muted'
        />
    )
}

type DottedProps = {
    parts: string[]
    classes?: { part?: string }
}

function Dotted(props: DottedProps) {
    return (
        <span class='flex min-w-0 items-center gap-0.5 text-[11px] text-fg-muted'>
            <For each={props.parts}>
                {(part, index) => (
                    <>
                        <Show when={index() > 0}>
                            <SeparatorDot />
                        </Show>
                        <span class={props.classes?.part ?? 'shrink-0'}>{part}</span>
                    </>
                )}
            </For>
        </span>
    )
}

type RawRowProps = {
    entry: MetadataEntry
    copied: boolean
    onCopy: () => void
}

/* 原生、不加工：欄位名照原樣，展開是原文 */
function RawRow(props: RawRowProps) {
    const [open, setOpen] = createSignal(false)

    return (
        <div class='overflow-hidden rounded-md border border-line-subtle'>
            <div class='flex h-9 items-center gap-2 bg-elevated pl-2.5 pr-1.5 hover:bg-elevated-hover'>
                <button
                    type='button'
                    class='flex min-w-0 flex-1 items-center gap-2 self-stretch border-0 bg-transparent p-0 text-left outline-none'
                    onClick={() => setOpen(value => !value)}
                >
                    <Show
                        when={open()}
                        fallback={(
                            <ChevronRight
                                size={13}
                                strokeWidth={1.8}
                                class='shrink-0 text-fg-muted'
                            />
                        )}
                    >
                        <ChevronDown
                            size={13}
                            strokeWidth={1.8}
                            class='shrink-0 text-fg-muted'
                        />
                    </Show>
                    <span class='min-w-0 truncate font-mono text-xs text-fg'>{props.entry.key}</span>
                    <Dotted parts={[t(`metadata.sources.${props.entry.source}`), t(`metadata.formats.${props.entry.format}`)]} />
                </button>
                <CopyIconButton
                    copied={props.copied}
                    onClick={() => props.onCopy()}
                />
            </div>
            <Show when={open()}>
                <pre class='scrollbar-thin m-0 max-h-64 overflow-auto whitespace-pre-wrap break-all border-t border-line-subtle p-3 font-mono text-[11px] leading-relaxed text-fg-secondary'>
                    {props.entry.text}
                </pre>
            </Show>
        </div>
    )
}

/* MARK: Copy buttons */
type CopyIconButtonProps = {
    copied: boolean
    onClick: () => void
    classes?: { root?: string } | undefined
}

/* 複製後圖示換成 Check 約 1.5 秒，不另外顯示訊息 */
function CopyIconButton(props: CopyIconButtonProps) {
    return (
        <Button
            variant='ghost'
            title={props.copied ? t('metadata.copied') : t('metadata.copy')}
            classes={{ root: cn('size-6 shrink-0 p-0', props.copied ? 'text-fg' : 'text-fg-muted', props.classes?.root) }}
            onClick={() => props.onClick()}
        >
            <Show
                when={props.copied}
                fallback={(
                    <Copy
                        size={13}
                        strokeWidth={1.8}
                    />
                )}
            >
                <Check
                    size={13}
                    strokeWidth={2}
                />
            </Show>
        </Button>
    )
}

/* MARK: helpers */
function rawId(entry: MetadataEntry): string {
    return `raw:${entry.source}:${entry.key}`
}

/* 去掉 EXIF 前綴的原文 */
function payload(entry: MetadataEntry): string {
    return entry.text.slice(entry.contentOffset)
}

/* 顯示用：合法 JSON 排版 */
function payloadText(entry: MetadataEntry): string {
    const text = payload(entry)
    const json = entry.format === 'api-graph' || entry.format === 'ui-graph' || entry.format === 'unknown-json'
    return json ? formatJsonText(text) : text
}
