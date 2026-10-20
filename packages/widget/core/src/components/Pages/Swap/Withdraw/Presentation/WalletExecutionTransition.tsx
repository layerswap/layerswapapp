import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import type { ReactNode } from 'react';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { swapFlowTransition } from './swapFlowAnimation';

/** Callers resolve section visibility before constructing their views. */
export function WalletExecutionTransition({
    overview,
    workflow,
    controls,
    controlsKey = 'controls',
    animate = true,
    gap = 8,
    initial = false,
}: {
    overview?: ReactNode;
    workflow?: ReactNode;
    controls?: ReactNode;
    controlsKey?: string;
    animate?: boolean;
    gap?: 8 | 12;
    initial?: boolean;
}) {
    const reducedMotion = useHydratedReducedMotion();
    return (
        <div data-wallet-execution-stack className="flex w-full flex-col">
            <AnimatePresence initial={initial} mode="sync">
                {overview ? (
                    <ExecutionPanel
                        key="overview"
                        kind="overview"
                        animate={animate}
                        reducedMotion={reducedMotion}
                    >
                        {overview}
                    </ExecutionPanel>
                ) : null}
                {workflow ? (
                    <ExecutionPanel
                        key="workflow"
                        kind="workflow"
                        gap={overview ? gap : 0}
                        animate={true}
                        reducedMotion={reducedMotion}
                    >
                        {workflow}
                    </ExecutionPanel>
                ) : null}
                {controls ? (
                    <ExecutionPanel
                        key={controlsKey}
                        kind="controls"
                        gap={overview || workflow ? gap : 0}
                        animate={animate}
                        reducedMotion={reducedMotion}
                    >
                        {controls}
                    </ExecutionPanel>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function ExecutionPanel({
    children,
    kind,
    gap = 0,
    animate,
    reducedMotion,
}: {
    children: ReactNode;
    kind: string;
    gap?: number;
    animate: boolean;
    reducedMotion: boolean;
}) {
    const isPresent = useIsPresent();
    return (
        <motion.div
            data-wallet-execution-panel={kind}
            className="w-full overflow-hidden"
            initial={
                !animate || reducedMotion ? false : { height: 0, opacity: 0 }
            }
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
                !animate || reducedMotion ? { duration: 0 } : swapFlowTransition
            }
            aria-hidden={!isPresent}
            inert={!isPresent}
        >
            <div
                style={{ paddingTop: gap }}
                className="flex w-full flex-col gap-2"
            >
                {children}
            </div>
        </motion.div>
    );
}
