import { SwapFormValues } from '../../DTOs/SwapFormValues';
import ResizablePanel from '../../ResizablePanel';
import { FC, SVGProps, useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shadcn/accordion';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import LayerSwapApiClient, { Campaign, Quote } from '@/lib/apiClients/layerSwapApiClient';
import AverageCompletionTime from '../../Common/AverageCompletionTime';
import useSWRGas from "@/lib/gases/useSWRGas";
import useWallet from "@/hooks/useWallet";
import GasIcon from '../../icons/GasIcon';
import Clock from '../../icons/Clock';
import rewardCup from '@/public/images/rewardCup.png'
import Image from 'next/image'
import { Network } from '@/Models/Network';
import ExchangeGasIcon from '../../icons/ExchangeGasIcon';
import useSWRNftBalance from '@/lib/nft/useSWRNftBalance';
import NumberFlow from '@number-flow/react';
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper';
import shortenAddress from '../../utils/ShortenAddress';
import AddressIcon from '../../AddressIcon';
import { LoadingBar } from '../DetailedEstimates';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../shadcn/tooltip';
import { RateElement } from '../Rate';
import useSWR from 'swr';
import { ApiResponse } from '@/Models/ApiResponse';
import { truncateDecimals } from '../../utils/RoundDecimals';
import { Wallet } from '@/Models/WalletProvider';

export interface SwapValues extends Omit<SwapFormValues, 'from' | 'to'> {
    from?: Network;
    to?: Network;
}

export interface QuoteComponentProps {
    quote: Quote | undefined;
    isQuoteLoading?: boolean;
    swapValues: SwapValues;
    destination?: Network,
    destinationAddress?: string;
    sourceAddress?: string;
    onOpen?: () => void;
    isAccordionOpen?: boolean;
}

export default function SwapQuoteComp({ swapValues: values, quote: quoteData, isQuoteLoading }: QuoteComponentProps) {
    const { toAsset, fromAsset: fromCurrency, destination_address } = values || {};
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

    const { provider } = useWallet(values.from, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);

    return (
        <>
            {
                quoteData &&
                <Accordion type='single' collapsible className='w-full' value={isAccordionOpen ? 'quote' : ''} onValueChange={(value) => { setIsAccordionOpen(value === 'quote') }}>
                    <AccordionItem value='quote' className='bg-secondary-500 rounded-2xl'>
                        <AccordionTrigger
                            onClick={(e) => e.preventDefault()}
                            className={clsx(`${isAccordionOpen ? 'hidden' : ''} px-3.5 pb-3.5 pr-5 w-full rounded-2xl flex items-center justify-between cursor-auto`)}
                        >
                            <DetailsButton
                                quote={quoteData}
                                isQuoteLoading={isQuoteLoading}
                                swapValues={values}
                                destination={values.to}
                                destinationAddress={destination_address}
                                sourceAddress={selectedSourceAccount?.address}
                                onOpen={() => setIsAccordionOpen(true)}
                            />
                        </AccordionTrigger>
                        <AccordionContent className='rounded-2xl'>
                            <ResizablePanel>
                                {
                                    (quoteData || isQuoteLoading) && fromCurrency && toAsset &&
                                    <DetailedEstimates
                                        quote={quoteData}
                                        isQuoteLoading={isQuoteLoading}
                                        destination={values.to}
                                        swapValues={values}
                                        destinationAddress={destination_address}
                                        sourceAddress={selectedSourceAccount?.address} />
                                }
                            </ResizablePanel>
                        </AccordionContent>
                        {isAccordionOpen && (
                            <div className="px-3.5 pb-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAccordionOpen(false)}
                                    className="mx-auto flex items-center justify-center gap-1 text-sm text-secondary-text hover:text-primary-text"
                                >
                                    Close details
                                    <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform" />
                                </button>
                            </div>
                        )}
                    </AccordionItem>
                </Accordion>
            }
        </>
    )
}


const DetailsButton: FC<QuoteComponentProps> = ({ quote: quoteData, isQuoteLoading, swapValues: values, destination, destinationAddress, sourceAddress, onOpen }) => {
    const { quote, reward } = quoteData || {}
    const isCEX = !!values.fromExchange;
    const { provider } = useWallet(!isCEX ? values.from : undefined, 'withdrawal')
    const wallet = useMemo(() => provider?.activeWallet, [provider]);
    const { gasData: gasData } = useSWRGas(wallet?.address, values.from, values.fromAsset)
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token, quote)
    const gasFeeInUsd = (gasData && gasTokenPriceInUsd) ? gasData.gas * gasTokenPriceInUsd : null;
    const averageCompletionTime = quote?.avg_completion_time;

    const receiveAtLeast = quote?.min_receive_amount

    const shouldCheckNFT = reward?.campaign_type === "for_nft_holders" && reward?.nft_contract_address;
    const { balance: nftBalance, isLoading, error } = useSWRNftBalance(
        destinationAddress || '',
        destination,
        reward?.nft_contract_address || ''
    );

    return (
        <div className="flex flex-col w-full pt-1">
            {(destinationAddress && sourceAddress?.toLowerCase() !== destinationAddress?.toLowerCase()) &&
                <div className="flex items-center w-full justify-between gap-1 py-3 text-sm">
                    <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                        <label>
                            Send to
                        </label>
                    </div>
                    <div className="text-right text-primary-text">
                        <span className="cursor-pointer hover:underline flex items-center gap-2">
                            {wallet?.icon ?
                                <wallet.icon className="w-4 h-4 p-0.5 bg-white rounded-sm" />
                                :
                                <AddressIcon className="h-4 w-4" address={destinationAddress} size={36} rounded='4px' />
                            }
                            {shortenAddress(destinationAddress || '')}
                        </span>
                    </div>
                </div>
            }
            <div className="flex items-center w-full justify-between gap-1 py-3 text-sm">
                <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                    <label>
                        Receive at least
                    </label>
                </div>
                <div className="text-right text-primary-text">
                    <span className="cursor-pointer hover:underline flex items-center gap-2">
                        {receiveAtLeast !== undefined && (
                            <span className="text-sm ml-1 font-small">
                                {receiveAtLeast} {values?.fromAsset?.symbol}
                            </span>
                        )}
                    </span>
                </div>
            </div>
            <div className='flex items-center space-x-4 py-3'>
                {
                    gasFeeInUsd &&
                    <div className={clsx(
                        "inline-flex items-center gap-1",
                        { "animate-pulse-strong": isQuoteLoading }
                    )}>
                        <div className='p-0.5'>
                            {!values.fromExchange ?
                                <GasIcon className='h-4 w-4 text-secondary-text' /> : <ExchangeGasIcon className='h-5 w-5 text-secondary-text' />
                            }
                        </div>
                        <NumberFlow className="text-secondary-text text-sm leading-6" value={gasFeeInUsd < 0.01 ? '0.01' : gasFeeInUsd} format={{ style: 'currency', currency: 'USD' }} prefix={gasFeeInUsd < 0.01 ? '<' : undefined} />
                        <div className="ml-3 w-px h-3 bg-primary-text-placeholder rounded-2xl" />
                    </div>
                }
                {
                    averageCompletionTime &&
                    <>
                        <div className={clsx(
                            "text-right inline-flex items-center gap-1 text-sm",
                            { "animate-pulse-strong": isQuoteLoading }
                        )}>
                            <div className='p-0.5'>
                                <Clock className='h-4 w-4 text-secondary-text' />
                            </div>
                            <AverageCompletionTime className="text-secondary-text" avgCompletionTime={quote.avg_completion_time} />
                        </div>
                    </>
                }
                {
                    reward &&
                    (!shouldCheckNFT || (!isLoading && !error && nftBalance !== undefined && nftBalance > 0)) &&
                    <>
                        <div className="w-px h-3 bg-primary-text-placeholder rounded-2xl" />
                        <div className='text-right text-secondary-text inline-flex items-center gap-1 pr-4'>
                            <Image src={rewardCup} alt="Reward" width={16} height={16} />
                            <NumberFlow value={reward?.amount_in_usd < 0.01 ? '0.01' : reward?.amount_in_usd} format={{ style: 'currency', currency: 'USD' }} prefix={reward?.amount_in_usd < 0.01 ? '<' : undefined} />
                        </div>
                    </>
                }
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpen?.();
                    }}
                    className='flex items-center text-secondary-text text-sm whitespace-nowrap gap-0.5 ml-auto hover:text-primary-text'
                    aria-label="See details"
                >
                    <span>See details</span>
                    <ChevronDown className='h-3.5 w-3.5' />
                </button>
            </div>
        </div>
    )
}

