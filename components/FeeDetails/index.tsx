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
                                    <DetailsButton quote={quoteData} isQuoteLoading={isQuoteLoading} swapValues={values} />
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


const DetailsButton: FC<QuoteComponentProps> = ({ quote: quoteData, isQuoteLoading, swapValues: values }) => {
    const { quote, reward } = quoteData || {}
    const { provider } = useWallet(values.from, 'withdrawal')
    const wallet = provider?.activeWallet
    const { gas } = useSWRGas(wallet?.address, values.from, values.fromAsset)
    const LsFeeAmountInUsd = quote?.total_fee_in_usd
    const gasFeeAmountInUsd = (quote?.source_network?.token) ? (gas || 0) * quote.source_network?.token?.price_in_usd : null;
    const feeAmountInUsd = values.fromExchange ? ((LsFeeAmountInUsd || 0) + (gasFeeAmountInUsd || 0)) : (LsFeeAmountInUsd || 0)
    const displayFeeInUsd = feeAmountInUsd ? (feeAmountInUsd < 0.01 ? '<$0.01' : `$${feeAmountInUsd?.toFixed(2)}`) : null
    const displayReward = reward?.amount_in_usd ? (reward?.amount_in_usd < 0.01 ? '<$0.01' : `$${reward?.amount_in_usd?.toFixed(2)}`) : null
    const averageCompletionTime = quote?.avg_completion_time;

    if (isQuoteLoading) {
        return (
            <div className='h-[20px] w-30 inline-flex bg-gray-500 rounded-xs animate-pulse' />
        )
    }

    return (
        <div className='flex items-center  space-x-4'>
            {
                displayFeeInUsd &&
                <div className='inline-flex items-center gap-1'>
                    <div className='h-4 w-4'>
                        {!values.fromExchange ?
                            <GasIcon className='h-4 w-4' /> : <ExchangeGasIcon className='h-4 w-4' />
                        }
                    </div>
                    <AnimatedValue value={displayFeeInUsd} className='text-sm text-primary-text' />
                </div>
            }
            {displayFeeInUsd && averageCompletionTime && (
                <div className="w-px h-3 bg-primary-text-placeholder rounded-2xl" />
            )}
            {
                averageCompletionTime &&
                <div className="text-right text-primary-text inline-flex items-center gap-1 text-sm">
                    <div className='h-4 w-4'>
                        <Clock className='h-4 w-4' />
                    </div>
                    <AverageCompletionTime avgCompletionTime={quote.avg_completion_time} />
                </div>
            }
            {(averageCompletionTime && reward) && (
                <div className="w-px h-3 bg-primary-text-placeholder rounded-2xl" />
            )}
            {
                reward &&
                <div className='text-right text-primary-text inline-flex items-center gap-1 text-sm'>
                    <Image src={rewardCup} alt="Reward" width={16} height={16} />
                    <AnimatedValue value={displayReward} className='text-sm text-primary-text' />
                </div>
            }
        </div>
    )
}
