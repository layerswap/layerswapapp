import { motion, AnimatePresence } from 'framer-motion'
import { FC } from 'react'

type AnimatedValueProps = {
    value: string | number | null | undefined;
    className?: string;
};

export const AnimatedValue: FC<AnimatedValueProps> = ({ value, className }) => {

    return (
        <span className={`relative inline-block overflow-hidden w-full ${className}`}>
            <AnimatePresence>
                <motion.span
                    key={value}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 w-full"
                >
                    {value}
                </motion.span>
            </AnimatePresence>

            <span className="invisible">{value}</span>
        </span>
    );
};
