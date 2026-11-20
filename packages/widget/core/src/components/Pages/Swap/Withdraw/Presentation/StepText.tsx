import { animate } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { useClientLayoutEffect } from '@/hooks/useClientLayoutEffect';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';

export const stepTextTransition = {
    duration: 0.15,
    ease: [0.42, 0, 0.58, 1] as const,
};

/** Animate rendered text changes without remounting timers, links or shimmer. */
export function StepText({ children, className }: {
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const reducedMotion = useHydratedReducedMotion();

    useClientLayoutEffect(() => {
        const element = ref.current;
        const Observer = element?.ownerDocument.defaultView?.MutationObserver;
        if (!element || !Observer || reducedMotion) return;

        let previousText = element.textContent;
        let animation: ReturnType<typeof animate> | undefined;
        const reset = () => {
            element.style.removeProperty('opacity');
            element.style.removeProperty('transform');
            element.style.removeProperty('filter');
        };
        const observer = new Observer(() => {
            const text = element.textContent;
            // Polling can recreate JSX with identical text. Only visible text
            // changes should animate, including updates inside a child timer.
            if (text === previousText) return;
            previousText = text;
            animation?.stop();
            if (!text) {
                reset();
                return;
            }
            animation = animate(element, {
                opacity: [0, 1],
                y: [4, 0],
                filter: ['blur(2px)', 'blur(0px)'],
            }, stepTextTransition);
        });
        observer.observe(element, { subtree: true, childList: true, characterData: true });
        return () => {
            observer.disconnect();
            animation?.stop();
            reset();
        };
    }, [reducedMotion]);

    return <div ref={ref} className={className} data-step-text>{children}</div>;
}
