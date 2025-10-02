import { FC, SVGProps } from "react";
import AverageCompletionTime from "../Common/AverageCompletionTime";
import { Tooltip, TooltipContent, TooltipTrigger, } from "../../components/shadcn/tooltip"
import { truncateDecimals } from "../utils/RoundDecimals";
import useSWRGas from "@/lib/gases/useSWRGas";
import useWallet from "@/hooks/useWallet";
import LayerSwapApiClient, { Campaign, Quote } from '@/lib/apiClients/layerSwapApiClient';
import useSWRNftBalance from "@/lib/nft/useSWRNftBalance";
import { QuoteComponentProps, SwapValues } from ".";
import useSWR from "swr";
import { ApiResponse } from "@/Models/ApiResponse";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { RateElement } from "./Rate";
import { useSelectedAccount } from "@/context/balanceAccounts";

export const DetailedEstimates: FC<QuoteComponentProps> = ({ quote: quoteData, isQuoteLoading, destination, destinationAddress, swapValues: values }) => {
    const { quote, reward } = quoteData || {}
    const { from, fromAsset, fromExchange } = values;
    const isCEX = !!fromExchange;
    const sourceAccountNetwork = !isCEX ? values.from : undefined
    const selectedSourceAccount = useSelectedAccount("from", sourceAccountNetwork?.name);
    const { gasData, isGasLoading } = useSWRGas(selectedSourceAccount?.address, from, fromAsset)

    const shouldCheckNFT = reward?.campaign_type === "for_nft_holders" && reward?.nft_contract_address;
    const { balance: nftBalance, isLoading, error } = useSWRNftBalance(
        destinationAddress || '',
        destination,
        reward?.nft_contract_address || ''
    );
    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)
    const now = new Date().getTime()
    const campaign = campaignsData
        ?.data
        ?.find(c =>
            c?.network.name === destination?.name
            && new Date(c?.end_date).getTime() - now > 0)

    const displayLsFee = quote?.total_fee !== undefined ? truncateDecimals(quote.total_fee, fromAsset?.decimals) : undefined
    const currencyName = fromAsset?.symbol || ""
    const lsFeeAmountInUsd = quote?.total_fee_in_usd
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token, quote)
    const gasFeeInUsd = (gasData && gasTokenPriceInUsd) ? gasData.gas * gasTokenPriceInUsd : null;
    const displayLsFeeInUsd = lsFeeAmountInUsd ? (lsFeeAmountInUsd < 0.01 ? '<$0.01' : `$${lsFeeAmountInUsd?.toFixed(2)}`) : null
    const displayGasFeeInUsd = gasFeeInUsd ? (gasFeeInUsd < 0.01 ? '<$0.01' : `$${gasFeeInUsd?.toFixed(2)}`) : null
    const receiveAtLeast = quote?.min_receive_amount

    return <div className="flex flex-col w-full px-3 pt-1">
        {
            detailsElements.map((item) => {
                const showElement = item.showCondition ? item.showCondition({ gasFeeInUsd, shouldCheckNFT, isLoading, error, nftBalance, campaign, reward, destinationAddress }) : true
                if (!showElement) return null

                return (
                    <div key={item.name} className="flex items-center w-full justify-between gap-1 py-3 px-2 text-sm">
                        <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                            <label>
                                {item.name}
                            </label>
                        </div>
                        <div className="text-right text-primary-text">
                            {item.content({ gas: gasData?.gas, values, currencyName, nativeCurrencyName: gasData?.token?.symbol, displayGasFeeInUsd, quote, displayLsFee, displayLsFeeInUsd, isGasLoading, isQuoteLoading, reward, receiveAtLeast })}
                        </div>
                    </div>
                )
            })
        }
    </div>
}

export const LoadingBar = () => (<div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />);

const detailsElements: DetailedElement[] = [
    {
        name: 'Gas Fee',
        showCondition: (props) => { return props.gasFeeInUsd !== null && props.gasFeeInUsd !== undefined },
        content: ({ gas, nativeCurrencyName, displayGasFeeInUsd, isGasLoading }) => {
            return isGasLoading ? (
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
            </div>
        }
    },
    {
        name: 'Fees',
        content: ({ displayLsFeeInUsd, displayLsFee, currencyName, isQuoteLoading }) => {
            return isQuoteLoading ? (
                <LoadingBar />
            ) : <div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {displayLsFeeInUsd !== undefined && (
                            <span className="text-sm ml-1 font-small">
                                {displayLsFeeInUsd}
                            </span>
                        )}
                    </TooltipTrigger>
                    <TooltipContent className="!bg-secondary-300 !border-secondary-300 !text-primart-text">
                        <span>{displayLsFee || '-'} </span>
                        <span>{displayLsFee ? currencyName : ''}</span>
                    </TooltipContent>
                </Tooltip>
            </div>
        }
    },
    {
        name: 'Receive at least',
        content: ({ currencyName, isQuoteLoading, receiveAtLeast }) => {
            return isQuoteLoading ? (
                <LoadingBar />
            ) : <div>
                {receiveAtLeast !== undefined && (
                    <span className="text-sm ml-1 font-small">
                        {receiveAtLeast} {currencyName}
                    </span>
                )}
            </div >
        }
    },
    {
        name: 'Rate',
        content: ({ isQuoteLoading, quote, values }) => {
            if (isQuoteLoading) return <LoadingBar />

            return (
                <RateElement
                    fromAsset={values?.fromAsset}
                    toAsset={values?.toAsset}
                    requestAmount={quote?.requested_amount}
                    receiveAmount={quote?.receive_amount}
                />
            )
        }
    },
    {
        name: 'Est. time',
        content: ({ quote }) => {
            return quote && quote.avg_completion_time !== '00:00:00' ?
                <div>
                    <AverageCompletionTime avgCompletionTime={quote.avg_completion_time} />
                </div>
                : (
                    <LoadingBar />
                )
        }
    },
    {
        name: 'Reward',
        showCondition: (props) => {
            const { campaign, reward, destinationAddress, shouldCheckNFT, isLoading, error, nftBalance } = props || {}
            if (!campaign || !reward || !destinationAddress)
                return false

            if (shouldCheckNFT && (isLoading || error || nftBalance === undefined || nftBalance <= 0))
                return false

            return true
        },
        content: ({ reward }) => {
            return !reward ? (
                <LoadingBar />
            ) : <div>
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
            </div>
        }
    }
]

type DetailsContentProps = {
    gas: number | undefined
    currencyName: string
    nativeCurrencyName?: string
    displayGasFeeInUsd: string | null
    displayLsFee: string | undefined
    displayLsFeeInUsd: string | null
    quote: Quote["quote"] | undefined
    isQuoteLoading?: boolean
    isGasLoading?: boolean
    receiveAtLeast?: number | undefined
    reward?: Quote["reward"]
    values?: SwapValues
}

type ShowConditionProps = {
    gasFeeInUsd?: number | null

    shouldCheckNFT?: string | false | undefined
    isLoading?: boolean
    error?: any
    nftBalance?: number

    destinationAddress?: string | undefined
    reward?: Quote["reward"]
    campaign?: Campaign | undefined
}

type DetailedElement = {
    name: string
    icon?: (props: SVGProps<SVGSVGElement>) => JSX.Element
    content: (props: DetailsContentProps) => JSX.Element
    showCondition?: (props: ShowConditionProps) => boolean
}