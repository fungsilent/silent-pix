import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, Expand, Star, Trash2 } from 'lucide-solid'
import { For, onCleanup, onMount, Show } from 'solid-js'

import { Button } from '#/components/base/Button'

type ImageStageProps = {
    images: string[]
    selectedIndex: number
    onSelect: (index: number) => void
}

export function ImageStage(props: ImageStageProps) {
    const selectedImage = () => props.images[props.selectedIndex] ?? props.images[0]
    const selectPrevious = () => {
        if (props.images.length === 0) {
            return
        }

        props.onSelect((props.selectedIndex - 1 + props.images.length) % props.images.length)
    }
    const selectNext = () => {
        if (props.images.length === 0) {
            return
        }

        props.onSelect((props.selectedIndex + 1) % props.images.length)
    }

    const isEditableTarget = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) {
            return false
        }

        return target.isContentEditable
            || target.tagName === 'INPUT'
            || target.tagName === 'TEXTAREA'
            || target.tagName === 'SELECT'
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (props.images.length < 2 || isEditableTarget(event.target)) {
            return
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            selectPrevious()
            return
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault()
            selectNext()
        }
    }

    onMount(() => {
        window.addEventListener('keydown', handleKeyDown)
    })

    onCleanup(() => {
        window.removeEventListener('keydown', handleKeyDown)
    })

    return (
        <section
            class='flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-md border border-[#263241] bg-[#11161d]'
            aria-label='Image preview'
        >
            <div class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-[#05080d]'>
                <Show
                    when={selectedImage()}
                    fallback={<div class='text-sm font-bold text-[#6f7f95]'>No image</div>}
                >
                    {image => (
                        <img
                            class='h-full max-h-full max-w-full object-contain'
                            src={image()}
                            alt='Selected generated preview'
                        />
                    )}
                </Show>

                <div class='absolute right-2 top-2 flex gap-2'>
                    <Button classes={{ root: 'h-8 w-8 p-0 text-white' }}>
                        <Expand
                            size={14}
                            strokeWidth={2}
                            aria-hidden='true'
                        />
                    </Button>
                    <Button classes={{ root: 'h-8 w-8 p-0 text-white' }}>
                        <Star
                            size={14}
                            strokeWidth={2}
                            aria-hidden='true'
                        />
                    </Button>
                    <Button classes={{ root: 'h-8 w-8 p-0 text-red-400' }}>
                        <Trash2
                            size={14}
                            strokeWidth={2}
                            aria-hidden='true'
                        />
                    </Button>
                </div>

                <Button
                    classes={{ root: 'absolute left-3 top-1/2 h-16 w-10 -translate-y-1/2 bg-[#080c12] p-0 text-white disabled:opacity-30' }}
                    aria-label='Previous image'
                    disabled={props.images.length < 2}
                    onClick={selectPrevious}
                >
                    <ChevronLeft
                        size={22}
                        strokeWidth={2.2}
                        aria-hidden='true'
                    />
                </Button>
                <Button
                    classes={{ root: 'absolute right-3 top-1/2 h-16 w-10 -translate-y-1/2 bg-[#080c12] p-0 text-white disabled:opacity-30' }}
                    aria-label='Next image'
                    disabled={props.images.length < 2}
                    onClick={selectNext}
                >
                    <ChevronRight
                        size={22}
                        strokeWidth={2.2}
                        aria-hidden='true'
                    />
                </Button>
            </div>

            <Show when={props.images.length > 0}>
                <div class='flex h-24 items-center justify-center gap-2 p-2 overflow-x-auto'>
                    <For each={props.images}>
                        {(image, index) => (
                            <Button
                                classes={{
                                    root: clsx(
                                        'h-20 bg-[#05080d] p-0!',
                                        index() === props.selectedIndex
                                            ? 'border-blue-500 ring-1 ring-blue-400'
                                            : 'border-[#263241]',
                                    ),
                                }}
                                onClick={() => props.onSelect(index())}
                            >
                                <img
                                    class='h-full w-full object-cover'
                                    src={image}
                                    alt='Generated thumbnail'
                                />
                            </Button>
                        )}
                    </For>
                </div>
            </Show>
        </section>
    )
}