const DetailedEstimates: FC<QuoteComponentProps> = ({ quote: quoteData, isQuoteLoading, destination, destinationAddress, swapValues: values, sourceAddress }) => {
    const { quote, reward } = quoteData || {}
    const { from, fromAsset, fromExchange } = values;
    const isCEX = !!fromExchange;
    const { provider } = useWallet(!isCEX ? values.from : undefined, 'withdrawal')
    const wallet = provider?.activeWallet
    const { gasData, isGasLoading } = useSWRGas(wallet?.address, from, fromAsset)

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
                            {item.content({ gas: gasData?.gas, values, currencyName, nativeCurrencyName: gasData?.token?.symbol, displayGasFeeInUsd, quote, displayLsFee, displayLsFeeInUsd, isGasLoading, isQuoteLoading, reward, receiveAtLeast, destinationAddress, sourceAddress })}
                        </div>
                    </div>
                )
            })
        }
    </div>
}

const detailsElements: DetailedElement[] = [
    {
        name: 'Send to',
        showCondition: (props) => { return props.destinationAddress?.toLowerCase() !== props?.sourceAddress?.toLowerCase() },
        content: ({ isQuoteLoading, destinationAddress, sourceAddress, selectedWallet }) => {
            return isQuoteLoading ? (
                <LoadingBar />
            ) : <div>
                {(destinationAddress && sourceAddress?.toLowerCase() !== destinationAddress?.toLowerCase()) &&
                    <div className="flex items-center w-full justify-between gap-1 py-3 text-sm">
                        <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
                            <label>
                                Send to
                            </label>
                        </div>
                        <div className="text-right text-primary-text">
                            <span className="cursor-pointer hover:underline flex items-center gap-2">
                                {selectedWallet?.icon ?
                                    <selectedWallet.icon className="w-4 h-4 p-0.5 bg-white rounded-sm" />
                                    :
                                    <AddressIcon className="h-4 w-4" address={destinationAddress} size={36} rounded='4px' />
                                }
                                {shortenAddress(destinationAddress || '')}
                            </span>
                        </div>
                    </div>
                }
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
                    fromAsset={values?.fromAsset?.symbol}
                    toAsset={values?.toAsset?.symbol}
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
                <Tooltip delayDuration={100}>
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
                <Tooltip delayDuration={100}>
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
                <Tooltip delayDuration={100}>
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
    selectedWallet?: Wallet | undefined
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