import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import {
    swapFlowTransition,
    swapFlowTransitionStyle,
} from './swapFlowAnimation';
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
    return (
        <div
            className="w-full"
            data-quote-layout={compactQuote ? 'attached' : 'separate'}
        >
            <div
                className="relative z-10 rounded-2xl bg-secondary-500 transition-[border-radius] motion-reduce:transition-none"
                style={{
                    ...swapFlowTransitionStyle,
                    borderBottomLeftRadius: compactQuote && quote ? 0 : 16,
                    borderBottomRightRadius: compactQuote && quote ? 0 : 16,
                }}
            >
                {summary}
            </div>
            <div
                data-quote-transition
                hidden={!quote}
                className="transition-[margin-top] motion-reduce:transition-none"
                style={{
                    ...swapFlowTransitionStyle,
                    marginTop: compactQuote ? 0 : 8,
                }}
            >
                <div
                    className="overflow-hidden rounded-2xl bg-secondary-500 transition-[border-radius] motion-reduce:transition-none"
                    style={{
                        ...swapFlowTransitionStyle,
                        borderTopLeftRadius: compactQuote ? 0 : 16,
                        borderTopRightRadius: compactQuote ? 0 : 16,
                    }}
                >
                    <div
                        className="grid transition-[grid-template-rows,opacity] motion-reduce:transition-none"
                        style={{
                            ...swapFlowTransitionStyle,
                            gridTemplateRows: compactQuote ? '1fr' : '0fr',
                            opacity: compactQuote ? 1 : 0,
                        }}
                        aria-hidden="true"
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="mx-3 border-t border-secondary-300" />
                        </div>
                    </div>
                    {quote}
                </div>
            </div>
        </div>
    );
}

// Keep the overview and controller ancestors stable when the flow changes animation mode.
export function SwapContentView({
    flow,
    summary,
    quote,
    compactQuote = flow?.compactQuote ?? false,
    transferStage = flow?.transferStage,
    children,
}: {
    flow?: ResolvedSwapFlow;
    summary: ReactNode;
    quote?: ReactNode;
    compactQuote?: boolean;
    transferStage?: 'withdraw' | 'processing';
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
                animate={!!transferStage}
                overview={overview}
                workflow={transferStage === 'processing' ? children : undefined}
                controls={transferStage !== 'processing' ? children : undefined}
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
    children: ReactNode;
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
