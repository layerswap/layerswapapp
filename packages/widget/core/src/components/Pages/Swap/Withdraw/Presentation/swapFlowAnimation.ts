import type { CSSProperties } from 'react';

// Quote compaction and wallet steps exchange height on the same timeline.
export const swapFlowTransition = {
    duration: 0.3,
    ease: [0.42, 0, 0.58, 1] as const,
};

export const swapFlowTransitionStyle: CSSProperties = {
    transitionDuration: `${swapFlowTransition.duration * 1000}ms`,
    transitionTimingFunction: `cubic-bezier(${swapFlowTransition.ease.join(',')})`,
};
