import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import type { ReactNode } from 'react';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { swapFlowTransition } from './swapFlowAnimation';

export function WalletExecutionTransition({
    overview,
    workflow,
    controls,
    animate = true,
}: {
    overview?: ReactNode;
    workflow?: ReactNode;
    controls?: ReactNode;
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
}: {
    children: ReactNode;
    kind: 'overview' | 'workflow' | 'controls';
    reducedMotion: boolean;
    animate: boolean;
}) {
    const isPresent = useIsPresent();

    // The shared steps panel owns its height animation in every flow.
    // Animate the overview and controls here; steps keep their own animation.
    if (kind === 'workflow') {
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
            <div className="flex w-full flex-col gap-2">{children}</div>
        </motion.div>
    );
}
