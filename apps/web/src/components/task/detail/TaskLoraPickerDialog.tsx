import { Check, Search } from 'lucide-solid'
import { createEffect, createSignal, For, on, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { Loading } from '#/components/base/Loading'
import { SelectedCountChip } from '#/components/base/SelectedCountChip'
import { StatusMessage } from '#/components/base/StatusMessage'
import { Text } from '#/components/field/Text'
import { t } from '#/lib/i18n'
import { mergeClasses } from '#/utils/style'

import type { SelectOption } from '#/components/field'

type TaskLoraPickerDialogProps = {
    open: boolean
    options: SelectOption[]
    loading: boolean
    error: boolean
    selectedNames: string[]
    onApply: (names: string[]) => void
    onRetry: () => void
    onOpenChange: (open: boolean) => void
}

const loraSkeletonRows = [0, 1, 2, 3, 4, 5]

/* ComfyUI 的名稱可能帶子資料夾（Windows 為 \）；資料夾與副檔名淡化，主檔名一般色 */
function splitLoraName(name: string) {
    const slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'))
    const folder = name.slice(0, slash + 1)
    const file = name.slice(slash + 1)
    const dot = file.lastIndexOf('.')
    return dot > 0
        ? { folder, base: file.slice(0, dot), extension: file.slice(dot) }
        : { folder, base: file, extension: '' }
}

export function TaskLoraPickerDialog(props: TaskLoraPickerDialogProps) {
    const [keyword, setKeyword] = createSignal('')
    const [selected, setSelected] = createSignal<string[]>([])

    /* 每次開啟才建立暫存選取，開啟期間的外部更新不覆蓋使用者的勾選。 */
    createEffect(on(() => props.open, open => {
        if (open) {
            setSelected(props.selectedNames)
            setKeyword('')
        }
    }))

    const visibleOptions = () => {
        const text = keyword().trim().toLowerCase()

        if (!text) {
            return props.options
        }

        return props.options.filter(option => option.label.toLowerCase().includes(text))
    }
    const isSelected = (name: string) => selected().includes(name)
    const toggle = (name: string) => setSelected(current => current.includes(name)
        ? current.filter(item => item !== name)
        : [...current, name])

    return (
        <Dialog
            open={props.open}
            title={t('generate.lora.select')}
            onOpenChange={props.onOpenChange}
            classes={{
                backdrop: 'bg-backdrop-muted backdrop-blur-[2px]',
                content: 'h-[520px] w-[600px] max-w-full rounded-[10px] max-h-[70vh]',
                header: 'h-12 items-center py-0',
                title: 'text-sm font-semibold leading-none',
                body: 'flex min-h-0 flex-col overflow-hidden p-0',
                footer: 'h-12 items-center py-0',
            }}
            /* 一律可按：取消全部勾選再 Apply 等於清空 LoRA */
            footer={(
                <Button
                    type='button'
                    variant='solid'
                    tone='accent'
                    size='dialog'
                    onClick={() => props.onApply(selected())}
                >
                    {t('common.apply')}
                </Button>
            )}
        >
            {/* 與圖片選擇器同款工具列：搜尋＋選取 chip；dialog 較窄，搜尋撐滿剩餘寬度 */}
            <div class='flex h-12 shrink-0 items-center gap-3 border-b border-line-subtle px-2'>
                <div class='flex min-w-0 flex-1'>
                    <Text
                        label={t('generate.lora.search')}
                        value={keyword()}
                        placeholder={t('generate.lora.searchPlaceholder')}
                        icon={(
                            <Search
                                size={14}
                                strokeWidth={1.7}
                            />
                        )}
                        classes={{ root: 'min-w-0 flex-1', label: 'hidden' }}
                        onInput={setKeyword}
                    />
                </div>
                <Show when={selected().length > 0}>
                    <SelectedCountChip
                        count={selected().length}
                        onClear={() => setSelected([])}
                    />
                </Show>
            </div>

            <div class='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2'>
                <Loading.Swap
                    loading={() => props.open && props.loading}
                    fallback={(
                        <div class='flex flex-col gap-0.5'>
                            <For each={loraSkeletonRows}>
                                {() => (
                                    <div class='flex h-8 items-center gap-2.5 px-2'>
                                        <Loading.Skeleton class='size-3.5 shrink-0 rounded-[3px]' />
                                        <Loading.Skeleton class='h-3 w-1/2' />
                                    </div>
                                )}
                            </For>
                        </div>
                    )}
                >
                    <Show when={props.error}>
                        <StatusMessage
                            kind='load-error'
                            size='compact'
                            message={t('generate.lora.loadFailed')}
                            onRetry={props.onRetry}
                        />
                    </Show>

                    <Show when={!props.error}>
                        <Show
                            when={visibleOptions().length > 0}
                            fallback={(
                                <StatusMessage
                                    kind='empty'
                                    size='compact'
                                    message={props.options.length === 0
                                        ? t('generate.lora.unavailable')
                                        : t('generate.lora.noMatch')}
                                />
                            )}
                        >
                            <div class='flex flex-col gap-0.5'>
                                <For each={visibleOptions()}>
                                    {option => {
                                        const name = splitLoraName(option.label)
                                        const checked = () => isSelected(option.value)

                                        return (
                                            <Button
                                                variant='ghost'
                                                title={option.value}
                                                classes={{
                                                    root: mergeClasses(
                                                        'h-8 w-full justify-start gap-2.5 rounded-md border-0 px-2 text-left text-xs',
                                                        checked()
                                                            ? 'bg-accent/15 text-fg hover:bg-accent/20'
                                                            : 'text-fg-secondary hover:bg-hover hover:text-fg',
                                                    ),
                                                }}
                                                onClick={() => toggle(option.value)}
                                            >
                                                <span
                                                    class={mergeClasses(
                                                        'grid size-3.5 shrink-0 place-items-center rounded-[3px] border',
                                                        checked() ? 'border-accent bg-accent text-on-stage' : 'border-line bg-surface',
                                                    )}
                                                >
                                                    <Show when={checked()}>
                                                        <Check
                                                            size={10}
                                                            strokeWidth={3.5}
                                                        />
                                                    </Show>
                                                </span>
                                                <span class='flex min-w-0'>
                                                    <Show when={name.folder}>
                                                        <span class='shrink-0 text-fg-muted'>{name.folder}</span>
                                                    </Show>
                                                    <span class='truncate'>{name.base}</span>
                                                    <span class='shrink-0 text-fg-muted'>{name.extension}</span>
                                                </span>
                                            </Button>
                                        )
                                    }}
                                </For>
                            </div>
                        </Show>
                    </Show>
                </Loading.Swap>
            </div>
        </Dialog>
    )
}
