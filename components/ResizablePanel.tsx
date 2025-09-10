import { useMeasure } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

export default function ResizablePanel({ children, className }: { children: ReactNode, className?: string }) {
    let [ref] = useMeasure();

    return (
        <motion.div
            animate={{ height: "auto", width: "100%" }}
            className="relative overflow-hidden"
        >
            <AnimatePresence initial={false}>
                <div
                    ref={ref}
                    className={className}
                >
                    {children}
                </div>
            </AnimatePresence>
        </motion.div>
    );
}