import { FC, SVGProps, useMemo } from "react";
import AverageCompletionTime from "@/components/Common/AverageCompletionTime";
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/shadcn/tooltip"
import useSWRGas from "@/lib/gases/useSWRGas";
import useWallet from "@/hooks/useWallet";
import { Quote } from '@/lib/apiClients/layerSwapApiClient';
import useSWRNftBalance from "@/lib/nft/useSWRNftBalance";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { useSelectedAccount } from "@/context/balanceAccounts";
import { SwapValues } from "..";
import { deriveQuoteComputed } from "./utils";
import { RateElement } from "../Rate";
import { Wallet } from "@/Models/WalletProvider";

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

    const detailsElements = variant === "extended" ? extendedDetailsElements : baseDetailsElements;

    return <div className="flex flex-col w-full px-2">
        {
            detailsElements.map((item) => {
                const showElement = item.showCondition ? item.showCondition({ gasFeeInUsd, shouldCheckNFT, isLoading, error, nftBalance, reward, destinationAddress: values.destination_address, sourceAddress }) : true
                if (!showElement) return null

                return (
                    <div key={item.name} className="flex items-center w-full justify-between gap-1 py-3 px-2 text-sm">
                        <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                            <label>
                                {item.name}
                            </label>
                        </div>
                        <div className="text-right text-primary-text">
                            {item.content({ gas: gasData?.gas, values, currencyName, nativeCurrencyName: gasData?.token?.symbol, displayGasFeeInUsd, quote, displayLsFee, displayLsFeeInUsd, wallet: wallet, isGasLoading, isQuoteLoading, reward, receiveAtLeast, destinationAddress: values.destination_address, sourceAddress })}
                        </div>
                    </div>
                )
            })
        }
    </div>
}

const LoadingBar = () => (<div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />);

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
                    <TooltipContent className="!bg-secondary-300 !border-ssecondary-300 !text-primart-text">
                        <span>{displayLsFee || '-'} </span>
                        <span>{displayLsFee ? currencyName : ''}</span>
                    </TooltipContent>
                </Tooltip>
            </div>
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
            const { reward, destinationAddress, shouldCheckNFT, isLoading, error, nftBalance } = props || {}
            if (!reward || !destinationAddress)
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

const extendedDetailsElements: DetailedElement[] = [
    {
        name: 'Receive at least',
        content: ({ isQuoteLoading, receiveAtLeast, values }) => {
            return isQuoteLoading ? (
                <LoadingBar />
            ) : <div>
                {receiveAtLeast !== undefined && (
                    <span className="text-sm ml-1 font-small">
                        {receiveAtLeast} {values?.toAsset?.symbol}
                    </span>
                )}
            </div >
        }
    },
    ...baseDetailsElements
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
}

type DetailedElement = {
    name: string
    icon?: (props: SVGProps<SVGSVGElement>) => JSX.Element
    content: (props: DetailsContentProps) => JSX.Element
    showCondition?: (props: ShowConditionProps) => boolean
}