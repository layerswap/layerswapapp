import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useHydratedReducedMotion } from '@layerswap/ui-kit';
import type { ReactNode } from 'react';

/** Animate action changes; the enclosing workflow owns the initial appearance. */
export function WalletActionTransition({
    actionKey,
    children,
}: {
    actionKey?: string;
    children: ReactNode;
}) {
    const reducedMotion = useHydratedReducedMotion();

    if (reducedMotion) return <div>{children}</div>;

    return (
        <AnimatePresence initial={false} mode="wait">
            <ActionContent key={actionKey}>{children}</ActionContent>
        </AnimatePresence>
    );
}

function ActionContent({ children }: { children: ReactNode }) {
    const isPresent = useIsPresent();
    return (
        <motion.div
            aria-hidden={!isPresent}
            inert={!isPresent}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            {children}
        </motion.div>
    );
}
