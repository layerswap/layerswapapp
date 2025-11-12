import { FC, SVGProps, useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../shadcn/tooltip'
import AverageCompletionTime from '../../Common/AverageCompletionTime'
import { RateElement } from '../Rate'
import { Quote, QuoteReward, SwapQuote } from '@/lib/apiClients/layerSwapApiClient'
import { Wallet } from '@/Models/WalletProvider'
import { SwapValues } from '..'
import { deriveQuoteComputed } from './utils'
import useWallet from '@/hooks/useWallet'
import useSWRGas from '@/lib/gases/useSWRGas'
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper'
import useSWRNftBalance from '@/lib/nft/useSWRNftBalance'
import { useSelectedAccount } from '@/context/balanceAccounts'
import { Slippage } from '../Slippage'
import { truncateDecimals } from '@/components/utils/RoundDecimals'

type DetailedEstimatesProps = {
    quote: Quote | undefined
    swapValues: SwapValues
    variant?: "base" | "extended"
}

export const DetailedEstimates: FC<DetailedEstimatesProps> = ({
    quote: quoteData,
    swapValues: values,
    variant
}) => {

    const quote = quoteData?.quote
    const reward = quoteData?.reward

    const shouldCheckNFT = reward?.campaign_type === "for_nft_holders" && reward?.nft_contract_address;
    const { balance: nftBalance, isLoading, error } = useSWRNftBalance(
        values.destination_address || '',
        values.to,
        reward?.nft_contract_address || ''
    );

    const showReward = !(!reward || !values.destination_address || shouldCheckNFT && (isLoading || error || nftBalance === undefined || nftBalance <= 0))
    return <div className="flex flex-col w-full px-2">
        {variant === "extended" && <GasFee values={values} quote={quote} />}
        <Fees quote={quote} values={values} />
        <Rate fromAsset={values?.fromAsset} toAsset={values?.toAsset} requestAmount={quote?.requested_amount} receiveAmount={quote?.receive_amount} />
        {variant === "extended" && values.depositMethod === "wallet" && <Slippage quoteData={quote} values={values} />}
        <Estimates quote={quote} />
        {showReward && <Reward reward={reward} />}
    </div>
}

type RowWrapperProps = {
    children: React.ReactNode
    title: string
}

const RowWrapper = ({ children, title }: RowWrapperProps) => {
    return <div className="flex items-center w-full justify-between gap-1 py-3 px-2 text-sm">
        <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
            <label>
                {title}
            </label>
        </div>
        <div className="text-right text-primary-text">
            {children}
        </div>
    </div>
}

export const GasFee = ({ values, quote }: { values: SwapValues, quote: SwapQuote | undefined }) => {
    const isCEX = !!values.fromExchange
    const { provider } = useWallet(!isCEX ? values.from : undefined, 'withdrawal')

    const selectedSourceAccount = useSelectedAccount("from", values.from?.name);
    const wallet = useMemo(() => provider?.connectedWallets?.find(w => w.id === selectedSourceAccount?.id), [provider?.connectedWallets, selectedSourceAccount])

    const { gasData, isGasLoading } = useSWRGas(wallet?.address, values.from, values.fromAsset)
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token, quote)
    const gasFeeInUsd = gasData?.gas && gasTokenPriceInUsd ? gasData.gas * gasTokenPriceInUsd : null
    const displayGasFeeInUsd = gasFeeInUsd != null ? (gasFeeInUsd < 0.01 ? '<$0.01' : `$${gasFeeInUsd.toFixed(2)}`) : null
    const gas = gasData?.gas
    const gasCurrencyName = gasData?.token?.symbol

    if (!gasFeeInUsd || !gasFeeInUsd) return null

    return <RowWrapper title="Gas Fee">
        {isGasLoading ? (
            <LoadingBar />
        ) : <div>
            <Tooltip>
                <TooltipTrigger asChild>
                    {gas !== undefined && (
                        <span className="text-sm ml-1 font-small">
                            {displayGasFeeInUsd}
                        </span>
                    )}
                </TooltipTrigger>
                <TooltipContent className="!bg-secondary-300 !border-secondary-300 !text-primary-text">
                    <span>{gas || '-'} </span>
                    <span>{gas ? gasCurrencyName : ''}</span>
                </TooltipContent>
            </Tooltip>
        </div>}
    </RowWrapper>
}

const Fees = ({ quote, values }: { quote: SwapQuote | undefined, values: SwapValues }) => {

    const lsFeeAmountInUsd = quote?.total_fee_in_usd
    const displayLsFeeInUsd = lsFeeAmountInUsd != null ? (lsFeeAmountInUsd < 0.01 ? '<$0.01' : `$${lsFeeAmountInUsd.toFixed(2)}`) : null
    const currencyName = values.fromAsset?.symbol || ''
    const displayLsFee = quote?.total_fee !== undefined ? truncateDecimals(quote.total_fee, values.fromAsset?.decimals) : undefined

    return <RowWrapper title="Fees">
        <Tooltip>
            <TooltipTrigger asChild>
                {displayLsFeeInUsd !== undefined && (
                    <span className="text-sm ml-1 font-small">
                        {displayLsFeeInUsd}
                    </span>
                )}
            </TooltipTrigger>
            <TooltipContent className="!bg-secondary-300 !border-ssecondary-300 !text-primart-text">
                <span>{displayLsFee || '-'} </span>
                <span>{displayLsFee ? currencyName : ''}</span>
            </TooltipContent>
        </Tooltip>
    </RowWrapper>
}
const Estimates = ({ quote }: { quote: SwapQuote | undefined }) => {
    return <RowWrapper title="Estimates">
        <AverageCompletionTime avgCompletionTime={quote?.avg_completion_time} />
    </RowWrapper>
}

const Reward = ({ reward }: { reward: QuoteReward }) => {
    return <RowWrapper title="Reward">
        <Tooltip>
            <TooltipTrigger asChild>
                {reward?.amount_in_usd !== undefined && (
                    <span className="text-sm ml-1 font-small">
                        ${reward.amount_in_usd.toFixed(2)}
                    </span>
                )}
            </TooltipTrigger>
            <TooltipContent className="!bg-secondary-300 !border-secondary-300 !text-primart-text">
                <span>{reward?.amount || '-'} </span>
                <span>{reward?.amount ? reward.token.symbol : ''}</span>
            </TooltipContent>
        </Tooltip>
    </RowWrapper>
}

const Rate = ({ fromAsset, toAsset, requestAmount, receiveAmount }) => {
    return <RowWrapper title="Rate">
        <RateElement fromAsset={fromAsset} toAsset={toAsset} requestAmount={requestAmount} receiveAmount={receiveAmount} />
    </RowWrapper>
}

const LoadingBar = () => (<div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />);