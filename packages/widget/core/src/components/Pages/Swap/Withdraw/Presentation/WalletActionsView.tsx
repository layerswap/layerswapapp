import SubmitButton, {
    type SubmitButtonProps,
} from '@/components/Buttons/submitButton';
import FailIcon from '@/components/Icons/FailIcon';
import InfoIcon from '@/components/Icons/InfoIcon';
import type {
    DepositAction,
    SwapQuote,
} from '@/lib/apiClients/layerSwapApiClient';
import {
    getActionableDepositAction,
    getDepositActionLabel,
    getCurrentDepositActionIndex,
    isDepositWorkflowComplete,
} from '@/helpers/depositActions';
import { DepositWorkflowView } from './DepositWorkflowView';
import { WalletExecutionTransition } from './WalletExecutionTransition';
import { resolvePriceImpactValues } from '@/lib/fees';
import { WalletIcon } from '@layerswap/ui-kit/components';
import { Loader2 } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { ICON_CLASSES_WARNING } from '../../Form/SecondaryComponents/validationError/constants';
import ErrorDismissButton from '../../Form/SecondaryComponents/validationError/ErrorDismissButton';
import { ErrorDisplay } from '../../Form/SecondaryComponents/validationError/ErrorDisplay';
import WalletMessage, { WalletMessageDetails } from '../messages/Message';
import { walletDisconnectedMessage } from '../messages/walletErrorMessage';
import { NetworkSwitchError, networkSwitchFailureReason } from '../Wallet/Common/ensureSourceChain';
import type { ActionData } from '../Wallet/Common/sharedTypes';
import type { SwapStepTransactions } from '@/stores/swapTransactionStore';
import { resolveSwapFlow, type ResolvedSwapFlow } from '@/components/utils/resolveSwapFlow';
export const ChangeNetworkMessage: FC<{ data: ActionData, network: string }> = ({ data, network }) => {
    if (data.isPending) {
        return <WalletMessage
            status="pending"
            header='Switch network'
            details={`Confirm switching to ${network} in your wallet`}
        />
    }
    if (!data.isError) return null
    const kind = data.error instanceof NetworkSwitchError ? data.error.kind : 'failed'
    if (kind === 'pending') {
        return <WalletMessage
            status="pending"
            header='Network switch still waiting'
            details={`Your wallet is still asking to switch to ${network}. Confirm it there, then try again`}
        />
    }
    // Readiness lost the wallet; switching manually would not help.
    if (kind === 'disconnected') {
        return <WalletMessage {...walletDisconnectedMessage} />
    }
    if (kind === 'timeout') {
        return <WalletMessage
            status="error"
            header='Network switch timed out'
            details={`Your wallet didn't respond. Try again or switch your wallet network manually to ${network}`}
        />
    }
    const reason = networkSwitchFailureReason(data.error)
    return <WalletMessage
        status="error"
        header='Network switch failed'
        details={reason
            ? `${reason} Please try again or switch your wallet network manually to ${network}.`
            : `Please try again or switch your wallet network manually to ${network}`}
    />
}

export const ButtonWrapper: FC<SubmitButtonProps> = ({ ...props }) => {
    return (
        <SubmitButton
            text_align="center"
            buttonStyle="filled"
            size="medium"
            type="button"
            className="text-base my-1"
            {...props}
        >
            {props.children}
        </SubmitButton>
    );
};

