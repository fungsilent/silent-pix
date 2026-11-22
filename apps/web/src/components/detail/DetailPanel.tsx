import { Bar } from '#/components/base/Bar'
import { CollapseButton, CollapsedBar, Panel, PanelContent } from '#/components/base/Panel'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'

import type { PanelCollapse } from '#/components/base/Panel'
import type { JSX } from 'solid-js'

type DetailPanelProps = {
    collapse?: PanelCollapse | undefined
    children: JSX.Element
}

/* 右側詳細面板的外殼：寬度、標題列與收合由這裡負責，Task 與 Image detail 只提供內容。 */
export function DetailPanel(props: DetailPanelProps) {
    return (
        <Panel
            classes={{
                root: cn(theme.card, 'bg-surface max-[980px]:hidden'),
                // 380 是讓 ID 欄位能完整顯示 36 字元 UUID 加上複製圖示的最小寬度
                open: 'w-[380px]',
                close: 'w-10',
            }}
            collapse={props.collapse}
        >
            {panel => (
                panel.isCollapsed() ? (
                    <CollapsedBar onClick={panel.toggle} />
                ) : (
                    <div class='flex h-full min-h-0 flex-col'>
                        <Bar.Root classes={{ root: 'px-2' }}>
                            <Bar.Group>
                                <Bar.Title>{t('common.detail')}</Bar.Title>
                            </Bar.Group>
                            <Bar.Actions>
                                <CollapseButton
                                    collapsed={panel.isCollapsed()}
                                    onClick={panel.toggle}
                                />
                            </Bar.Actions>
                        </Bar.Root>
                        <PanelContent
                            classes={{
                                content: 'gap-3 px-4 pt-0 pb-5',
                            }}
                        >
                            {props.children}
                        </PanelContent>
                    </div>
                )
            )}
        </Panel>
    )
}
