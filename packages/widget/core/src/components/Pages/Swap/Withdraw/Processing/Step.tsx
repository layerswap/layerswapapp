import { Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useHydratedReducedMotion } from '@/hooks/useHydratedReducedMotion';
import { ProgressStatus, type StatusStep } from './types';
import { StepTransactionLink } from './StepTransactionLink';

const completionSpring = {
    type: 'spring',
    stiffness: 640,
    damping: 22,
    mass: 0.7,
} as const;

function StepMarker({ step }: { step: StatusStep }) {
    const reducedMotion = useHydratedReducedMotion();
    const settled =
        step.status === ProgressStatus.Complete ||
        step.status === ProgressStatus.Failed;
    const waiting =
        step.status === ProgressStatus.Current && step.isLoading === false;
    const active =
        !waiting &&
        (step.status === ProgressStatus.Current ||
            step.status === ProgressStatus.Delayed);

    return (
        <span
            className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center"
            aria-hidden="true"
        >
            <AnimatePresence initial={false}>
                {settled ? (
                    <motion.span
                        key={step.status}
                        className={clsx(
                            'col-start-1 row-start-1 grid h-4 w-4 place-items-center rounded-[5px]',
                            {
                                'bg-primary/20 text-primary':
                                    step.status === ProgressStatus.Complete,
                                'bg-error-background text-error-foreground':
                                    step.status === ProgressStatus.Failed,
                            },
                        )}
                        initial={
                            reducedMotion ? false : { opacity: 0, scale: 0.4 }
                        }
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0 } }}
                        transition={
                            reducedMotion ? { duration: 0 } : completionSpring
                        }
                    >
                        {step.status === ProgressStatus.Complete ? (
                            <Check className="h-3 w-3" strokeWidth={3} />
                        ) : (
                            <X className="h-3 w-3" strokeWidth={3} />
                        )}
                    </motion.span>
                ) : active ? (
                    <span
                        key="active"
                        className={clsx(
                            'col-start-1 row-start-1 h-3.5 w-3.5 rounded-full border-2 border-primary/20 border-t-primary animate-spin motion-reduce:animate-none',
                            {
                                'opacity-50':
                                    step.status === ProgressStatus.Delayed,
                            },
                        )}
                    />
                ) : waiting ? (
                    <span
                        key="waiting"
                        className="col-start-1 row-start-1 grid h-3.5 w-3.5 place-items-center rounded-full border border-primary/50"
                    >
                        <span className="h-1 w-1 rounded-full bg-primary" />
                    </span>
                ) : (
                    <span
                        key="pending"
                        className="col-start-1 row-start-1 h-1.5 w-1.5 rounded-[2px] bg-secondary-text/40"
                    />
                )}
            </AnimatePresence>
        </span>
    );
}

function Step({ step }: { step: StatusStep }) {
    const active =
        step.status === ProgressStatus.Current && step.isLoading !== false;
    return (
        <li
            data-status-step={step.id}
            aria-current={
                step.status === ProgressStatus.Current ? 'step' : undefined
            }
            className={clsx(
                'grid min-h-7 items-start gap-x-2.5 py-1',
                step.explorerUrl
                    ? 'grid-cols-[16px_minmax(0,1fr)_auto]'
                    : 'grid-cols-[16px_minmax(0,1fr)]',
            )}
        >
            <StepMarker step={step} />
            <div className="min-w-0 break-words">
                <span
                    className={clsx('block text-sm font-medium leading-5', {
                        'step-label-shimmer': active,
                        'text-primary': step.status === ProgressStatus.Current,
                        'text-secondary-text/70':
                            step.status === ProgressStatus.Upcoming,
                        'text-error-foreground':
                            step.status === ProgressStatus.Failed,
                        'text-primary-text':
                            step.status !== ProgressStatus.Current &&
                            step.status !== ProgressStatus.Upcoming &&
                            step.status !== ProgressStatus.Failed,
                    })}
                >
                    {step.name}
                </span>
                {step.description && (
                    <div className="text-xs leading-4 text-secondary-text">
                        {step.description}
                    </div>
                )}
            </div>
            {step.explorerUrl && (
                <div className="flex h-5 items-center justify-end">
                    <StepTransactionLink
                        url={step.explorerUrl}
                        stepName={step.name}
                        readOnly={step.readOnly}
                    />
                </div>
            )}
        </li>
    );
}

export default Step;
