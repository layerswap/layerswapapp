import { FC } from 'react'
import type { JSX } from 'react';
import { Widget } from '@/components/Widget/Index';
import { useSwapDataState } from '@/context/swap';
import Withdraw from './Withdraw';
import Processing from './Processing';
import SubmitButton from '@/components/Buttons/submitButton';
import ManualWithdraw from './ManualWithdraw';
import { Partner } from '@/Models';
import { useCallbacks } from "@/context/callbackProvider";
import { useResolvedSwapStatus } from '@/hooks/useResolvedSwapStatus';
import { useSwapRetry } from '@/hooks/useSwapRetry';
import { useGaslessAuthorizationStatus } from '@/hooks/useGaslessAuthorizationStatus';
import { SwapDetailsSceleton } from '@/components/Common/Sceletons';

type Props = {
    type: "widget" | "contained",
    onWalletWithdrawalSuccess?: () => void,
    onCancelWithdrawal?: () => void,
    partner?: Partner
}

const SwapDetails: FC<Props> = ({ type, onWalletWithdrawalSuccess, partner, onCancelWithdrawal }) => {
    const { swapBasicData, swapDetails, refuel, depositActionsResponse, quote, quoteIsLoading } = useSwapDataState()
    const { onBackClick } = useCallbacks()

    // Polls the gasless deposit (paymaster) authorization while it's in flight; self-gates on
    // the authorization marker, so it's a no-op for non-gasless swaps.
    useGaslessAuthorizationStatus(swapDetails?.id)

    const resolved = useResolvedSwapStatus()
    const { failureReason, canRetry, retry, gaslessFailureMessage, canSwitchToStandard, switchToStandard } = useSwapRetry()

    if (!swapBasicData) return <SwapDetailsSceleton />

    return (
        <Container type={type} goBack={onBackClick}>
            {
                resolved.showWithdrawScreen
                    ? swapBasicData?.use_deposit_address === true
                        ? <ManualWithdraw swapBasicData={swapBasicData} depositActions={depositActionsResponse} refuel={refuel} partner={partner} type={type} quote={quote} isQuoteLoading={quoteIsLoading} />
                        : <Withdraw type={type} onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} onCancelWithdrawal={onCancelWithdrawal} partner={partner} />
                    : <div className='space-y-3 w-full h-full'>
                        <Processing failureReason={failureReason} />
                        {
                            canRetry &&
                            <div className='space-y-2'>
                                {gaslessFailureMessage &&
                                    <p className='text-sm text-secondary-text px-1'>{gaslessFailureMessage}</p>
                                }
                                <SubmitButton isDisabled={false} isSubmitting={false} onClick={retry}>
                                    Try again
                                </SubmitButton>
                                {canSwitchToStandard &&
                                    <SubmitButton buttonStyle='secondary' isDisabled={false} isSubmitting={false} onClick={switchToStandard}>
                                        Switch to standard transfer
                                    </SubmitButton>
                                }
                            </div>
                        }
                    </div>
            }
        </Container>
    )
}

const Container = ({ type, children, goBack }: Props & {
    children: JSX.Element | JSX.Element[],
    goBack: () => void
}) => {
    if (type === "widget")
        return <Widget goBack={goBack}><>{children}</></Widget>
    else
        return <div className="w-full flex flex-col flex-1 justify-between h-full space-y-2 text-secondary-text">
            {children}
        </div>
}

export default SwapDetails