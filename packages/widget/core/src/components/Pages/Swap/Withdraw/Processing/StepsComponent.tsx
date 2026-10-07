import { motion, useIsPresent } from 'framer-motion';
import {
    createContext,
    useContext,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { swapFlowTransition } from '../Presentation/swapFlowAnimation';
import Step from './Step';
import type { StatusStep } from './types';

const VisibleStepsPanels = createContext<Set<symbol> | null>(null);

/** Keep entrance state across the wallet-to-processing controller handoff. */
export function StepsPanelProvider({ children }: { children: ReactNode }) {
    const panels = useRef(new Set<symbol>());
    return (
        <VisibleStepsPanels.Provider value={panels.current}>
            {children}
        </VisibleStepsPanels.Provider>
    );
}

/** One entrance animation for every wallet, swap, deposit and refund panel. */
export function StepsPanel({
    children,
    label,
}: {
    children: ReactNode;
    label?: string;
}) {
    const reducedMotion = useHydratedReducedMotion();
    const isPresent = useIsPresent();
    const panels = useContext(VisibleStepsPanels);
    // A replacement renders before the outgoing panel's layout-effect cleanup.
    // Capture that continuity once; a genuinely absent panel can enter again.
    const [continuesVisiblePanel] = useState(() => !!panels?.size);
    useLayoutEffect(() => {
        if (!panels) return;
        const panel = Symbol();
        panels.add(panel);
        return () => {
            panels.delete(panel);
        };
    }, [panels]);

    return (
        <motion.section
            aria-label={label}
            data-steps-panel
            className="w-full overflow-hidden rounded-2xl bg-secondary-500 font-normal"
            initial={
                reducedMotion || continuesVisiblePanel
                    ? false
                    : { height: 0, opacity: 0 }
            }
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : swapFlowTransition}
            aria-hidden={!isPresent}
            inert={!isPresent}
        >
            <div className="px-3 py-4">{children}</div>
        </motion.section>
    );
}

export default function Steps({ steps }: { steps: StatusStep[] }) {
    return (
        <nav aria-label="Progress">
            <ol role="list">
                {steps.map((step, index) => (
                    <Step
                        key={index}
                        step={step}
                        isLastStep={index === steps.length - 1}
                    />
                ))}
            </ol>
        </nav>
    );
}
