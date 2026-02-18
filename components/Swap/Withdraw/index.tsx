import { FC } from 'react'
import { useSwapDataState } from '@/context/swap';
import SwapSummary from '../Summary';
import { Widget } from '../../Widget/Index';
import { SwapQuoteDetails } from './SwapQuoteDetails';
import WalletTransferButton from './WalletTransferButton';
import { useBalance } from '@/lib/balances/useBalance';
import { useSettingsState } from '@/context/settings';
import { useSelectedAccount } from '@/context/swapAccounts';
import { ErrorDisplay } from '@/components/validationError/ErrorDisplay';
import { Partner } from '@/Models/Partner';

const Withdraw: FC<{ type: 'widget' | 'contained', onWalletWithdrawalSuccess?: () => void, onCancelWithdrawal?: () => void, partner?: Partner }> = ({ type, onWalletWithdrawalSuccess, onCancelWithdrawal, partner }) => {
    const { swapBasicData, swapDetails, quote, refuel, quoteIsLoading, quoteError } = useSwapDataState()

    const { networks } = useSettingsState()
    const source_network = swapBasicData?.source_network && networks.find(n => n.name === swapBasicData?.source_network?.name)
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);

    const { balances } = useBalance(selectedSourceAccount?.address, source_network)
    const walletBalance = source_network && balances?.find(b => b?.network === source_network?.name && b?.token === swapBasicData?.source_token?.symbol)
    const walletBalanceAmount = walletBalance?.amount

    let withdraw: {
        content?: JSX.Element | JSX.Element[],
        footer?: JSX.Element | JSX.Element[],
    } = {}

    const showInsufficientBalanceWarning = swapBasicData?.use_deposit_address === false
        && swapBasicData?.requested_amount
        && Number(swapBasicData?.requested_amount)
        && Number(walletBalanceAmount) < Number(swapBasicData?.requested_amount)

    if (swapBasicData?.use_deposit_address === false) {
        withdraw = {
            footer: <WalletTransferButton
                swapBasicData={swapBasicData}
                swapId={swapDetails?.id}
                refuel={!!refuel}
                onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                balanceWarning={showInsufficientBalanceWarning ? <ErrorDisplay errorName='insufficientFunds' /> : null}
                onCancelWithdrawal={onCancelWithdrawal}
            />
        }
    }

    return (
        <>
            <Widget.Content>
                <div className="w-full flex flex-col justify-between  text-secondary-text">
                    <div className='grid grid-cols-1 gap-3 '>
                        <SwapSummary />
                        <SwapQuoteDetails swapBasicData={swapBasicData} quote={quote} refuel={refuel} quoteIsLoading={quoteIsLoading} quoteError={quoteError} partner={partner} />
                        {withdraw?.content}
                    </div>
                </div>
            </Widget.Content>
            {
                withdraw?.footer &&
                <Widget.Footer sticky={type == 'widget'}>
                    {withdraw?.footer}
                </Widget.Footer>
            }
        </>
    )
}


export default Withdraw