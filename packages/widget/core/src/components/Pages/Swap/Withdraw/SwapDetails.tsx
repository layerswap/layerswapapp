import type { SwapFormValues } from '../Form/SwapFormValues';
import { Page2Presenter } from './Presentation/Page2Presenter';
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
import { RetryView } from './Presentation/RetryView';
import { Page2Controller } from './Page2Controller';
import { useProcessingController } from './Processing/Processing';
import { getProcessingProgress } from './Presentation/ProcessingView';
import type { WalletProgressData } from './Presentation/walletProgress';
import type { SwapDetails as SwapDetailsData } from '@/lib/apiClients/layerSwapApiClient';

type Props = {
    type: 'widget' | 'contained';
    onWalletWithdrawalSuccess?: () => void;
    onCancelWithdrawal?: () => void;
    onAdjustAmount?: (updates: SwapFormValues) => void;
    partner?: Partner;
};

const SwapDetails: FC<Props> = ({
    type,
    onWalletWithdrawalSuccess,
    partner,
    onCancelWithdrawal,
    onAdjustAmount,
}) => {
    const {
        swapBasicData,
        swapDetails,
        flow,
        refuel,
        depositActionsResponse,
        quote,
        quoteIsLoading,
        quoteError,
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
            });
        }
        retry();
    }, [failureReason, onSwapLifecycle, retry, swapBasicData, swapDetails]);

    const handleSwitchToStandard = useCallback(() => {
        if (swapBasicData) {
            onSwapLifecycle({
                step: 'retry_requested',
                stage: 'swap',
                outcome: 'started',
                path: 'SwapDetails',
                reasonCode: 'switch_to_standard_transfer',
                ...lifecycleContextFromSwap(swapBasicData, swapDetails),
            });
        }
        switchToStandard();
    }, [onSwapLifecycle, swapBasicData, swapDetails, switchToStandard]);

    if (!swapBasicData) return <SwapDetailsSceleton />;

    const { compactQuote } = flow;
    const sourceAddress =
        swapDetails?.source_address || selectedSourceAccount?.address;

    return (
        <Container type={type} goBack={onBackClick}>
            <Page2Controller
                swapBasicData={swapBasicData}
                type={type}
                partner={partner}
                onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                onCancelWithdrawal={onCancelWithdrawal}
                onAdjustAmount={onAdjustAmount}
            >
                {(model) => (
                    <Page2Body
                        walletProgress={model.walletProgress}
                        inputFailureMessage={gaslessFailureMessage}
                        controls={model.controls}
                        footer={
                            resolved.showWithdrawScreen ? (
                                model.footer
                            ) : canRetry ? (
                                <RetryView
                                    canSwitchToStandard={canSwitchToStandard}
                                    onRetry={handleRetry}
                                    onSwitchToStandard={handleSwitchToStandard}
                                />
                            ) : null
                        }
                        actionKey={
                            resolved.showWithdrawScreen
                                ? model.actionKey
                                : 'retry'
                        }
                        renderFooter={(children) => (
                            <Widget.Footer sticky={type === 'widget'}>
                                {children}
                            </Widget.Footer>
                        )}
                        stage={
                            resolved.showWithdrawScreen
                                ? 'withdraw'
                                : 'processing'
                        }
                        flow={flow}
                        summary={
                            swapBasicData.use_deposit_address &&
                            resolved.showWithdrawScreen ? null : (
                                <SwapSummary />
                            )
                        }
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
                    />
                )}
            </Page2Controller>
        </Container>
    );
};

function Page2Body({
    walletProgress,
    inputFailureMessage,
    ...props
}: Omit<Parameters<typeof Page2Presenter>[0], 'progress'> & {
    walletProgress?: WalletProgressData;
    inputFailureMessage?: string;
}) {
    const { swapBasicData, swapDetails, quote, refuel } = useSwapDataState();
    // This host is mounted before creation; assigning a swap ID never reparents controllers.
    const processing = useProcessingController(
        {
            swapBasicData: swapBasicData!,
            swapDetails: swapDetails ?? EMPTY_DETAILS,
            quote,
            refuel,
            inputFailureMessage,
        },
        walletProgress ?? {},
    );
    return (
        <Page2Presenter
            {...props}
            progress={swapDetails ? getProcessingProgress(processing) : null}
        />
    );
}
const EMPTY_DETAILS = {
    id: '',
    transactions: [],
} as unknown as SwapDetailsData;

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
