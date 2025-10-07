import { FC, SVGProps } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../shadcn/tooltip'
import AddressIcon from '../../AddressIcon'
import shortenAddress from '../../utils/ShortenAddress'
import AverageCompletionTime from '../../Common/AverageCompletionTime'
import { RateElement } from '../Rate'
import { Campaign, Quote } from '@/lib/apiClients/layerSwapApiClient'
import { Wallet } from '@/Models/WalletProvider'
import { SwapValues } from '..'
import { isValidAddress } from '@/lib/address/validator'
import { addressFormat } from '@/lib/address/formatter'
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon'

type DetailedEstimatesProps = {
    quote: Quote | undefined
    shouldCheckNFT?: string | false | undefined
    isQuoteLoading?: boolean
    destinationAddress?: string
    sourceAddress?: string
    swapValues: SwapValues
    gasData?: { gas?: number; token?: { symbol?: string } }
    isGasLoading?: boolean
    nftBalance?: number
    isLoading?: boolean
    error?: any
    campaign?: Campaign
    wallet?: Wallet
    computed: {
        currencyName: string
        displayGasFeeInUsd: string | null
        displayLsFee: string | undefined
        displayLsFeeInUsd: string | null
        gasFeeInUsd?: number | null
        receiveAtLeast?: number
    },
    variant?: "base" | "extended"
}

export const DetailedEstimates: FC<DetailedEstimatesProps> = ({
    quote: quoteData,
    isQuoteLoading,
    destinationAddress,
    sourceAddress,
    swapValues: values,
    gasData,
    isGasLoading,
    shouldCheckNFT,
    nftBalance,
    isLoading,
    error,
    campaign,
    wallet,
    computed,
    variant
}) => {

    const quote = quoteData?.quote
    const reward = quoteData?.reward

    const {
        currencyName,
        displayGasFeeInUsd,
        displayLsFee,
        displayLsFeeInUsd,
        gasFeeInUsd,
        receiveAtLeast,
    } = computed

    const detailsElements = variant === "extended" ? extendedDetailsElements : baseDetailsElements;

    return <div className="flex flex-col w-full px-3 pt-1">
        {
            detailsElements.map((item) => {
                const showElement = item.showCondition ? item.showCondition({ gasFeeInUsd, shouldCheckNFT, isLoading, error, nftBalance, campaign, reward, destinationAddress, sourceAddress }) : true
                if (!showElement) return null

                return (
                    <div key={item.name} className="flex items-center w-full justify-between gap-1 py-3 px-2 text-sm">
                        <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                            <label>
                                {item.name}
                            </label>
                        </div>
                        <div className="text-right text-primary-text">
                            {item.content({ gas: gasData?.gas, values, currencyName, nativeCurrencyName: gasData?.token?.symbol, displayGasFeeInUsd, quote, displayLsFee, displayLsFeeInUsd, wallet, isGasLoading, isQuoteLoading, reward, receiveAtLeast, destinationAddress, sourceAddress })}
                        </div>
                    </div>
                )
            })
        }
    </div>
}

const LoadingBar = () => (<div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />);

const extendedDetailsElements: DetailedElement[] = [
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

const baseDetailsElements: DetailedElement[] = [
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
    destinationAddress?: string | undefined
    sourceAddress?: string | undefined
    wallet?: Wallet | undefined
}

type ShowConditionProps = {
    gasFeeInUsd?: number | null

    shouldCheckNFT?: string | false | undefined
    isLoading?: boolean
    error?: any
    nftBalance?: number

    destinationAddress?: string | undefined
    sourceAddress?: string | undefined
    reward?: Quote["reward"]
    campaign?: Campaign | undefined
}

type DetailedElement = {
    name: string
    icon?: (props: SVGProps<SVGSVGElement>) => JSX.Element
    content: (props: DetailsContentProps) => JSX.Element
    showCondition?: (props: ShowConditionProps) => boolean
}