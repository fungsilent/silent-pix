import { Slider as ArkSlider } from '@ark-ui/solid'
import { clsx } from 'clsx'

type SliderProps = {
    label: string
    value: number
    min?: number
    max?: number
    step?: number
    classes?: {
        root?: string
        control?: string
        track?: string
        range?: string
        thumb?: string
    }
    onChange?: (value: number) => void
}

export function Slider(props: SliderProps) {
    return (
        <ArkSlider.Root
            aria-label={[props.label]}
            min={props.min}
            max={props.max}
            step={props.step}
            value={[props.value]}
            onValueChange={details => {
                const nextValue = details.value[0]

                if (nextValue !== undefined) {
                    props.onChange?.(nextValue)
                }
            }}
            class={clsx('min-w-0 touch-none', props.classes?.root)}
        >
            <ArkSlider.Control class={clsx('relative flex h-5 w-full min-w-0 items-center', props.classes?.control)}>
                <ArkSlider.Track class={clsx('h-2 w-full rounded-full border border-line bg-elevated', props.classes?.track)}>
                    <ArkSlider.Range class={clsx('h-full rounded-full bg-accent', props.classes?.range)} />
                </ArkSlider.Track>
                <ArkSlider.Thumb
                    index={0}
                    class={clsx(
                        'h-4 w-4 rounded-full bg-accent outline-none ring-2 ring-transparent focus:ring-accent/40',
                        props.classes?.thumb,
                    )}
                >
                    <ArkSlider.HiddenInput />
                </ArkSlider.Thumb>
            </ArkSlider.Control>
        </ArkSlider.Root>
    )
}