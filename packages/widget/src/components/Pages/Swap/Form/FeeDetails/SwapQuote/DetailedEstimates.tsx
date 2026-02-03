import { FC, useMemo } from "react";
import AverageCompletionTime from "@/components/Common/AverageCompletionTime";
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/shadcn/tooltip"
import useSWRGas from "@/lib/gases/useSWRGas";
import useWallet from "@/hooks/useWallet";
import { QuoteReward, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';
import useSWRNftBalance from "@/lib/nft/useSWRNftBalance";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapValues } from "..";
import { RateElement } from "../Rate";
import { Slippage } from "../Slippage";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { Network, NetworkRouteToken } from "@/Models";
import { ExtendedAddress } from "@/components/Input/Address/AddressPicker/AddressWithIcon";
import { Address } from "@/lib/address/Address";
import shortenString from "@/components/utils/ShortenString";

type DetailedEstimatesProps = {
    quote: SwapQuote | undefined,
    reward?: QuoteReward,
    swapValues: SwapValues
    variant?: "base" | "extended"
}

export const DetailedEstimates: FC<DetailedEstimatesProps> = ({
    quote,
    reward,
    swapValues: values,
    variant
}) => {
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
        {values.depositMethod !== "deposit_address" && <Rate fromAsset={values?.fromAsset} toAsset={values?.toAsset} rate={quote?.rate} />}
        {values.depositMethod === "deposit_address" && variant === "extended" && values?.fromAsset?.contract && <ExchangeTokenContract fromAsset={values?.fromAsset} network={values?.from} />}
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
                <TooltipContent className="bg-secondary-300! border-secondary-300! text-primary-text!">
                    <span>{gas || '-'} </span>
                    <span>{gas ? gasCurrencyName : ''}</span>
                </TooltipContent>
            </Tooltip>
        </div>}
    </RowWrapper>
}

const Fees = ({ quote, values }: { quote: SwapQuote | undefined, values: SwapValues }) => {

    const lsFeeAmountInUsd = quote?.total_fee_in_usd
    const feeDiscount = quote?.fee_discount
    const hasDiscount = feeDiscount != null && feeDiscount > 0

    // total_fee is the original fee, discounted fee is total_fee - fee_discount
    const originalFee = quote?.total_fee
    const discountedFee = hasDiscount && originalFee !== undefined
        ? originalFee - feeDiscount
        : originalFee

    // Calculate fees in USD
    const sourceTokenPriceInUsd = resolveTokenUsdPrice(values.fromAsset, quote)
    const originalFeeInUsd = originalFee !== undefined && sourceTokenPriceInUsd != null
        ? originalFee * sourceTokenPriceInUsd
        : null

    // Calculate discounted fee in USD
    const discountedFeeInUsd = discountedFee !== undefined && sourceTokenPriceInUsd != null
        ? discountedFee * sourceTokenPriceInUsd
        : null

    const displayOriginalFeeInUsd = originalFeeInUsd != null
        ? (originalFeeInUsd < 0.01 ? '<$0.01' : `$${originalFeeInUsd.toFixed(2)}`)
        : null

    const isFree = discountedFee !== undefined && discountedFee === 0
    const displayLsFeeInUsd = isFree
        ? "Free"
        : (discountedFeeInUsd != null
            ? (discountedFeeInUsd < 0.01 ? '<$0.01' : `$${discountedFeeInUsd.toFixed(2)}`)
            : null)

    const currencyName = values.fromAsset?.symbol || ''
    const displayLsFee = discountedFee !== undefined
        ? truncateDecimals(discountedFee, values.fromAsset?.decimals)
        : undefined

    return <RowWrapper title="Fees">
        <Tooltip>
            <TooltipTrigger asChild>
                {displayLsFeeInUsd !== undefined && (
                    <div className="flex items-center gap-2 text-sm ml-1 font-small">
                        {hasDiscount && displayOriginalFeeInUsd && (
                            <span className="line-through text-primary-text-tertiary">
                                {displayOriginalFeeInUsd}
                            </span>
                        )}
                        <span className={hasDiscount || isFree ? "text-primary-text" : ""}>
                            {displayLsFeeInUsd}
                        </span>
                    </div>
                )}
            </TooltipTrigger>
            <TooltipContent className="bg-secondary-300! border-secondary-300! text-primart-text!">
                <span>{displayLsFee || '-'} </span>
                <span>{displayLsFee ? currencyName : ''}</span>
            </TooltipContent>
        </Tooltip>
    </RowWrapper>
}
const Estimates = ({ quote }: { quote: SwapQuote | undefined }) => {
    return <RowWrapper title="Est. time">
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
            <TooltipContent className="bg-secondary-300! border-secondary-300! text-primart-text!">
                <span>{reward?.amount || '-'} </span>
                <span>{reward?.amount ? reward.token.symbol : ''}</span>
            </TooltipContent>
        </Tooltip>
    </RowWrapper>
}
type RateProps = {
    fromAsset?: NetworkRouteToken
    toAsset?: NetworkRouteToken
    rate?: number
}
const Rate = ({ fromAsset, toAsset, rate }: RateProps) => {
    if (!fromAsset || !toAsset || !rate) {
        return null
    }
    return <RowWrapper title="Rate">
        <RateElement fromAsset={fromAsset} toAsset={toAsset} rate={rate} />
    </RowWrapper>
}

const ExchangeTokenContract = ({ fromAsset, network }: { fromAsset: NetworkRouteToken | undefined, network: Network | undefined }) => {
    const isValidAddress = useMemo(() => {
        return fromAsset?.contract && network && Address.isValid(fromAsset.contract, network)
    }, [fromAsset?.contract, network])

    const shortAddress = useMemo(() => {
        if (!fromAsset?.contract) return ''
        if (network) return new Address(fromAsset.contract, network).toShortString()
        return shortenString(fromAsset.contract)
    }, [fromAsset?.contract, network])

    return <RowWrapper title={`${network?.display_name} - ${fromAsset?.symbol}`}>
        {
            isValidAddress && fromAsset?.contract && network ? (
                <div className="text-sm group/addressItem text-secondary-text">
                    <ExtendedAddress 
                        address={fromAsset.contract} 
                        network={network} 
                        showDetails={false} 
                        shouldShowChevron={false} 
                    />
                </div>
            ) : (
                <p className="text-sm text-secondary-text">{shortAddress}</p>
            )
        }
    </RowWrapper>
}

const LoadingBar = () => (<div className='h-2.5 w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />);