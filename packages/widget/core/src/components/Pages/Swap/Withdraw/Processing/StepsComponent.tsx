import { motion, useIsPresent } from 'framer-motion';
import {
    createContext,
    useContext,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useHydratedReducedMotion } from '@layerswap/ui-kit';
import { swapFlowTransition } from '../Presentation/swapFlowAnimation';
import Step from './Step';
import type { StatusStep } from './types';

const VisibleStepsPanels = createContext<Set<symbol> | null>(null);

/** Nested transitions share the outer execution slot's continuity, not its siblings'. */
export function StepsPanelProvider({ children }: { children: ReactNode }) {
    const outerPanels = useContext(VisibleStepsPanels);
    const panels = useRef(new Set<symbol>());
    return (
        <VisibleStepsPanels.Provider value={outerPanels ?? panels.current}>
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
            <ol role="list" className="space-y-1">
                {steps.map((step) => (
                    <Step key={step.id} step={step} />
                ))}
            </ol>
        </nav>
    );
}
