import { Search } from 'lucide-solid'
import { createEffect, createSignal, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { Text } from '#/components/field'
import { useImageListQuery } from '#/features/image/image.query'
import { cn } from '#/lib/cn'

import type { ImageApi } from '@silent-pix/shared'
import type { ReferenceImage } from '#/pages/generate/store'

type TaskImageDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (reference: ReferenceImage) => void
}

export function TaskImageDialog(props: TaskImageDialogProps) {
    const [keyword, setKeyword] = createSignal('')
    const [selected, setSelected] = createSignal<ImageApi.ImageListItem>()
    const query = useImageListQuery(() => props.open, keyword)

    createEffect(() => {
        if (props.open) {
            setKeyword('')
            setSelected(undefined)
        }
    })

    /* 一格一張圖：同一張圖被多個 task 用也只出現一次，標籤取最早的那一次 */
    const items = () => query.data?.pages.flatMap(page => page.items) ?? []

    const apply = () => {
        const item = selected()
        if (!item) {
            return
        }

        props.onSelect({ type: 'asset', image: item.image, origin: item.origin })
        props.onOpenChange(false)
    }

    return (
        <Dialog
            open={props.open}
            title='Choose reference image'
            onOpenChange={props.onOpenChange}
            classes={{ content: 'w-[960px] max-w-full', body: 'min-h-0' }}
            footer={(
                <div class='flex w-full items-center gap-3'>
                    <Show when={selected()}>
                        {item => (
                            <span class='min-w-0 truncate text-xs text-fg-secondary'>
                                {item().image.width} × {item().image.height}
                            </span>
                        )}
                    </Show>
                    <div class='ml-auto flex shrink-0 gap-2'>
                        <Button
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={() => props.onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant='primary'
                            disabled={!selected()}
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={apply}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            )}
        >
            <div class='flex min-h-0 flex-col gap-3'>
                <Text
                    label='Search'
                    value={keyword()}
                    placeholder='task name or task ID...'
                    icon={(
                        <Search
                            size={14}
                            strokeWidth={1.7}
                            aria-hidden='true'
                        />
                    )}
                    classes={{ label: 'sr-only' }}
                    onInput={setKeyword}
                />

                <Show
                    when={items().length > 0}
                    fallback={(
                        <p class='m-0 py-8 text-center text-xs text-fg-muted'>
                            {query.isLoading ? 'Loading images...' : 'No images yet.'}
                        </p>
                    )}
                >
                    <div class='grid grid-cols-5 gap-3'>
                        <For each={items()}>
                            {item => (
                                <button
                                    type='button'
                                    class={cn(
                                        'relative aspect-square overflow-hidden rounded-md border bg-active',
                                        selected()?.image.id === item.image.id
                                            ? 'border-accent ring-2 ring-accent/40'
                                            : 'border-transparent hover:border-white/20',
                                    )}
                                    onClick={() => setSelected(item)}
                                >
                                    <img
                                        class='absolute inset-0 size-full object-cover'
                                        src={item.image.url}
                                        alt=''
                                        loading='lazy'
                                    />
                                    <Show when={item.origin}>
                                        {origin => (
                                            <>
                                                {/* 縮圖本身看不出它是輸入還是輸出，所以這個標常駐 */}
                                                <span class='absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 text-[9.5px] font-bold uppercase tracking-wide text-white/75 backdrop-blur-[3px]'>
                                                    {origin().type}
                                                </span>
                                                <span class='absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] text-white'>
                                                    {origin().taskName ?? origin().taskId.slice(0, 8)}
                                                    <Show when={origin().type === 'output'}>
                                                        {' '}#{origin().sortIndex + 1}
                                                    </Show>
                                                </span>
                                            </>
                                        )}
                                    </Show>
                                </button>
                            )}
                        </For>
                    </div>

                    <Show when={query.hasNextPage}>
                        <Button
                            classes={{ root: 'w-full' }}
                            disabled={query.isFetchingNextPage}
                            onClick={() => void query.fetchNextPage()}
                        >
                            {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
                        </Button>
                    </Show>
                </Show>
            </div>
        </Dialog>
    )
}
