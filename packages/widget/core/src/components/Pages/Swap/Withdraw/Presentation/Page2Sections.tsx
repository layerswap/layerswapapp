import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { swapFlowTransition } from './swapFlowAnimation';
import type { ReactNode } from 'react';
import { WalletExecutionTransition } from './WalletExecutionTransition';
import type { ResolvedSwapFlow } from '@/components/utils/resolveSwapFlow';

export function SwapOverviewView({
    summary,
    quote,
    compactQuote = false,
}: {
    summary: ReactNode;
    quote?: ReactNode;
    compactQuote?: boolean;
}) {
    const reducedMotion = useHydratedReducedMotion();
    const transition = reducedMotion ? { duration: 0 } : swapFlowTransition;
    return (
        <div
            className="w-full"
            data-quote-layout={compactQuote ? 'attached' : 'separate'}
        >
            <motion.div
                className="relative z-10 rounded-2xl bg-secondary-500"
                initial={false}
                transition={transition}
                animate={{
                    borderBottomLeftRadius: compactQuote && quote ? 0 : 16,
                    borderBottomRightRadius: compactQuote && quote ? 0 : 16,
                }}
            >
                {summary}
            </motion.div>
            <motion.div
                data-quote-transition
                hidden={!quote}
                initial={false}
                transition={transition}
                animate={{
                    marginTop: compactQuote ? 0 : 8,
                }}
            >
                <motion.div
                    className="overflow-hidden rounded-2xl bg-secondary-500"
                    initial={false}
                    transition={transition}
                    animate={{
                        borderTopLeftRadius: compactQuote ? 0 : 16,
                        borderTopRightRadius: compactQuote ? 0 : 16,
                    }}
                >
                    <motion.div
                        className="grid"
                        initial={false}
                        transition={transition}
                        animate={{
                            gridTemplateRows: compactQuote ? '1fr' : '0fr',
                            opacity: compactQuote ? 1 : 0,
                        }}
                        aria-hidden="true"
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 border-t border-secondary-300" />
                        </div>
                    </motion.div>
                    {quote}
                </motion.div>
            </motion.div>
        </div>
    );
}

// Keep the overview and controller ancestors stable when the flow changes animation mode.
export function SwapContentView({
    flow,
    summary,
    quote,
    compactQuote = flow?.compactQuote ?? false,
    stage = flow?.transferStage,
    animateControls = flow ? !!flow.transferStage : true,
    progress,
    children,
}: {
    flow?: ResolvedSwapFlow;
    summary: ReactNode;
    quote?: ReactNode;
    compactQuote?: boolean;
    stage?: 'withdraw' | 'processing';
    animateControls?: boolean;
    progress?: ReactNode;
    children?: ReactNode;
}) {
    const overview = summary ? (
        <SwapOverviewView
            summary={summary}
            quote={quote}
            compactQuote={compactQuote}
        />
    ) : undefined;

    return (
        <div className="w-full flex flex-col gap-2 text-secondary-text" data-swap-flow={flow?.kind} data-flow-evidence={flow?.evidence}>
            <WalletExecutionTransition
                animate={animateControls}
                overview={overview}
                workflow={progress}
                controls={children}
                controlsKey={stage}
            />
        </div>
    );
}
export function WalletTransferView({
    warning,
    children,
}: {
    warning?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2.5">
            {warning}
            {children}
        </div>
    );
}
export function ProcessingSectionView({
    children,
    actions,
}: {
    children?: ReactNode;
    actions?: ReactNode;
}) {
    const reducedMotion = useHydratedReducedMotion();
    const controls = actions ? (
        <ProcessingActions>{actions}</ProcessingActions>
    ) : null;

    return (
        <div className="w-full">
            {children}
            {reducedMotion ? (
                controls
            ) : (
                <AnimatePresence initial={false} propagate={!!actions}>
                    {controls}
                </AnimatePresence>
            )}
        </div>
    );
}

function ProcessingActions({ children }: { children: ReactNode }) {
    const reducedMotion = useHydratedReducedMotion();
    const isPresent = useIsPresent();

    return (
        <motion.div
            data-processing-actions
            className="overflow-hidden"
            initial={false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : swapFlowTransition}
            aria-hidden={!isPresent}
            inert={!isPresent}
        >
            {/* Collapse the retry controls and their spacing with the steps. */}
            <div className="pt-3">{children}</div>
        </motion.div>
    );
}
export function PendingSwapView({
    contained,
    children,
}: {
    contained?: boolean;
    children?: ReactNode;
}) {
    return (
        <div
            className={
                contained
                    ? 'w-full'
                    : 'rounded-lg w-full overflow-hidden relative h-[548px]'
            }
        >
            {children}
        </div>
    );
}

export function WalletSubmissionView({ children }: { children: ReactNode }) {
    return (
        <div className="w-full space-y-2 flex flex-col justify-between h-full text-primary-text">
            {children}
        </div>
    );
}
