import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import type { ReactNode } from 'react';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { swapFlowTransition } from './swapFlowAnimation';

export function WalletExecutionTransition({
    overview,
    workflow,
    controls,
    content,
    animate = true,
}: {
    overview?: ReactNode;
    workflow?: ReactNode;
    controls?: ReactNode;
    content?: ReactNode;
    animate?: boolean;
}) {
    const reducedMotion = useHydratedReducedMotion();
    const panels = [
        overview && (
            <ExecutionPanel
                key="overview"
                kind="overview"
                reducedMotion={reducedMotion}
                animate={animate}
            >
                <div className="pb-2">{overview}</div>
            </ExecutionPanel>
        ),
        content && (
            <ExecutionPanel
                key="content"
                kind="content"
                reducedMotion={reducedMotion}
                animate={animate}
            >
                {content}
            </ExecutionPanel>
        ),
        workflow && (
            <ExecutionPanel
                key="workflow"
                kind="workflow"
                reducedMotion={reducedMotion}
                animate={animate}
            >
                {workflow}
            </ExecutionPanel>
        ),
        controls && (
            <ExecutionPanel
                key="controls"
                kind="controls"
                reducedMotion={reducedMotion}
                animate={animate}
                className={workflow ? 'pt-1' : undefined}
            >
                {controls}
            </ExecutionPanel>
        ),
    ];

    return (
        <div className="w-full">
            {reducedMotion ? (
                panels
            ) : (
                <AnimatePresence initial={false} mode="sync">
                    {panels}
                </AnimatePresence>
            )}
        </div>
    );
}

function ExecutionPanel({
    children,
    kind,
    reducedMotion,
    animate,
    className,
}: {
    children: ReactNode;
    kind: 'overview' | 'workflow' | 'controls' | 'content';
    reducedMotion: boolean;
    animate: boolean;
    className?: string;
}) {
    const isPresent = useIsPresent();

    // The shared steps panel owns its height animation in every flow.
    // Animate the overview and controls here; steps keep their own animation.
    // Exclusive withdrawal/processing controllers share one stable slot. They
    // are replaced directly, so AnimatePresence cannot retain a stale workflow.
    if (kind === 'workflow' || kind === 'content') {
        return (
            <div
                data-wallet-execution-panel={animate ? kind : undefined}
                aria-hidden={!isPresent}
                inert={!isPresent}
            >
                {children}
            </div>
        );
    }

    return (
        <motion.div
            data-wallet-execution-panel={animate ? kind : undefined}
            className="w-full overflow-hidden"
            initial={!animate || reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
                !animate || reducedMotion ? { duration: 0 } : swapFlowTransition
            }
            aria-hidden={!isPresent}
            inert={!isPresent}
        >
            <div className={`flex w-full flex-col gap-2 ${className ?? ''}`}>{children}</div>
        </motion.div>
    );
}
