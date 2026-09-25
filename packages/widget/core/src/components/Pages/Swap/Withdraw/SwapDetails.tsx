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
import { useSwapDataState } from '@/context/swap';
import { useGaslessAuthorizationStatus } from '@/hooks/useGaslessAuthorizationStatus';
import { useResolvedSwapStatus } from '@/hooks/useResolvedSwapStatus';
import { useSwapRetry } from '@/hooks/useSwapRetry';
import type { JSX } from 'react';
import { FC, useCallback } from 'react';
import { lifecycleContextFromSwap } from '@/lib/swapLifecycle';
import ManualWithdraw from './ManualWithdraw';
import { RetryView } from './Presentation/RetryView';
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
        refuel,
        depositActionsResponse,
        quote,
        quoteIsLoading,
        quoteError,
        swapId,
    } = useSwapDataState();
    const { onBackClick, onSwapLifecycle } = useCallbacks();
    const isGaslessActive = useIsGaslessActive(swapBasicData);

    // Polls the gasless deposit (paymaster) authorization while it's in flight; self-gates on
    // the authorization marker, so it's a no-op for non-gasless swaps.
    useGaslessAuthorizationStatus(swapDetails?.id);

    const resolved = useResolvedSwapStatus();
    const {
        failureReason,
        canRetry,
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
            (compactsDuringWalletExecution && !!swapId));

    return (
        <Container type={type} goBack={onBackClick}>
            <SwapContentView
                transferStage={
                    !compactsDuringWalletExecution
                        ? resolved.showWithdrawScreen
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
                {resolved.showWithdrawScreen ? (
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
                                    canSwitchToStandard={canSwitchToStandard}
                                    onRetry={handleRetry}
                                    onSwitchToStandard={handleSwitchToStandard}
                                />
                            )
                        }
                    >
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
