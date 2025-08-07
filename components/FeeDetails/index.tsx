import { SwapFormValues } from '../DTOs/SwapFormValues';
import { DetailedEstimates } from './DetailedEstimates';
import ResizablePanel from '../ResizablePanel';
import { FC, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Quote } from '@/lib/apiClients/layerSwapApiClient';
import AverageCompletionTime from '../Common/AverageCompletionTime';
import useSWRGas from "@/lib/gases/useSWRGas";
import useWallet from "@/hooks/useWallet";
import GasIcon from '../icons/GasIcon';
import Clock from '../icons/Clock';
import rewardCup from '@/public/images/rewardCup.png'
import Image from 'next/image'
import { Network } from '@/Models/Network';
import { AnimatedValue } from '../Common/AnimatedValue';
import ExchangeGasIcon from '../icons/ExchangeGasIcon';
import useSWRNftBalance from '@/lib/nft/useSWRNftBalance';

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
    isUpdatingValues?: boolean;
}

export default function QuoteDetails({ swapValues: values, quote: quoteData, isQuoteLoading, isUpdatingValues = false }: QuoteComponentProps) {
    const { toAsset, fromAsset: fromCurrency, destination_address } = values || {};
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

    return (
        <>
            {
                (quoteData || (!quoteData && isQuoteLoading)) &&
                <Accordion type='single' collapsible className='w-full' value={isAccordionOpen ? 'quote' : ''} onValueChange={(value) => { setIsAccordionOpen(value === 'quote') }}>
                    <AccordionItem value='quote' className='bg-secondary-500 rounded-2xl'>
                        <AccordionTrigger className={clsx(
                            'p-4 w-full rounded-xl flex items-center justify-between transition-colors duration-200 hover:bg-secondary-400',
                            {
                                'bg-secondary-500': !isAccordionOpen,
                                'bg-secondary-400': isAccordionOpen,
                                'animate-pulse-brightness': isUpdatingValues && !isAccordionOpen
                            }
                        )}>
                            {
                                (isAccordionOpen) ?
                                    <p className='text-sm'>
                                        Details
                                    </p>
                                    :
                                    <DetailsButton quote={quoteData} isQuoteLoading={isQuoteLoading || isUpdatingValues} swapValues={values} destination={values.to} destinationAddress={destination_address} />
                            }
                            <ChevronDown className='h-3.5 w-3.5 text-secondary-text' />
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
                                        destinationAddress={destination_address} />
                                }
                            </ResizablePanel>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            }
        </>
    )
}


const DetailsButton: FC<QuoteComponentProps> = ({ quote: quoteData, isQuoteLoading, swapValues: values, destination, destinationAddress }) => {
    const { quote, reward } = quoteData || {}
    const { provider } = useWallet(values.from, 'withdrawal')
    const wallet = provider?.activeWallet
    const { gas } = useSWRGas(wallet?.address, values.from, values.fromAsset)
    const LsFeeAmountInUsd = quote?.total_fee_in_usd
    const gasFeeInUsd = (quote?.source_network?.token && gas) ? gas * quote?.source_network?.token?.price_in_usd : null;
    const displayGasFeeInUsd = gasFeeInUsd ? (gasFeeInUsd < 0.01 ? '<$0.01' : `$${gasFeeInUsd?.toFixed(2)}`) : null
    const displayReward = reward?.amount_in_usd ? (reward?.amount_in_usd < 0.01 ? '<$0.01' : `$${reward?.amount_in_usd?.toFixed(2)}`) : null
    const averageCompletionTime = quote?.avg_completion_time;

    const shouldCheckNFT = reward?.campaign_type === "for_nft_holders" && reward?.nft_contract_address;
    const { balance: nftBalance, isLoading, error } = useSWRNftBalance(
        destinationAddress || '',
        destination,
        reward?.nft_contract_address || ''
    );

    return (
        <div className='flex items-center space-x-4'>
            {
                displayGasFeeInUsd &&
                <div className={`${isQuoteLoading ? "animate-pulse-brightness" : ""} inline-flex items-center gap-1`}>
                    <div className='h-4 w-4'>
                        {!values.fromExchange ?
                            <GasIcon className='h-4 w-4' /> : <ExchangeGasIcon className='h-4 w-4' />
                        }
                    </div>
                    <AnimatedValue value={displayGasFeeInUsd} className='text-sm text-primary-text' />
                    <div className="ml-3 w-px h-3 bg-primary-text-placeholder rounded-2xl" />
                </div>
            }
            {
                averageCompletionTime &&
                <>
                    <div className="w-px h-3 bg-primary-text-placeholder rounded-2xl" />
                    <div className={`${isQuoteLoading ? "animate-pulse-brightness" : ""} text-right text-primary-text inline-flex items-center gap-1 text-sm`}>
                        <div className='h-4 w-4'>
                            <Clock className='h-4 w-4' />
                        </div>
                        <AverageCompletionTime avgCompletionTime={quote.avg_completion_time} />
                    </div>
                </>
            }
            {
                reward &&
                (!shouldCheckNFT || (!isLoading && !error && nftBalance !== undefined && nftBalance > 0)) &&
                <>
                    <div className="w-px h-3 bg-primary-text-placeholder rounded-2xl" />
                    <div className='text-right text-primary-text inline-flex items-center gap-1 pr-4'>
                        <Image src={rewardCup} alt="Reward" width={16} height={16} />
                        <AnimatedValue value={displayReward} className='text-sm text-primary-text' />
                    </div>
                </>

            }
        </div>
    )
}
