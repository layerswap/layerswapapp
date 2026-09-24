import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import type { ReactNode } from 'react';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { swapFlowTransition } from './swapFlowAnimation';

export function WalletExecutionTransition({
    overview,
    workflow,
    controls,
}: {
    overview?: ReactNode;
    workflow?: ReactNode;
    controls?: ReactNode;
}) {
    const reducedMotion = useHydratedReducedMotion();
    const panels = [
        overview && (
            <ExecutionPanel
                key="overview"
                kind="overview"
                reducedMotion={reducedMotion}
            >
                <div className="pb-2">{overview}</div>
            </ExecutionPanel>
        ),
        workflow && (
            <ExecutionPanel
                key="workflow"
                kind="workflow"
                reducedMotion={reducedMotion}
            >
                {workflow}
            </ExecutionPanel>
        ),
        controls && (
            <ExecutionPanel
                key="controls"
                kind="controls"
                reducedMotion={reducedMotion}
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
}: {
    children: ReactNode;
    kind: 'overview' | 'workflow' | 'controls';
    reducedMotion: boolean;
}) {
    const isPresent = useIsPresent();

    // The shared steps panel owns its height animation in every flow.
    // Animate the overview and controls here; steps keep their own animation.
    if (kind === 'workflow') {
        return (
            <div
                data-wallet-execution-panel={kind}
                aria-hidden={!isPresent}
                inert={!isPresent}
            >
                {children}
            </div>
        );
    }

    return (
        <motion.div
            data-wallet-execution-panel={kind}
            className="w-full overflow-hidden"
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : swapFlowTransition}
            aria-hidden={!isPresent}
            inert={!isPresent}
        >
            <div className="flex w-full flex-col gap-2">{children}</div>
        </motion.div>
    );
}
