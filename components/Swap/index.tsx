import { FC, useCallback } from 'react'
import { Widget } from '../Widget/Index';
import { useSwapDataState } from '../../context/swap';
import Withdraw from './Withdraw';
import Processing from './Withdraw/Processing';
import { BackendTransactionStatus, TransactionType } from '../../lib/apiClients/layerSwapApiClient';
import { SwapStatus } from '../../Models/SwapStatus';
import { useSwapTransactionStore } from '../../stores/swapTransactionStore';
import SubmitButton from '../buttons/submitButton';
import ManualWithdraw from './Withdraw/ManualWithdraw';
import { Partner } from '@/Models/Partner';

type Props = {
    type: "widget" | "contained",
    onWalletWithdrawalSuccess?: () => void,
    onCancelWithdrawal?: () => void,
    partner?: Partner
}

const SwapDetails: FC<Props> = ({ type, onWalletWithdrawalSuccess, partner, onCancelWithdrawal }) => {
    const { swapDetails, swapBasicData, refuel, depositActionsResponse, quote, quoteIsLoading } = useSwapDataState()

    const swapStatus = swapDetails?.status || SwapStatus.UserTransferPending;
    const storedWalletTransactions = useSwapTransactionStore()

    const swapInputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Input)
    const storedWalletTransaction = storedWalletTransactions.swapTransactions?.[swapDetails?.id || '']

    const removeStoredTransaction = useCallback(() => {
        useSwapTransactionStore.getState().removeSwapTransaction(swapDetails?.id || '');
    }, [swapDetails?.id, storedWalletTransactions])
    
    if (!swapBasicData) return <>
        <div className="w-full h-[430px]">
            <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-6 py-1">
                    <div className="h-32 bg-secondary-700 rounded-lg"></div>
                    <div className="h-40 bg-secondary-700 rounded-lg"></div>
                    <div className="h-12 bg-secondary-700 rounded-lg"></div>
                </div>
            </div>
        </div>
    </>

    return (
        <Container type={type}>
            {
                ((swapStatus === SwapStatus.UserTransferPending
                    && !(swapInputTransaction || storedWalletTransaction))) ?
                    (
                        swapBasicData?.use_deposit_address === true
                            ? <ManualWithdraw swapBasicData={swapBasicData} depositActions={depositActionsResponse} refuel={refuel} partner={partner} type={type} quote={quote} isQuoteLoading={quoteIsLoading} />
                            : <Withdraw type={type} onWalletWithdrawalSuccess={onWalletWithdrawalSuccess} onCancelWithdrawal={onCancelWithdrawal} partner={partner} />
                    )
                    :
                    <div className='space-y-3 w-full h-full'>
                        <Processing />
                        {
                            storedWalletTransaction?.status == BackendTransactionStatus.Failed &&
                            <SubmitButton isDisabled={false} isSubmitting={false} onClick={removeStoredTransaction}>
                                Try again
                            </SubmitButton>
                        }
                    </div>
            }
        </Container>
    )
}

const Container = ({ type, children }: Props & {
    children: JSX.Element | JSX.Element[]
}) => {
    if (type === "widget")
        return <Widget><>{children}</></Widget>
    else
        return <div className="w-full flex flex-col justify-between h-full space-y-3 text-secondary-text">
            {children}
        </div>
}

export default SwapDetails