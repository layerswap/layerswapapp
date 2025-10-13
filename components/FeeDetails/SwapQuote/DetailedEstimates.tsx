import { FC, SVGProps, useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../shadcn/tooltip'
import AverageCompletionTime from '../../Common/AverageCompletionTime'
import { RateElement } from '../Rate'
import { Quote } from '@/lib/apiClients/layerSwapApiClient'
import { Wallet } from '@/Models/WalletProvider'
import { SwapValues } from '..'
import { deriveQuoteComputed } from './utils'
import useWallet from '@/hooks/useWallet'
import useSWRGas from '@/lib/gases/useSWRGas'
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper'
import useSWRNftBalance from '@/lib/nft/useSWRNftBalance'
import { useSelectedAccount } from '@/context/balanceAccounts'
import { Slippage } from '../Slippage'

type DetailedEstimatesProps = {
    quote: Quote | undefined
    isQuoteLoading?: boolean
    sourceAddress?: string
    swapValues: SwapValues
    variant?: "base" | "extended"
}

export const DetailedEstimates: FC<DetailedEstimatesProps> = ({
    quote: quoteData,
    isQuoteLoading,
    sourceAddress,
    swapValues: values,
    variant
}) => {

    const quote = quoteData?.quote
    const reward = quoteData?.reward

    const isCEX = !!values.fromExchange
    const { provider } = useWallet(!isCEX ? values.from : undefined, 'withdrawal')

    const selectedSourceAccount = useSelectedAccount("from", values.from?.name);
    const wallet = useMemo(() => provider?.connectedWallets?.find(w => w.id === selectedSourceAccount?.id), [provider?.connectedWallets, selectedSourceAccount])

    const { gasData, isGasLoading } = useSWRGas(wallet?.address, values.from, values.fromAsset)
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token, quoteData?.quote)

    const { gasFeeInUsd, displayGasFeeInUsd, displayLsFee, displayLsFeeInUsd, receiveAtLeast, currencyName } = useMemo(
        () => deriveQuoteComputed({
            values,
            quote: quoteData?.quote,
            reward: quoteData?.reward,
            gasData,
            gasTokenPriceInUsd,
        }),
        [values, quoteData?.quote, quoteData?.reward, gasData, gasTokenPriceInUsd]
    )

    const shouldCheckNFT = reward?.campaign_type === "for_nft_holders" && reward?.nft_contract_address;
    const { balance: nftBalance, isLoading, error } = useSWRNftBalance(
        values.destination_address || '',
        values.to,
        reward?.nft_contract_address || ''
    );

    const showReward = !(!reward || !values.destination_address || shouldCheckNFT && (isLoading || error || nftBalance === undefined || nftBalance <= 0))
    return <div className="flex flex-col w-full px-2">
        {gasFeeInUsd !== null && gasFeeInUsd !== undefined && <GasFee gas={gasData?.gas} nativeCurrencyName={gasData?.token?.symbol} displayGasFeeInUsd={displayGasFeeInUsd} isGasLoading={isGasLoading} />}
        <Fees displayLsFeeInUsd={displayLsFeeInUsd} displayLsFee={displayLsFee} currencyName={currencyName} />
        <Rate fromAsset={values?.fromAsset} toAsset={values?.toAsset} requestAmount={quote?.requested_amount} receiveAmount={quote?.receive_amount} />
        <Slippage quoteData={quote} values={values} />
        <Estimates quote={quote} />
        {showReward && <Reward reward={reward} />}
        {variant === "extended" && <ReceiveAtLeast receiveAtLeast={receiveAtLeast} values={values} />}
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

const GasFee = ({ gas, nativeCurrencyName, displayGasFeeInUsd, isGasLoading }) => {
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
                    <span>{gas ? nativeCurrencyName : ''}</span>
                </TooltipContent>
            </Tooltip>
        </div>}
    </RowWrapper>
}

const Fees = ({ displayLsFeeInUsd, displayLsFee, currencyName }) => {
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
const Estimates = ({ quote }) => {
    return <RowWrapper title="Estimates">
        <AverageCompletionTime avgCompletionTime={quote.avg_completion_time} />
    </RowWrapper>
}

const Reward = ({ reward }) => {
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

const ReceiveAtLeast = ({ receiveAtLeast, values }) => {
    return <RowWrapper title="Receive at least">
        {receiveAtLeast !== undefined && (
            <span className="text-sm ml-1 font-small">
                {receiveAtLeast} {values?.toAsset?.symbol}
            </span>
        )}
    </RowWrapper>
}
const Rate = ({ fromAsset, toAsset, requestAmount, receiveAmount }) => {
    return <RowWrapper title="Rate">
        <RateElement fromAsset={fromAsset} toAsset={toAsset} requestAmount={requestAmount} receiveAmount={receiveAmount} />
    </RowWrapper>
}

const LoadingBar = () => (<div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />);