import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { useMeasure } from "@uidotdev/usehooks";

export default function ResizablePanel({ children, className }: { children: ReactNode, className?: string }) {
    let [ref, { height }] = useMeasure();

    return (
        <motion.div
            animate={{ height: height || "auto" }}
            className="relative overflow-hidden"
        >
            <AnimatePresence initial={false}>
                <motion.div
                    key={JSON.stringify(children, ignoreCircularReferences())}
                    initial={{
                        x: 382,
                    }}
                    animate={{
                        x: 0,
                    }}
                    exit={{
                        x: -382,
                    }}
                >
                    <div
                        ref={ref}
                        className={`${className}`}
                    >
                        {children}
                    </div>
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}

const ignoreCircularReferences = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (key.startsWith("_")) return; // Don't compare React's internal props.
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return;
            seen.add(value);
        }
        return value;
    };
};