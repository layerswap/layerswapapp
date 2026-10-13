import { Check, X } from 'lucide-react';
import clsx from 'clsx';
import { ProgressStatus, type StatusStep } from './types';
import { StepTransactionLink } from './StepTransactionLink';

function renderStepIcon(step: StatusStep) {
    const markerClass =
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full';

    switch (step.status) {
        case ProgressStatus.Complete:
            return (
                <span className={clsx(markerClass, 'bg-primary/20')}>
                    <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                </span>
            );
        case ProgressStatus.Failed:
            return (
                <span className={clsx(markerClass, 'bg-primary/20')}>
                    <X className="h-3 w-3 text-primary" strokeWidth={3} />
                </span>
            );
        case ProgressStatus.Current:
            if (step.isLoading === false) {
                return (
                    <span
                        className={clsx(
                            markerClass,
                            'border-2 border-primary/40 bg-primary/10',
                        )}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                );
            }
        // Current and delayed steps share the same compact loading indicator.
        case ProgressStatus.Delayed:
            return (
                <span
                    className={clsx(
                        markerClass,
                        'animate-spin motion-reduce:animate-none border-2 border-primary/20 border-t-primary',
                        {
                            'opacity-50':
                                step.status === ProgressStatus.Delayed,
                        },
                    )}
                />
            );
        default:
            return (
                <span
                    className={clsx(markerClass, 'border-2 border-primary/20')}
                />
            );
    }
}

function Step({ step, isLastStep }: { step: StatusStep; isLastStep: boolean }) {
    return (
        <li
            className={clsx(
                'grid gap-x-2.5',
                step.explorerUrl
                    ? 'grid-cols-[32px_minmax(0,1fr)_auto]'
                    : 'grid-cols-[32px_minmax(0,1fr)]',
            )}
        >
            <div className="flex flex-col items-center" aria-hidden="true">
                {renderStepIcon(step)}
                {!isLastStep && (
                    <span
                        className={clsx(
                            'my-1 min-h-4 w-0.5 flex-1 rounded-full',
                            {
                                'bg-primary/20':
                                    step.status !== ProgressStatus.Complete &&
                                    step.status !== ProgressStatus.Failed,
                                'bg-primary':
                                    step.status === ProgressStatus.Complete ||
                                    step.status === ProgressStatus.Failed,
                            },
                        )}
                    />
                )}
            </div>
            <div className={clsx('min-w-0', { 'pb-4': !isLastStep })}>
                <span
                    className={clsx('block text-sm font-medium leading-5', {
                        'text-primary': step.status === ProgressStatus.Current,
                        'text-secondary-text/70':
                            step.status === ProgressStatus.Upcoming,
                        'text-primary-text':
                            step.status !== ProgressStatus.Current &&
                            step.status !== ProgressStatus.Upcoming,
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
