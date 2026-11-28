import { Eye, ImagePlus } from 'lucide-solid'

import { StatusMessage } from '#/components/base/StatusMessage'
import { t } from '#/lib/i18n'

type EmptyCompareStateProps = {
    onAdd: () => void
}

export function EmptyCompareState(props: EmptyCompareStateProps) {
    return (
        <div class='relative flex min-h-0 flex-1 items-center justify-center bg-surface px-4'>
            <StatusMessage
                kind='empty'
                title={t('compare.emptyTitle')}
                message={t('compare.emptyMessage')}
                icon={(
                    <ImagePlus
                        size={21}
                        strokeWidth={1.5}
                    />
                )}
                action={{
                    label: t('image.add'),
                    icon: (
                        <ImagePlus
                            size={14}
                            strokeWidth={1.8}
                        />
                    ),
                    onClick: props.onAdd,
                }}
            />
        </div>
    )
}

type AllHiddenStateProps = {
    onShowAll: () => void
}

export function AllHiddenState(props: AllHiddenStateProps) {
    return (
        <div class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stage-empty px-4'>
            <StatusMessage
                kind='empty'
                title={t('compare.allHidden')}
                action={{
                    label: t('common.showAll'),
                    icon: (
                        <Eye
                            size={14}
                            strokeWidth={1.8}
                        />
                    ),
                    onClick: props.onShowAll,
                }}
            />
        </div>
    )
}
