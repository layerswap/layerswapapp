import { useBalanceStore } from "@/stores/balanceStore"
import { motion, useInView } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"

const randomWords = [
    'Marinading',
    "Fermenting",
    "Steeping",
    "Infusing",
    "Polishing",
    "Spicing",
    "Compiling",
    "Brewing",
    "Spinning",
    "Booting",
    "Rendering",
    "Synthesizing",
    "Inferring",
    "Neuralizing",
    "Augmenting",
    "Finalizing",
    "Cooking"
]

const SuggestionsHeader = () => {
    const isLoading = useBalanceStore(s => s.sortingDataIsLoading)
    const partialPublished = useBalanceStore(s => s.partialPublished)

    const suggestionsTitle = useMemo(() => isLoading ? `${randomWords[Math.floor(Math.random() * randomWords.length)]}` : '', [isLoading, partialPublished])
    const [typingComplete, setTypingComplete] = useState(!isLoading)
    const [textToType, setTextToType] = useState(suggestionsTitle)

    useEffect(() => {
        if (isLoading) {
            setTypingComplete(false)
            setTextToType(suggestionsTitle)
        }
    }, [isLoading, suggestionsTitle])


    if (!isLoading && typingComplete) {
        return <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline">Suggestions</div>
    }

    return <TypingEffect text={`${textToType} Suggestions`} onComplete={() => setTypingComplete(true)} />
}

export function TypingEffect({ text = 'Typing Effect', onComplete }: { text: string; onComplete?: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (isInView && onComplete) {
            // Calculate total animation duration: (text.length - 1) * 0.1 (delay) + 0.2 (duration)
            const totalDuration = (text.length - 1) * 0.1 + 0.05;
            const timeout = setTimeout(() => {
                onComplete();
            }, totalDuration * 1000); // Convert to milliseconds

            return () => clearTimeout(timeout);
        }
    }, [isInView, text.length, onComplete]);

    return (
        <div ref={ref} className="text-transparent text-base font-normal leading-5 pl-1  top-0 z-50  items-baseline bg-[linear-gradient(120deg,var(--color-primary-text-tertiary)_40%,var(--color-primary-text),var(--color-primary-text-tertiary)_60%)]
         bg-[length:200%_100%]
         bg-clip-text
         animate-shine"
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
        </div >
    );
}

export default SuggestionsHeader;