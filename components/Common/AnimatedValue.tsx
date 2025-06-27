import { motion, AnimatePresence } from 'framer-motion'
import { FC, useEffect, useState, ReactNode } from 'react'

type AnimatedValueProps = {
    value: string | number | null | undefined;
    className?: string;
};

export const AnimatedValue: FC<AnimatedValueProps> = ({ value, className }) => {
    const [previousValue, setPreviousValue] = useState<ReactNode | null>(null);
    const [currentValue, setCurrentValue] = useState<ReactNode | null>(value);
    const [isAnimating, setIsAnimating] = useState(false);


    useEffect(() => {
        if (value !== currentValue) {
            setPreviousValue(currentValue);
            setIsAnimating(true);

            const timeout = setTimeout(() => {
                setCurrentValue(value);
                setIsAnimating(false);
            }, 500); // match animation duration

            return () => clearTimeout(timeout);
        }
    }, [value, currentValue]);

    return (
        <span className={`relative inline-block ${className}`}>
            {/* Reserve layout space */}
            <span className="invisible">{currentValue}</span>

            {/* Animate old + new values */}
            <span className="absolute left-0 top-0 w-full">
                <AnimatePresence mode="wait">
                    {isAnimating && previousValue !== null && (
                        <motion.span
                            key="prev"
                            initial={{ opacity: 1, y: 0 }}
                            animate={{ opacity: 0, y: -15 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0"
                        >
                            {previousValue}
                        </motion.span>
                    )}

                    {!isAnimating && currentValue !== null && (
                        <motion.span
                            key="next"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0"
                        >
                            {currentValue}
                        </motion.span>
                    )}
                </AnimatePresence>
            </span>
        </span>
    );
};
