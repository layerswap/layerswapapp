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
} from '@/helpers/depositActions';
import { DepositWorkflowView } from './DepositWorkflowView';
import { resolvePriceImpactValues } from '@/lib/fees';
import { WalletIcon } from '@layerswap/ui-kit/components';
import { Loader2 } from 'lucide-react';
import { type FC } from 'react';
import { ICON_CLASSES_WARNING } from '../../Form/SecondaryComponents/validationError/constants';
import ErrorDismissButton from '../../Form/SecondaryComponents/validationError/ErrorDismissButton';
import { ErrorDisplay } from '../../Form/SecondaryComponents/validationError/ErrorDisplay';
import WalletMessage from '../messages/Message';
import type { ActionData } from '../Wallet/Common/sharedTypes';
export const ChangeNetworkMessage: FC<{
    data: ActionData;
    network: string;
}> = ({ data, network }) => {
    if (data.isPending) {
        return (
            <WalletMessage
                status="pending"
                header="Network switch required"
                details="Confirm switching the network with your wallet"
            />
        );
    } else if (data.isError) {
        const error = data.error as
            | (Error & {
                  shortMessage?: string;
                  cause?: { shortMessage?: string };
              })
            | null;
        const reason = error?.cause?.shortMessage ?? error?.shortMessage;
        return (
            <WalletMessage
                status="error"
                header="Network switch failed"
                details={
                    reason
                        ? `${reason} Please try again or switch your wallet network manually to ${network}.`
                        : `Please try again or switch your wallet network manually to ${network}`
                }
            />
        );
    }
};

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
    quote?: SwapQuote;
    quoteIsLoading?: boolean;
    quoteError?: boolean;
    loading?: boolean;
    actionStateText?: string;
    actionButtonText?: string;
    depositActions?: DepositAction[];
    error?: boolean;
    swapError?: boolean;
    swapId?: string;
    criticalMarketPriceImpact?: boolean;
    showCriticalMarketPriceImpactButtons?: boolean;
    priceImpactValues?: ReturnType<typeof resolvePriceImpactValues>;
    gaslessUnavailable?: boolean;
    gaslessFailureStage?: 'create' | 'deposit' | null;
    handleClick?: () => void;
    handleCriticalContinue?: () => void;
    retryGasless?: () => void;
    switchToStandard?: () => void;
    onCancelWithdrawal?: () => void;
};
export function SendTransactionView({
    icon = <WalletIcon className="stroke-2 w-6 h-6" />,
    quote,
    quoteIsLoading,
    quoteError,
    loading,
    actionStateText,
    actionButtonText,
    depositActions,
    error,
    swapError,
    swapId,
    criticalMarketPriceImpact,
    showCriticalMarketPriceImpactButtons,
    priceImpactValues,
    gaslessUnavailable,
    gaslessFailureStage,
    handleClick,
    handleCriticalContinue,
    retryGasless,
    switchToStandard,
    onCancelWithdrawal,
    ...props
}: SendTransactionViewProps) {
    const isMultiStepWorkflow =
        (depositActions?.filter((action) => !!action.step).length ?? 0) > 1;
    const workflowCompleted =
        !!depositActions?.length &&
        depositActions.every((action) => action.status === 'completed');
    const actionableAction = getActionableDepositAction(depositActions);
    const primaryActionText = actionableAction
        ? getDepositActionLabel(actionableAction)
        : actionButtonText || 'Swap now';
    const workflowProgress = (
        <DepositWorkflowView
            actions={depositActions}
            loading={loading}
            error={error || swapError}
            actionStateText={actionStateText}
        />
    );
    if (quoteIsLoading || loading)
        return (
            <>
                {workflowProgress}
                {isMultiStepWorkflow && loading ? null : (
                    <ButtonWrapper
                        icon={icon}
                        {...props}
                        isSubmitting={true}
                        isDisabled={true}
                    >
                        {actionStateText || 'Preparing…'}
                    </ButtonWrapper>
                )}
            </>
        );

    if (showCriticalMarketPriceImpactButtons) {
        return (
            <>
                {workflowProgress}
                {quote && priceImpactValues && (
                    <ErrorDisplay
                        icon={<InfoIcon className={ICON_CLASSES_WARNING} />}
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
        );
    }
    return (
        <>
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
            {workflowProgress}
            {gaslessUnavailable ? (
                <div className="space-y-2">
                    {gaslessFailureStage === 'deposit' && (
                        <ButtonWrapper
                            icon={icon}
                            {...props}
                            isSubmitting={
                                props.isSubmitting || loading || quoteIsLoading
                            }
                            onClick={retryGasless}
                            isDisabled={quoteIsLoading || !!quoteError}
                        >
                            Try again
                        </ButtonWrapper>
                    )}
                    <ButtonWrapper
                        icon={icon}
                        {...props}
                        buttonStyle={
                            gaslessFailureStage === 'deposit'
                                ? 'secondary'
                                : 'filled'
                        }
                        isSubmitting={
                            props.isSubmitting || loading || quoteIsLoading
                        }
                        onClick={switchToStandard}
                        isDisabled={quoteIsLoading || !!quoteError}
                    >
                        Switch to standard transfer
                    </ButtonWrapper>
                </div>
            ) : (
                <ButtonWrapper
                    icon={icon}
                    {...props}
                    isSubmitting={
                        props.isSubmitting || loading || quoteIsLoading
                    }
                    onClick={handleClick}
                    isDisabled={
                        quoteIsLoading || !!quoteError || workflowCompleted
                    }
                >
                    {error || swapError
                        ? 'Try again'
                        : workflowCompleted
                          ? 'Completed'
                          : primaryActionText}
                </ButtonWrapper>
            )}
        </>
    );
}

export function ChangeNetworkView({
    network,
    isPending,
    error,
    onSwitch,
}: {
    network: string;
    isPending?: boolean;
    error?: Error | null;
    onSwitch?: () => void;
}) {
    return (
        <>
            <ChangeNetworkMessage
                data={{
                    isPending: !!isPending,
                    isError: !!error,
                    error: error ?? null,
                }}
                network={network}
            />
            {!isPending && (
                <ButtonWrapper
                    onClick={onSwitch}
                    icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                >
                    {error ? (
                        <span>Try again</span>
                    ) : (
                        <span>Switch network</span>
                    )}
                </ButtonWrapper>
            )}
        </>
    );
}
