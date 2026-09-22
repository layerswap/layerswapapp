import { AnimatePresence, motion } from 'framer-motion';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import type { ReactNode } from 'react';

/** Preserve action identity between updates, just as in the live wallet flow. */
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
        <AnimatePresence mode="wait">
            <motion.div
                key={actionKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
