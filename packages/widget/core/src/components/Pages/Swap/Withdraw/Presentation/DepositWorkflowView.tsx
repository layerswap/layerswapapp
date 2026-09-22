import type { DepositAction } from '@/lib/apiClients/layerSwapApiClient';
import {
    getDepositActionDescription,
    getDepositActionLabel,
} from '@/helpers/depositActions';
import Steps from '../Processing/StepsComponent';
import { ProgressStatus, type StatusStep } from '../Processing/types';

export function DepositWorkflowView({
    actions,
    loading,
    error,
    actionStateText,
}: {
    actions?: DepositAction[];
    loading?: boolean;
    error?: boolean;
    actionStateText?: string;
}) {
    const workflowActions = actions?.filter((action) => !!action.step) ?? [];
    const currentStepIndex = workflowActions.findIndex(
        (action) =>
            action.status === 'action_required' ||
            action.status === 'pending' ||
            action.status === 'failed',
    );
    const currentStepHasError =
        !loading &&
        error &&
        workflowActions[currentStepIndex]?.status !== 'pending';
    const steps: StatusStep[] = workflowActions.map((action, index) => ({
        name: getDepositActionLabel(action),
        status:
            action.status === 'completed'
                ? ProgressStatus.Complete
                : action.status === 'failed' ||
                    (index === currentStepIndex && currentStepHasError)
                  ? ProgressStatus.Failed
                  : index === currentStepIndex
                    ? ProgressStatus.Current
                    : ProgressStatus.Upcoming,
        isLoading:
            index === currentStepIndex &&
            (!!loading || action.status === 'pending'),
        description:
            action.status === 'failed'
                ? action.detail
                : index === currentStepIndex
                  ? (loading || action.status === 'pending'
                        ? actionStateText
                        : undefined) || getDepositActionDescription(action)
                  : undefined,
        index: index + 1,
    }));
    if (steps.length <= 1) return null;
    const currentStep = steps[currentStepIndex];

    return (
        <section
            className="rounded-2xl bg-secondary-500 px-3 py-4"
            aria-label="Wallet confirmation progress"
        >
            <div className="mb-4 flex items-center gap-3">
                <span
                    className="h-px flex-1 bg-secondary-400"
                    aria-hidden="true"
                />
                <h3 className="shrink-0 text-sm font-normal text-secondary-text">
                    Continue in your wallet
                </h3>
                <span
                    className="h-px flex-1 bg-secondary-400"
                    aria-hidden="true"
                />
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
                {currentStep
                    ? `Step ${currentStep.index} of ${steps.length}: ${currentStep.name}. ${currentStep.description ?? ''}`
                    : 'Wallet confirmation steps complete.'}
            </p>
            <Steps steps={steps} />
        </section>
    );
}
