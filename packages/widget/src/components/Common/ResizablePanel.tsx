import { useMeasure } from "@uidotdev/usehooks";
import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

type ResizablePanelProps = {
    children: ReactNode;
    className?: string;
    /**
     * When provided, the panel only *tweens* its height when this key changes
     * (i.e. a step/view transition). For every other height change — an
     * accordion opening, a quote loading, a wallet list expanding — it snaps to
     * the new size instantly and lets the inner element run its own animation.
     *
     * This is the fix for the deposit jitter: stacking a height tween here on
     * top of an inner one (the accordion animates its own height) made the two
     * fight through ResizeObserver — the panel lagged the content and clipped
     * whatever sat below the growing element (the Continue button). Snapping
     * keeps the panel exactly the size of its content every frame, so the inner
     * animation reads cleanly and nothing is clipped.
     *
     * Omit it to keep the original "animate any height change" behaviour.
     */
    transitionKey?: string | number;
};

export default function ResizablePanel({ children, className, transitionKey }: ResizablePanelProps) {
    const [ref, { height }] = useMeasure();
    const stepMode = transitionKey !== undefined;

    // In step mode the tween is off by default and switched on for a short
    // window right after `transitionKey` changes, so only the transition itself
    // animates. In plain mode the tween is always on (legacy behaviour).
    const [tweening, setTweening] = useState(!stepMode);

    useEffect(() => {
        if (!stepMode) return;
        setTweening(true);
        const t = setTimeout(() => setTweening(false), 250);
        return () => clearTimeout(t);
    }, [transitionKey, stepMode]);

    return (
        <motion.div
            animate={{ height: height || "auto" }}
            transition={tweening ? { duration: 0.2, ease: "easeInOut" } : { duration: 0 }}
            style={{ width: "100%" }}
            className="relative overflow-hidden"
        >
            <div ref={ref} className={className}>
                {children}
            </div>
        </motion.div>
    );
}
