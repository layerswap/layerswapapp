import type { ReactNode } from 'react';
import { SwapContentView } from './Page2Sections';
import {
    ProgressPanelSurface,
    type ProgressPanelData,
} from './ProgressPanelView';
import { WalletActionTransition } from './WalletActionTransition';

/** Shared by production controllers and timeline snapshots. Only pure views exit. */
export function Page2Presenter({
    progress,
    controls,
    footer,
    actionKey,
    renderFooter = (children) => children,
    ...props
}: Omit<Parameters<typeof SwapContentView>[0], 'progress' | 'children'> & {
    progress: ProgressPanelData | null;
    controls: ReactNode | null;
    footer?: ReactNode | null;
    actionKey?: string;
    renderFooter?: (children: ReactNode) => ReactNode;
}) {
    const actionContent = footer ? (
        <WalletActionTransition actionKey={actionKey}>
            <div className="flex flex-col gap-2">{footer}</div>
        </WalletActionTransition>
    ) : null;
    const sections =
        controls || actionContent ? (
            <>
                {controls}
                {actionContent ? renderFooter(actionContent) : null}
            </>
        ) : null;
    return (
        <SwapContentView
            animateControls
            {...props}
            progress={
                progress ? <ProgressPanelSurface data={progress} /> : null
            }
        >
            {sections}
        </SwapContentView>
    );
}
