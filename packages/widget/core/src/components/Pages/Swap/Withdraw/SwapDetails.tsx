import { ProcessingSectionView } from './Presentation/Page2Sections';
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
import { FC } from 'react';
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
    } = useSwapDataState();
    const { onBackClick } = useCallbacks();

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

    if (!swapBasicData) return <SwapDetailsSceleton />;

    return (
        <Container type={type} goBack={onBackClick}>
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
                        onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                        onCancelWithdrawal={onCancelWithdrawal}
                        partner={partner}
                    />
                )
            ) : (
                <ProcessingSectionView>
                    <Processing failureReason={failureReason} />
                    {canRetry && (
                        <RetryView
                            message={gaslessFailureMessage}
                            canSwitchToStandard={canSwitchToStandard}
                            onRetry={retry}
                            onSwitchToStandard={switchToStandard}
                        />
                    )}
                </ProcessingSectionView>
            )}
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
