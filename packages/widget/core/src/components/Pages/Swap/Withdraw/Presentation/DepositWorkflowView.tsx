import type { DepositAction } from '@/lib/apiClients/layerSwapApiClient';
import type { Token } from '@layerswap/widget-types';
import type { ReactNode } from 'react';
import { StepTransactionLink } from '../Processing/StepTransactionLink';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import {
    getDepositActionDescription,
    getDepositActionLabel,
} from '@/helpers/depositActions';
import Steps, { StepsPanel } from '../Processing/StepsComponent';
import { ProgressStatus, type StatusStep } from '../Processing/types';
import { TransferStatusHeader } from './TransferStatusHeader';

export function DepositWorkflowView({
    actions,
    loading,
    error,
    actionStateText,
    destinationToken,
    receiveAmount,
    processing,
    completed,
    readOnly,
}: {
    actions?: DepositAction[];
    loading?: boolean;
    error?: boolean;
    actionStateText?: string;
    destinationToken?: Token;
    receiveAmount?: number;
    readOnly?: boolean;
    processing?: {
        title?: string;
        inputStatus: ProgressStatus;
        outputStatus: ProgressStatus;
        inputDescription?: StatusStep['description'];
        outputDescription?: StatusStep['description'];
        elapsedTime?: ReactNode;
        inputExplorerUrl?: string;
        outputExplorerUrl?: string;
    };
    completed?: {
        completionTime: string | null;
        explorerUrl?: string;
    };
}) {
    const workflowActions = actions?.filter((action) => !!action.step) ?? [];
    const hasDeliveryStep =
        !!destinationToken &&
        workflowActions.some((action) => action.step === 'publish');
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
    if (processing || completed) {
        workflowActions.forEach((action, index) => {
            steps[index] = {
                ...steps[index],
                status:
                    !completed && processing && action.step === 'publish'
                        ? processing.inputStatus
                        : ProgressStatus.Complete,
                isLoading:
                    !completed &&
                    action.step === 'publish' &&
                    processing?.inputStatus === ProgressStatus.Current,
                description:
                    !completed && action.step === 'publish'
                        ? processing?.inputDescription
                        : undefined,
                explorerUrl:
                    action.step === 'publish'
                        ? processing?.inputExplorerUrl
                        : undefined,
                readOnly,
            };
        });
    }
    if (hasDeliveryStep) {
        steps.push({
            name: `${completed ? 'Received' : 'Receive'} ${receiveAmount ? `${truncateDecimals(receiveAmount, destinationToken.decimals)} ` : ''}${destinationToken.asset}`,
            status: completed
                ? ProgressStatus.Complete
                : (processing?.outputStatus ?? ProgressStatus.Upcoming),
            description: completed ? undefined : processing?.outputDescription,
            explorerUrl:
                completed?.explorerUrl || processing?.outputExplorerUrl,
            readOnly,
            index: steps.length + 1,
        });
    }
    if (steps.length <= 1 && !completed) return null;
    const currentStep = steps.find(
        (step) =>
            step.status === ProgressStatus.Current ||
            step.status === ProgressStatus.Failed,
    );
    const progress = completed
        ? 100
        : (steps.filter((step) => step.status === ProgressStatus.Complete)
              .length /
              steps.length) *
          100;
    const title = completed
        ? 'Transfer complete'
        : (processing?.title ?? 'Continue in your wallet');
    const description = completed
        ? completed.completionTime
        : processing
          ? processing.elapsedTime
          : actionStateText;

    return (
        <StepsPanel
            label={
                completed
                    ? 'Swap complete'
                    : hasDeliveryStep
                      ? 'Swap progress'
                      : 'Wallet confirmation progress'
            }
        >
            <TransferStatusHeader
                title={title}
                description={description}
                progress={progress}
                completed={!!completed}
            />
            <p className="sr-only" aria-live="polite" aria-atomic="true">
                {completed
                    ? 'Transfer complete.'
                    : currentStep
                      ? `Step ${currentStep.index} of ${steps.length}: ${currentStep.name}. ${typeof currentStep.description === 'string' ? currentStep.description : ''}`
                      : 'Wallet confirmation steps complete.'}
            </p>
            {steps.length > 0 && (
                <div className="pt-4">
                    <Steps steps={steps} />
                </div>
            )}
            {completed?.explorerUrl && !hasDeliveryStep && (
                <div className="flex justify-end pt-3">
                    <StepTransactionLink
                        url={completed.explorerUrl}
                        readOnly={readOnly}
                    />
                </div>
            )}
        </StepsPanel>
    );
}
