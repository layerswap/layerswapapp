import { FC } from 'react'
import { useSwapDataState } from '@/context/swap';
import KnownInternalNames from '@/lib/knownIds';
import SwapSummary from '../Summary';
import External from './External';
import { useQueryState } from '@/context/query';
import { Widget } from '../../Widget/Index';
import { SwapQuoteDetails } from './SwapQuoteDetails';
import WalletTransferButton from './WalletTransferButton';
import { useBalance } from '@/lib/balances/useBalance';
import { useSettingsState } from '@/context/settings';
import { useSelectedAccount } from '@/context/swapAccounts';
import { ErrorDisplay } from '@/components/validationError/ErrorDisplay';
import { Partner } from '@/Models/Partner';
import useOutOfGas from '@/lib/gases/useOutOfGas';
import { transformSwapDataToQuoteArgs, useQuoteData } from '@/hooks/useFee';
import { truncateDecimals } from '@/components/utils/RoundDecimals';

const Withdraw: FC<{ type: 'widget' | 'contained', onWalletWithdrawalSuccess?: () => void, onCancelWithdrawal?: () => void, partner?: Partner }> = ({ type, onWalletWithdrawalSuccess, onCancelWithdrawal, partner }) => {
    const { swapBasicData, swapDetails, quote, refuel, quoteIsLoading, quoteError } = useSwapDataState()

    const { appName, signature } = useQueryState()
    const sourceIsImmutableX = swapBasicData?.source_network.name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swapBasicData?.source_network.name === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const isImtblMarketplace = (signature && appName === "imxMarketplace" && sourceIsImmutableX)

    const { networks } = useSettingsState()
    const source_network = swapBasicData?.source_network && networks.find(n => n.name === swapBasicData?.source_network?.name)
    const selectedSourceAccount = useSelectedAccount("from", source_network?.name);

    const { balances, mutate, isLoading } = useBalance(selectedSourceAccount?.address, source_network)
    const walletBalance = source_network && balances?.find(b => b?.network === source_network?.name && b?.token === swapBasicData?.source_token?.symbol)
    const walletBalanceAmount = walletBalance?.amount

    let withdraw: {
        content?: JSX.Element | JSX.Element[],
        footer?: JSX.Element | JSX.Element[],
        footerKey?: string,
    } = {}

    const showInsufficientBalanceWarning = swapBasicData?.use_deposit_address === false
        && swapBasicData?.requested_amount
        && Number(swapBasicData?.requested_amount)
        && Number(walletBalanceAmount) < Number(swapBasicData?.requested_amount)

    const quoteArgs = transformSwapDataToQuoteArgs(swapBasicData, !!refuel);
    const { minAllowedAmount, maxAllowedAmount } = useQuoteData(quoteArgs);
    const { outOfGas } = useOutOfGas({
        address: selectedSourceAccount?.address,
        network: source_network,
        token: swapBasicData?.source_token,
        amount: swapBasicData?.requested_amount,
        balances,
        minAllowedAmount,
        maxAllowedAmount
    })
    
    if (swapBasicData?.use_deposit_address === false && showInsufficientBalanceWarning) {
        withdraw = {
            footerKey: 'insufficient',
            footer: <ErrorDisplay
                errorName='insufficientFunds'
                refreshBalance={mutate}
                isBalanceLoading={isLoading}
                balanceAmount={walletBalanceAmount !== undefined ? truncateDecimals(walletBalanceAmount, swapBasicData?.source_token?.precision) : undefined}
                tokenSymbol={swapBasicData?.source_token?.symbol}
            />
        }
    } else if (swapBasicData?.use_deposit_address === false && outOfGas) {
        withdraw = {
            footerKey: 'outOfGas',
            footer: <WalletTransferButton
                swapBasicData={swapBasicData}
                swapId={swapDetails?.id}
                refuel={!!refuel}
                onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                warning={outOfGas ? <ErrorDisplay errorName='outOfGas' onEditAmount={onCancelWithdrawal} /> : null}
                onCancelWithdrawal={onCancelWithdrawal}
            />
        }
    }
    else if (swapBasicData?.use_deposit_address === false) {
        withdraw = {
            footerKey: 'transfer',
            footer: <WalletTransferButton
                swapBasicData={swapBasicData}
                swapId={swapDetails?.id}
                refuel={!!refuel}
                onWalletWithdrawalSuccess={onWalletWithdrawalSuccess}
                onCancelWithdrawal={onCancelWithdrawal}
            />
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
                        <SwapQuoteDetails swapBasicData={swapBasicData} quote={quote} refuel={refuel} quoteIsLoading={quoteIsLoading} quoteError={quoteError} partner={partner} />
                        {withdraw?.content}
                    </div>
                </div>
            </Widget.Content>
            {
                withdraw?.footer &&
                <Widget.Footer sticky={type == 'widget'}>
                    <div key={withdraw.footerKey} className="animate-fade-in">
                        {withdraw?.footer}
                    </div>
                </Widget.Footer>
            }
        </>
    )
}


export default Withdraw