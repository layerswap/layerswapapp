import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import useMeasure from "react-use-measure";

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
                        // opacity: 0,
                        x: 382,
                    }}
                    animate={{
                        // opacity: 1,
                        x: 0,
                        // transition: { duration: duration / 2, delay: duration / 2 },
                    }}
                    exit={{
                        // opacity: 0,
                        x: -382,
                        // transition: { duration: duration / 2 }
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