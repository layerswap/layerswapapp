import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import type { ReactNode } from 'react';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { swapFlowTransition } from './swapFlowAnimation';
import { StepsPanelProvider } from '../Processing/StepsComponent';

export function WalletExecutionTransition({
    overview,
    workflow,
    controls,
    controlsKey = 'controls',
    animate = true,
    gap = 8,
}: {
    overview?: ReactNode;
    workflow?: ReactNode;
    controls?: ReactNode;
    controlsKey?: string;
    animate?: boolean;
    gap?: 8 | 12;
}) {
    const reducedMotion = useHydratedReducedMotion();
    const gapClassName = gap === 12 ? 'gap-3' : 'gap-2';
    const panels = [
        overview && (
            <ExecutionPanel
                key="overview"
                kind="overview"
                reducedMotion={reducedMotion}
                animate={animate}
                className={gapClassName}
            >
                {overview}
            </ExecutionPanel>
        ),
        workflow && (
            <ExecutionPanel
                key="workflow"
                kind="workflow"
                reducedMotion={reducedMotion}
                animate={animate}
                className={gapClassName}
            >
                {workflow}
            </ExecutionPanel>
        ),
        controls && (
            <ExecutionPanel
                key={controlsKey}
                kind="controls"
                reducedMotion={reducedMotion}
                animate={animate}
                className={gapClassName}
            >
                {controls}
            </ExecutionPanel>
        ),
    ];

    return (
        // The stack owns section spacing; empty panels stay mounted without reserving a gap.
        <div
            data-wallet-execution-stack
            data-wallet-execution-empty={
                (!overview && !workflow && !controls) || undefined
            }
            className={`flex w-full flex-col ${gapClassName}`}
        >
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
    kind: 'overview' | 'workflow' | 'controls';
    reducedMotion: boolean;
    animate: boolean;
    className: string;
}) {
    const isPresent = useIsPresent();

    // The shared steps panel owns its height animation in every flow.
    // Animate the overview and controls here; steps keep their own animation.
    if (kind === 'workflow') {
        return (
            <div
                data-wallet-execution-panel={kind}
                className={`flex w-full flex-col empty:hidden ${className}`}
                aria-hidden={!isPresent}
                inert={!isPresent}
            >
                <StepsPanelProvider>{children}</StepsPanelProvider>
            </div>
        );
    }

    // Release a departing panel's flex gap along with its height. Empty nested
    // controls also release the gap while their controllers remain mounted.
    // A warning or another sibling keeps the section gap.
    const emptyFooterGapClassName =
        className === 'gap-3'
            ? '[&:not(:only-child)[inert]]:-mb-3 [&:not(:first-child):has([data-wallet-execution-empty]):not(:has(:not(:only-child):not([data-wallet-execution-empty]_*)))]:-mb-3'
            : '[&:not(:only-child)[inert]]:-mb-2 [&:not(:first-child):has([data-wallet-execution-empty]):not(:has(:not(:only-child):not([data-wallet-execution-empty]_*)))]:-mb-2';
    return (
        <motion.div
            data-wallet-execution-panel={animate ? kind : undefined}
            className={`flex w-full flex-col overflow-hidden empty:hidden motion-safe:transition-[margin-bottom] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.42,0,0.58,1)] ${emptyFooterGapClassName} ${className}`}
            initial={!animate || reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
                !animate || reducedMotion ? { duration: 0 } : swapFlowTransition
            }
            aria-hidden={!isPresent}
            inert={!isPresent}
        >
            <StepsPanelProvider>{children}</StepsPanelProvider>
        </motion.div>
    );
}
