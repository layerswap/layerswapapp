import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { Gauge } from '../Processing/gauge';
import { stepTextTransition } from './StepText';

export function TransferStatusHeader({
    title,
    description,
    progress,
    completed = false,
    icon,
}: {
    title: string;
    description?: ReactNode;
    progress: number;
    completed?: boolean;
    icon?: ReactNode;
}) {
    const reducedMotion = useHydratedReducedMotion();
    return (
        <div className="flex items-center gap-2.5 border-b-2 border-dashed border-secondary-300 pb-4">
            {icon ? (
                <div className="shrink-0">{icon}</div>
            ) : (
                <div
                    className="shrink-0"
                    role="progressbar"
                    aria-label="Transfer progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                >
                    <Gauge
                        value={progress}
                        size="verySmall"
                        showCheckmark={completed}
                    />
                </div>
            )}
            <h3
                aria-label={title}
                className="min-w-0 flex-1 text-sm font-medium text-primary-text"
            >
                <span aria-hidden="true" className="block" data-transfer-title>
                    {reducedMotion ? (
                        title
                    ) : (
                        <AnimatePresence initial={false} mode="wait">
                            <motion.span
                                key={title}
                                className="block"
                                initial={{
                                    opacity: 0,
                                    y: 4,
                                    filter: 'blur(2px)',
                                }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    filter: 'blur(0px)',
                                }}
                                exit={{
                                    opacity: 0,
                                    y: -4,
                                    filter: 'blur(2px)',
                                }}
                                transition={stepTextTransition}
                            >
                                {title}
                            </motion.span>
                        </AnimatePresence>
                    )}
                </span>
            </h3>
            {description && (
                <div className="max-w-[45%] text-right text-xs text-secondary-text">
                    {description}
                </div>
            )}
        </div>
    );
}