export function ConnectWalletView({
    loading,
    connectError,
    onConnect,
    onDismiss,
    ...props
}: SubmitButtonProps & {
    loading?: boolean;
    connectError?: string;
    onConnect?: () => void;
    onDismiss?: () => void;
}) {
    return (
        <div className="flex flex-col gap-2 w-full">
            {connectError ? (
                <ErrorDisplay
                    icon={<FailIcon className="h-5 w-5" />}
                    title="Couldn't connect wallet"
                    message={connectError}
                    action={
                        <ErrorDismissButton onClick={() => onDismiss?.()} />
                    }
                />
            ) : null}
            <ButtonWrapper
                onClick={props.onClick ?? onConnect}
                icon={
                    loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        (props.icon ?? (
                            <WalletIcon className="stroke-2 w-6 h-6" />
                        ))
                    )
                }
                isDisabled={loading || props.isDisabled}
                isSubmitting={loading || props.isSubmitting}
                {...props}
            >
                Send from wallet
            </ButtonWrapper>
        </div>
    );
}
export type SendTransactionViewProps = SubmitButtonProps & {
    flow?: ResolvedSwapFlow;
    errorMessage?: ReactNode;
    quote?: SwapQuote;
    quoteIsLoading?: boolean;
    quoteError?: boolean;
    loading?: boolean;
    networkSwitch?: ActionData;
    walletRequestRecovery?: ReactNode;
    sourceNetworkName?: string;
    actionStateText?: string;
    actionButtonText?: string;
    depositActions?: DepositAction[];
    stepTransactions?: SwapStepTransactions;
    readOnly?: boolean;
    error?: boolean;
    swapError?: boolean;
    swapId?: string;
    criticalMarketPriceImpact?: boolean;
    showCriticalMarketPriceImpactButtons?: boolean;
    priceImpactValues?: ReturnType<typeof resolvePriceImpactValues>;
    gaslessUnavailable?: boolean;
    gaslessFailureStage?: 'create' | 'deposit' | null;
    canSwitchToStandard?: boolean;
    pendingSubmission?: boolean;
    confirmNotSubmitted?: () => void;
    handleClick?: () => void;
    handleCriticalContinue?: () => void;
    retryGasless?: () => void;
    switchToStandard?: () => void;
    onCancelWithdrawal?: () => void;
};
export function SendTransactionView({
    flow,
    icon = <WalletIcon className="stroke-2 w-6 h-6" />,
    errorMessage,
    quote,
    quoteIsLoading,
    quoteError,
    loading,
    networkSwitch,
    walletRequestRecovery,
    sourceNetworkName,
    actionStateText,
    actionButtonText,
    depositActions,
    stepTransactions,
    readOnly,
    error,
    swapError,
    swapId,
    criticalMarketPriceImpact,
    showCriticalMarketPriceImpactButtons,
    priceImpactValues,
    gaslessUnavailable,
    gaslessFailureStage,
    canSwitchToStandard = true,
    pendingSubmission,
    confirmNotSubmitted,
    handleClick,
    handleCriticalContinue,
    retryGasless,
    switchToStandard,
    onCancelWithdrawal,
    ...props
}: SendTransactionViewProps) {
    const isMultiStepWorkflow = (flow ?? resolveSwapFlow({ depositActions, stepTransactions, quote })).walletProgress === 'workflow';
    const workflowCompleted = isDepositWorkflowComplete(depositActions ?? []);
    const workflowFailed = depositActions?.some(action => action.status === 'failed');
    const actionableAction = getActionableDepositAction(depositActions);
    const primaryActionText = actionableAction
        ? getDepositActionLabel(actionableAction)
        : actionButtonText || 'Swap now';
    const hasError = error || swapError || gaslessUnavailable;
    const showStepError = isMultiStepWorkflow && !loading &&
        getCurrentDepositActionIndex(depositActions?.filter(action => !!action.step) ?? [], true) !== -1;
    const errorDescription = showStepError && hasError && errorMessage ? (
        <WalletMessageDetails>{errorMessage}</WalletMessageDetails>
    ) : undefined;
    const workflowProgress = isMultiStepWorkflow ? (
        <DepositWorkflowView
            actions={depositActions}
            stepTransactions={stepTransactions}
            readOnly={readOnly}
            loading={loading}
            error={hasError}
            errorDescription={errorDescription}
            actionStateText={actionStateText}
            destinationToken={quote?.destination_token}
            receiveAmount={quote?.receive_amount}
        />
    ) : undefined;
    const networkSwitchMessage = networkSwitch && (networkSwitch.isPending || networkSwitch.isError)
        ? <ChangeNetworkMessage data={networkSwitch} network={sourceNetworkName ?? ''} />
        : undefined;
    const message = networkSwitchMessage ?? (
        !loading && !showStepError && errorMessage && hasError ? (
            <div
                data-wallet-action-message
                className={workflowProgress ? 'pt-2' : undefined}
            >
                {errorMessage}
            </div>
        ) : undefined);
    if ((quoteIsLoading && !pendingSubmission) || loading)
        return (
            <WalletExecutionTransition
                workflow={workflowProgress}
                controls={
                    isMultiStepWorkflow && loading ? (
                        <>{message}{walletRequestRecovery}</>
                    ) : (
                        <>
                            {message}
                            <ButtonWrapper
                                icon={icon}
                                {...props}
                                isSubmitting={true}
                                isDisabled={true}
                            >
                                {actionStateText || 'Preparing…'}
                            </ButtonWrapper>
                            {walletRequestRecovery}
                        </>
                    )
                }
            />
        );

    if (showCriticalMarketPriceImpactButtons) {
        return (
            <WalletExecutionTransition
                workflow={workflowProgress}
                controls={
                    <>
                        {message}
                        {quote && priceImpactValues && (
                            <ErrorDisplay
                                icon={
                                    <InfoIcon
                                        className={ICON_CLASSES_WARNING}
                                    />
                                }
                                title="Critical receiving amount"
                                message={`By continuing, you agree to receive as low as ${quote.min_receive_amount} ${quote.destination_token?.asset} ($ ${priceImpactValues.minReceiveAmountUSD})`}
                            />
                        )}
                        <ButtonWrapper
                            icon={icon}
                            {...props}
                            onClick={handleCriticalContinue ?? handleClick}
                            buttonStyle="secondary"
                            size="small"
                            isSubmitting={false}
                            isDisabled={false}
                        >
                            Continue anyway
                        </ButtonWrapper>
                        <ButtonWrapper
                            icon={icon}
                            {...props}
                            size="small"
                            onClick={() => onCancelWithdrawal?.()}
                            isSubmitting={false}
                            isDisabled={false}
                        >
                            Cancel & try another route
                        </ButtonWrapper>
                    </>
                }
            />
        );
    }
    return (
        <WalletExecutionTransition
            workflow={workflowProgress}
            controls={
                <>
                    {message}
                    {!!(
                        !swapId &&
                        criticalMarketPriceImpact &&
                        quote?.destination_token &&
                        priceImpactValues &&
                        !error
                    ) && (
                        <ErrorDisplay
                            icon={<InfoIcon className={ICON_CLASSES_WARNING} />}
                            title="Critical receiving amount"
                            message={`The “receive at least” amount is affected by high price impact. You will receive at least ${quote.min_receive_amount} ${quote.destination_token.asset} ($ ${priceImpactValues.minReceiveAmountUSD})`}
                        />
                    )}
                    {pendingSubmission && confirmNotSubmitted && (
                        <details className="text-sm text-secondary-text space-y-2">
                            <summary className="cursor-pointer">Wallet shows a failed or unsubmitted request?</summary>
                            <p>Only unlock retry after verifying in your wallet that this request failed or expired without sending funds. A pending transaction must keep waiting.</p>
                            <ButtonWrapper buttonStyle="secondary" size="small" onClick={confirmNotSubmitted}>
                                I checked my wallet — unlock retry
                            </ButtonWrapper>
                        </details>
                    )}
                    {gaslessUnavailable && !pendingSubmission ? (
                        <div className="space-y-2">
                            {gaslessFailureStage === 'deposit' && (
                                <ButtonWrapper
                                    icon={icon}
                                    {...props}
                                    isSubmitting={
                                        props.isSubmitting ||
                                        loading ||
                                        quoteIsLoading
                                    }
                                    onClick={retryGasless}
                                    isDisabled={quoteIsLoading || !!quoteError}
                                >
                                    Try again
                                </ButtonWrapper>
                            )}
                            {canSwitchToStandard && (
                                <ButtonWrapper
                                    icon={icon}
                                    {...props}
                                    buttonStyle={
                                        gaslessFailureStage === 'deposit'
                                            ? 'secondary'
                                            : 'filled'
                                    }
                                    isSubmitting={
                                        props.isSubmitting ||
                                        loading ||
                                        quoteIsLoading
                                    }
                                    onClick={switchToStandard}
                                    isDisabled={quoteIsLoading || !!quoteError}
                                >
                                    Switch to standard transfer
                                </ButtonWrapper>
                            )}
                        </div>
                    ) : (
                        <ButtonWrapper
                            icon={icon}
                            {...props}
                            isSubmitting={
                                props.isSubmitting || loading || (quoteIsLoading && !pendingSubmission)
                            }
                            onClick={handleClick}
                            isDisabled={
                                (quoteIsLoading && !pendingSubmission) ||
                                (!!quoteError && !pendingSubmission) ||
                                (workflowCompleted && !pendingSubmission)
                            }
                        >
                            {pendingSubmission ? 'Check deposit status' : error || swapError || networkSwitch?.isError || workflowFailed
                                ? 'Try again'
                                : workflowCompleted
                                  ? 'Completed'
                                  : primaryActionText}
                        </ButtonWrapper>
                    )}
                </>
            }
        />
    );
}
