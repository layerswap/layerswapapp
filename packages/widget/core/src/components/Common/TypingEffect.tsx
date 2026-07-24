import { motion, useInView } from "framer-motion"
import { useEffect, useRef } from "react"

type TypingEffectProps = {
    text: string;
    onComplete?: () => void;
    withShine?: boolean;
    className?: string;
}

export function TypingEffect({ text = 'Typing Effect', onComplete, withShine = true, className }: TypingEffectProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (isInView && onComplete) {
            const totalDuration = (text.length - 1) * 0.1 + 0.05;
            const timeout = setTimeout(() => {
                onComplete();
            }, totalDuration * 1000);

            return () => clearTimeout(timeout);
        }
    }, [isInView, text.length, onComplete]);

    const shineClasses = withShine
        ? "text-transparent bg-[linear-gradient(120deg,var(--color-primary-text-tertiary)_40%,var(--color-primary-text),var(--color-primary-text-tertiary)_60%)] bg-size-[200%_100%] bg-clip-text animate-shine"
        : "";

    return (
        <div
            ref={ref}
            className={className ?? `text-base font-normal leading-5 pl-1 top-0 z-50 items-baseline ${shineClasses}`}
            key={text}
        >
            {text.split('').map((letter, index) => (
                <motion.span
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.01, delay: index * 0.08 }}
                >
                    {letter}
                </motion.span>
            ))}
        </div>
    );
}
