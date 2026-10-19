// All height-changing parts of a swap handoff must use Motion's frame loop.
// Matching CSS transition durations isn't enough: CSS can start a frame later
// than Motion, briefly adding more steps height than the quote has released.
export const swapFlowTransition = {
    duration: 0.3,
    ease: [0.42, 0, 0.58, 1] as const,
};
