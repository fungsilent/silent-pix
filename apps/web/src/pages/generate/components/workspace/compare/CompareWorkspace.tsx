import { ImagePlus } from 'lucide-solid'

import { Button } from '#/components/base/Button'

export function CompareWorkspace() {
    return (
        <section
            class='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas'
            aria-label='Compare workspace'
        >
            <header class='flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 py-2'>
                <div class='flex min-w-0 items-baseline gap-2'>
                    <h2 class='m-0 text-sm font-bold leading-none text-fg'>Compare</h2>
                    <span class='text-[11.5px] tabular-nums text-fg-muted'>0 / 0 shown</span>
                </div>
                <Button
                    variant='primary'
                    disabled
                    classes={{ root: 'shrink-0 px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60' }}
                >
                    <ImagePlus
                        size={14}
                        strokeWidth={1.8}
                        aria-hidden='true'
                    />
                    Add images
                </Button>
            </header>

            <div class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stage'>
                <div class='flex max-w-[280px] flex-col items-center gap-3 text-center'>
                    <div class='grid size-12 place-items-center rounded-xl border border-line-subtle bg-elevated text-fg-muted'>
                        <ImagePlus
                            size={21}
                            strokeWidth={1.5}
                            aria-hidden='true'
                        />
                    </div>
                    <div class='flex flex-col gap-1'>
                        <h3 class='m-0 text-sm font-medium text-fg'>No images to compare</h3>
                        <p class='m-0 text-xs leading-relaxed text-fg-muted'>
                            Add images from your library to compare them side by side.
                        </p>
                    </div>
                    <Button
                        variant='primary'
                        disabled
                        classes={{ root: 'mt-1 h-8 px-3 text-xs' }}
                    >
                        <ImagePlus
                            size={14}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                        Add images
                    </Button>
                </div>
            </div>

            <div
                class='h-20 shrink-0 border-t border-white/[0.07] bg-[#101010]'
                aria-label='Compare image strip'
            />
        </section>
    )
}
