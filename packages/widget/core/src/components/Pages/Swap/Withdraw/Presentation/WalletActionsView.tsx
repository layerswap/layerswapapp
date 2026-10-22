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
    isDepositWorkflowComplete,
} from '@/helpers/depositActions';
import { ProgressPanelView } from './ProgressPanelView';
import { getWalletProgress, getWalletWorkflowState } from './walletProgress';
import { WalletExecutionTransition } from './WalletExecutionTransition';
import { resolvePriceImpactValues } from '@/lib/fees';
import { WalletIcon } from '@layerswap/ui-kit/components';
import { Loader2 } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { ICON_CLASSES_WARNING } from '../../Form/SecondaryComponents/validationError/constants';
import ErrorDismissButton from '../../Form/SecondaryComponents/validationError/ErrorDismissButton';
import { ErrorDisplay } from '../../Form/SecondaryComponents/validationError/ErrorDisplay';
import WalletMessage from '../messages/Message';
import { walletDisconnectedMessage } from '../messages/walletErrorMessage';
import { NetworkSwitchError, networkSwitchFailureReason } from '../Wallet/Common/ensureSourceChain';
import type { ActionData } from '../Wallet/Common/sharedTypes';
import type { SwapStepTransactions } from '@/stores/swapTransactionStore';
import type { ResolvedSwapFlow } from '@/components/utils/resolveSwapFlow';
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
            className="text-base"
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
    showProgress?: boolean;
    flow?: ResolvedSwapFlow;
    errorMessage?: ReactNode;
    quote?: SwapQuote;
    quoteIsLoading?: boolean;
    quoteError?: boolean;
    loading?: boolean;
    pendingSubmission?: boolean;
    submissionTimedOut?: boolean;
    walletExecutionStarted?: boolean;
    /** A wallet receipt keeps confirmation visible without advancing the API swap phase. */
    submissionAccepted?: boolean;
    networkSwitch?: ActionData;
    walletRequestRecovery?: ReactNode;
    sourceNetworkName?: string;
    actionStateText?: string;
    actionButtonText?: string;
    depositActions?: DepositAction[];
    showSwapProgress?: boolean;
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
    handleClick?: () => void;
    handleCriticalContinue?: () => void;
    retryGasless?: () => void;
    switchToStandard?: () => void;
    onCancelWithdrawal?: () => void;
};
export function getSendTransactionPresentation({
    showProgress: _showProgress,
    flow,
    icon = <WalletIcon className="stroke-2 w-6 h-6" />,
    errorMessage,
    quote,
    quoteIsLoading,
    quoteError,
    loading,
    pendingSubmission,
    submissionTimedOut,
    submissionAccepted,
    walletExecutionStarted,
    networkSwitch,
    walletRequestRecovery,
    sourceNetworkName,
    actionStateText,
    actionButtonText,
    depositActions,
    showSwapProgress,
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
    handleClick,
    handleCriticalContinue,
    retryGasless,
    switchToStandard,
    onCancelWithdrawal,
    ...props
}: SendTransactionViewProps) {
    const observingSubmission = pendingSubmission && !loading;
    const submissionMessage = observingSubmission && submissionTimedOut ? <WalletMessage
        status="pending"
        header="Transaction not confirmed"
        details="We haven’t detected your transaction yet. Tracking continues automatically. This does not mean the transaction failed."
    /> : undefined;
    const walletProgress = {
        flow, quote, depositActions, stepTransactions, loading,
        submissionAccepted: submissionAccepted || observingSubmission,
        submissionTimedOut, walletExecutionStarted,
        error: pendingSubmission ? false : error,
        swapError: pendingSubmission ? false : swapError, gaslessUnavailable,
        errorMessage: submissionMessage ?? errorMessage, actionStateText,
        showSwapProgress, readOnly,
    };
    const { hasError, workflowFailed, confirmingSubmission, showStepError } =
        getWalletWorkflowState(walletProgress);
    const workflowCompleted = isDepositWorkflowComplete(depositActions ?? []);
    const actionableAction = getActionableDepositAction(depositActions);
    const draft = !swapId && flow?.resolution === 'pending';
    const primaryActionText = draft ? actionButtonText || 'Confirm swap'
        : flow?.resolution === 'unsupported' ? 'Refresh swap'
        : props.isDisabled && actionButtonText ? actionButtonText : flow?.actionButtonText ?? (actionableAction
        ? getDepositActionLabel(actionableAction)
        : actionButtonText || 'Swap now');
    // The shared processing slot can render the card, but these controls must
    // still follow the same progress visibility when showProgress is false.
    const progress = getWalletProgress(walletProgress);

    const networkSwitchMessage = networkSwitch && (networkSwitch.isPending || networkSwitch.isError)
        ? <ChangeNetworkMessage data={networkSwitch} network={sourceNetworkName ?? ''} />
        : undefined;
    const message = submissionMessage && !showStepError ? submissionMessage : networkSwitchMessage ?? (
        !loading && !showStepError && errorMessage && hasError ? (
            <div
                data-wallet-action-message
            >
                {errorMessage}
            </div>
        ) : undefined);
    const resolvingFlow = !!swapId && flow?.resolution === 'pending' && !actionableAction && !pendingSubmission
        && !hasError && !networkSwitch?.isError;
    if (observingSubmission) {
        return { walletProgress, controls: submissionMessage ?? null };
    }
    if ((quoteIsLoading && !pendingSubmission) || loading || resolvingFlow || (confirmingSubmission && !pendingSubmission))
        return { walletProgress, controls: (
                    progress && (loading || confirmingSubmission) ? (
                        message || walletRequestRecovery ? <div className="flex flex-col gap-2">{message}{walletRequestRecovery}</div> : null
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
                ) };

    if (showCriticalMarketPriceImpactButtons) {
        return { walletProgress, controls: (
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
                ) };
    }
    return { walletProgress, controls: (
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
                    {gaslessUnavailable ? (
                        <div className="flex flex-col gap-2">
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
                                props.isDisabled ||
                                (quoteIsLoading && !pendingSubmission) ||
                                (!pendingSubmission && (!!quoteError || workflowCompleted))
                            }
                        >
                            {error || swapError || networkSwitch?.isError || workflowFailed
                                ? 'Try again'
                                : workflowCompleted
                                  ? 'Completed'
                                  : primaryActionText}
                        </ButtonWrapper>
                    )}
                </>
            ) };
}

/** Compatibility adapter; Page 2 consumes the nullable model directly. */
export function SendTransactionView(props: SendTransactionViewProps) {
    const { controls, walletProgress } = getSendTransactionPresentation(props);
    const progress = props.showProgress === false ? null : getWalletProgress(walletProgress);
    return <WalletExecutionTransition
        workflow={progress ? <ProgressPanelView data={progress} /> : null}
        controls={controls}
    />;
}
