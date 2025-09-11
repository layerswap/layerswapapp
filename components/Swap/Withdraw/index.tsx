import { FC, useMemo } from 'react'
import { useSwapDataState } from '../../../context/swap';
import KnownInternalNames from '../../../lib/knownIds';
import SwapSummary from '../Summary';
import External from './External';
import { useQueryState } from '../../../context/query';
import { Widget } from '../../Widget/Index';
import { SwapQuoteDetails } from './SwapQuoteDetails';
import WalletTransferButton from './WalletTransferButton';
import useWallet from '@/hooks/useWallet';
import useSWRBalance from '@/lib/balances/useSWRBalance';
import { useSettingsState } from '@/context/settings';
import { InsufficientBalanceWarning } from '@/components/insufficientBalance';

const Withdraw: FC<{ type: 'widget' | 'contained', onWithdrawalSuccess?: () => void }> = ({ type, onWithdrawalSuccess }) => {
    const { swapBasicData, swapDetails, quote, refuel, quoteIsLoading } = useSwapDataState()
    const { appName, signature } = useQueryState()
    const sourceIsImmutableX = swapBasicData?.source_network.name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swapBasicData?.source_network.name === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const isImtblMarketplace = (signature && appName === "imxMarketplace" && sourceIsImmutableX)

    const { networks } = useSettingsState()
    const source_network = swapBasicData?.source_network && networks.find(n => n.name === swapBasicData?.source_network?.name)
    const { provider } = useWallet(source_network, 'withdrawal')
    const selectedWallet = useMemo(() => provider?.activeWallet, [provider]);

    const { balances } = useSWRBalance(selectedWallet?.address, source_network)
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
            footer: <WalletTransferButton swapBasicData={swapBasicData} swapId={swapDetails?.id} refuel={!!refuel} onWithdrawalSuccess={onWithdrawalSuccess} balanceWarning={showInsufficientBalanceWarning ? <InsufficientBalanceWarning /> : null} />
        }
    }

    if (isImtblMarketplace) {
        withdraw = {
            content: <External />
        }
    }

    return (
        <>
            <Widget.Content>
                <div className="w-full flex flex-col justify-between  text-secondary-text">
                    <div className='grid grid-cols-1 gap-3 '>
                        <SwapSummary />
                        <SwapQuoteDetails swapBasicData={swapBasicData} quote={quote} refuel={refuel} quoteIsLoading={quoteIsLoading} />
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