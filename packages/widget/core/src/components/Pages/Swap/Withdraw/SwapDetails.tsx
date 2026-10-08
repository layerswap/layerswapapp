import {
    ProcessingSectionView,
    SwapContentView,
} from './Presentation/Page2Sections';
import { shouldShowCompactSwapQuote } from '@/helpers/swapFlow';
import { useIsGaslessActive } from '@/hooks/useIsGaslessActive';
import SwapSummary from './Summary';
import { SwapQuoteDetails } from './SwapQuoteDetails';
import { Page2Contained } from './Presentation/Page2Contained';
import { Partner } from '@/Models';
import { SwapDetailsSceleton } from '@/components/Common/Sceletons';
import { Widget } from '@/components/Widget/Index';
import { useCallbacks } from '@/context/callbackProvider';
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import { useSelectedAccount } from '@/context/swapAccounts';
import { useResolvedSwapStatus } from '@/hooks/useResolvedSwapStatus';
import { useSwapRetry } from '@/hooks/useSwapRetry';
import type { JSX } from 'react';
import { FC, useCallback, useEffect } from 'react';
import { lifecycleContextFromSwap } from '@/lib/swapLifecycle';
import ManualWithdraw from './ManualWithdraw';
import { RetryView } from './Presentation/RetryView';
import { ActionMessageView } from './Presentation/ActionMessageView';
import Processing from './Processing';
import Withdraw from './Withdraw';

type Props = {
    type: 'widget' | 'contained';
    onWalletWithdrawalSuccess?: () => void;
    onCancelWithdrawal?: () => void;
    partner?: Partner;
};

const SwapDetails: FC<Props> = ({
    type,
    onWalletWithdrawalSuccess,
    partner,
    onCancelWithdrawal,
}) => {
    const {
        swapBasicData,
        swapDetails,
        walletExecutionStarted,
        walletWithdrawalExecuting,
        refuel,
        depositActionsResponse,
        quote,
        quoteIsLoading,
        quoteError,
        swapError,
    } = useSwapDataState();
    const selectedSourceAccount = useSelectedAccount(
        'from',
        swapBasicData?.source_network.name,
    );
    const { onBackClick, onSwapLifecycle } = useCallbacks();
    const { setSwapViewMounted } = useSwapDataUpdate();
    // The provider refreshes deposit actions only while this view is on screen.
    useEffect(() => {
        setSwapViewMounted(true);
        return () => setSwapViewMounted(false);
    }, [setSwapViewMounted]);
    const isGaslessActive = useIsGaslessActive(swapBasicData);

    const resolved = useResolvedSwapStatus();
    // Submission can be observed before the wallet request completes its handoff.
    const showWithdrawal = resolved.showWithdrawScreen || walletWithdrawalExecuting;
    const {
        failureReason,
        canRetry,
        isChecking,
        retry,
        gaslessFailureMessage,
        canSwitchToStandard,
        switchToStandard,
    } = useSwapRetry();

    const handleRetry = useCallback(() => {
        if (swapBasicData) {
            onSwapLifecycle({
                step: 'retry_requested',
                stage: 'swap',
                outcome: 'started',
                path: 'SwapDetails',
                reasonCode: failureReason || 'swap_retry',
                ...lifecycleContextFromSwap(swapBasicData, swapDetails),
            })
        }
        retry()
    }, [failureReason, onSwapLifecycle, retry, swapBasicData, swapDetails])

    const handleSwitchToStandard = useCallback(() => {
        if (swapBasicData) {
            onSwapLifecycle({
                step: 'retry_requested',
                stage: 'swap',
                outcome: 'started',
                path: 'SwapDetails',
                reasonCode: 'switch_to_standard_transfer',
                ...lifecycleContextFromSwap(swapBasicData, swapDetails),
            })
        }
        switchToStandard()
    }, [onSwapLifecycle, swapBasicData, swapDetails, switchToStandard])

    if (!swapBasicData) return <SwapDetailsSceleton />;

    const compactsDuringWalletExecution = shouldShowCompactSwapQuote({
        swapData: swapBasicData,
        isGaslessActive,
    });
    const compactQuote =
        !swapBasicData.use_deposit_address &&
        (!resolved.showWithdrawScreen ||
            (compactsDuringWalletExecution && walletExecutionStarted));
    const sourceAddress =
        swapDetails?.source_address || selectedSourceAccount?.address;

    return (
        <Container type={type} goBack={onBackClick}>
            <SwapContentView
                transferStage={
                    !compactsDuringWalletExecution
                        ? showWithdrawal
                            ? 'withdraw'
                            : 'processing'
                        : undefined
                }
                summary={
                    swapBasicData.use_deposit_address &&
                    resolved.showWithdrawScreen ? null : (
                        <SwapSummary />
                    )
                }
                compactQuote={compactQuote}
                quote={
                    !swapBasicData.use_deposit_address && (
                        <SwapQuoteDetails
                            swapBasicData={swapBasicData}
                            sourceAddress={sourceAddress}
                            quote={quote}
                            refuel={refuel}
                            quoteIsLoading={quoteIsLoading}
                            quoteError={quoteError}
                            partner={partner}
                            compact={compactQuote}
                        />
                    )
                }
            >
                {showWithdrawal ? (
                    swapBasicData?.use_deposit_address === true ? (
                        <ManualWithdraw
                            swapBasicData={swapBasicData}
                            depositActions={depositActionsResponse}
                            refuel={refuel}
                            partner={partner}
                            type={type}
                            quote={quote}
                            isQuoteLoading={quoteIsLoading}
                        />
                    ) : (
                        <Withdraw
                            type={type}
                            onWalletWithdrawalSuccess={
                                onWalletWithdrawalSuccess
                            }
                            onCancelWithdrawal={onCancelWithdrawal}
                        />
                    )
                ) : (
                    <ProcessingSectionView
                        actions={
                            canRetry && (
                                <RetryView
                                    isChecking={isChecking}
                                    canSwitchToStandard={canSwitchToStandard}
                                    onRetry={handleRetry}
                                    onSwitchToStandard={handleSwitchToStandard}
                                />
                            )
                        }
                    >
                        {swapError && (
                            <div role="alert" className="mb-2">
                                <ActionMessageView
                                    swapError
                                    swapErrorMessage={swapError}
                                    selectedSourceAddress={sourceAddress || ''}
                                    sourceNetwork={swapBasicData.source_network}
                                />
                            </div>
                        )}
                        <Processing
                            inputFailureMessage={gaslessFailureMessage}
                        />
                    </ProcessingSectionView>
                )}
            </SwapContentView>
        </Container>
    );
};

const Container = ({
    type,
    children,
    goBack,
}: Props & {
    children: JSX.Element | JSX.Element[];
    goBack: () => void;
}) => {
    if (type === 'widget')
        return (
            <Widget goBack={goBack}>
                <>{children}</>
            </Widget>
        );
    else return <Page2Contained>{children}</Page2Contained>;
};

export default SwapDetails;
