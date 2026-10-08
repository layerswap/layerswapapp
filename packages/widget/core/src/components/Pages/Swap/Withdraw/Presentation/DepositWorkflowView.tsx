import type { DepositAction } from '@/lib/apiClients/layerSwapApiClient';
import type { Token } from '@layerswap/widget-types';
import type { ReactNode } from 'react';
import { truncateDecimals } from '@/components/utils/RoundDecimals';
import {
    getDepositActionDescription,
    getDepositActionLabel,
    getCurrentDepositActionIndex,
} from '@/helpers/depositActions';
import Steps, { StepsPanel } from '../Processing/StepsComponent';
import { ProgressStatus, type StatusStep } from '../Processing/types';
import { TransferStatusHeader } from './TransferStatusHeader';
import type { SwapStepTransactions } from '@/stores/swapTransactionStore';

export function DepositWorkflowView({
    actions,
    stepTransactions,
    loading,
    error,
    errorDescription,
    actionStateText,
    destinationToken,
    receiveAmount,
    processing,
    completed,
    statusChecking = false,
    readOnly,
}: {
    actions?: DepositAction[];
    stepTransactions?: SwapStepTransactions;
    loading?: boolean;
    error?: boolean;
    errorDescription?: StatusStep['description'];
    actionStateText?: string;
    destinationToken?: Token;
    receiveAmount?: number;
    statusChecking?: boolean;
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
    if ((processing || completed) && stepTransactions?.approve_permit2 &&
        !workflowActions.some(action => action.step === 'approve_permit2')) {
        workflowActions.unshift({ step: 'approve_permit2', status: 'completed' });
    }
    const hasDeliveryStep =
        !!destinationToken &&
        workflowActions.some((action) => action.step === 'publish');
    // Between signing and publication the backend is preparing a waiting step.
    // Keep that status attached to the step when there is no wallet prompt yet.
    const currentStepIndex = getCurrentDepositActionIndex(workflowActions, !!loading || !!error || statusChecking);
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
            (statusChecking || !!loading || action.status === 'pending'),
        description:
            statusChecking && index === currentStepIndex
                ? 'Checking transaction status'
                : action.status === 'failed'
                ? action.detail || errorDescription
                : index === currentStepIndex
                  ? errorDescription || (loading || action.status === 'pending'
                        ? actionStateText
                        : undefined) || getDepositActionDescription(action)
                  : undefined,
        explorerUrl: action.step === 'approve_permit2'
            ? stepTransactions?.[action.step]?.explorerUrl
            : undefined,
        readOnly,
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
                        : steps[index].explorerUrl,
                readOnly,
            };
        });
    }
    if (hasDeliveryStep) {
        steps.push({
            name: `${completed ? 'Received' : 'Receive'} ${receiveAmount ? `${truncateDecimals(receiveAmount, destinationToken.precision ?? destinationToken.decimals)} ` : ''}${destinationToken.asset}`,
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
    if (steps.length <= 1 && !completed && !steps.some(step => step.explorerUrl)) return null;
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
        : statusChecking
          ? 'Checking transfer status'
          : (processing?.title ?? 'Swap in progress');
    const description = completed
        ? completed.completionTime
        : processing?.elapsedTime;

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
        </StepsPanel>
    );
}
