import { SwapFormValues } from '../DTOs/SwapFormValues';
import { DetailedEstimates } from './DetailedEstimates';
import { useQuote } from '../../context/feeContext';
import FeeDetails from './FeeDetailsComponent';
import ResizablePanel from '../ResizablePanel';
import { FC, useState } from 'react';
import DepositMethod from './DepositMethod';
import Campaign from './Campaign';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../shadcn/accordion';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Quote } from '@/lib/apiClients/layerSwapApiClient';
import AverageCompletionTime from '../Common/AverageCompletionTime';
import useSWRGas from "@/lib/gases/useSWRGas";
import useWallet from "@/hooks/useWallet";
import { useFormikContext } from 'formik';
import GasIcon from '../icons/GasIcon';
import Clock from '../icons/Clock';

export default function QuoteDetails({ values }: { values: SwapFormValues }) {
    const { toAsset: toCurrency, to, toExchange, from, fromAsset: fromCurrency, amount, destination_address } = values || {};
    const { quote, isQuoteLoading } = useQuote()
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

    return (
        <>
            {
                from && to && toCurrency && fromCurrency &&
                <DepositMethod />
            }
            {
                (quote || (!quote && isQuoteLoading)) &&
                <Accordion type='single' collapsible className='w-full' value={isAccordionOpen ? 'quote' : ''} onValueChange={(value) => { setIsAccordionOpen(value === 'quote') }}>
                    <AccordionItem value='quote' className='bg-secondary-500 rounded-2xl'>
                        <AccordionTrigger className={clsx(
                            'p-4 w-full rounded-xl flex items-center justify-between transition-colors duration-200 hover:bg-secondary-400',
                            {
                                'bg-secondary-500': !isAccordionOpen,
                                'bg-secondary-400': isAccordionOpen,
                            }
                        )}>
                            {
                                (isAccordionOpen) ?
                                    <p>
                                        Details
                                    </p>
                                    :
                                    <DetailsButton quote={quote} isQuoteLoading={isQuoteLoading} />
                            }
                            <ChevronDown className='h-3.5 w-3.5 text-secondary-text' />
                        </AccordionTrigger>
                        <AccordionContent className='rounded-2xl'>
                            <div>
                                <ResizablePanel>
                                    <FeeDetails>
                                        {
                                            (quote || isQuoteLoading) && fromCurrency && toCurrency &&
                                            <FeeDetails.Item>
                                                <DetailedEstimates quote={quote?.quote} isQuoteLoading={isQuoteLoading} />
                                            </FeeDetails.Item>
                                        }
                                        {
                                            values.to &&
                                            values.toAsset &&
                                            destination_address &&
                                            <Campaign
                                                destination={values.to}
                                                reward={quote?.reward}
                                                destinationAddress={destination_address}
                                            />
                                        }

                                    </FeeDetails>
                                </ResizablePanel>

                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            }
        </>
    )
}


const DetailsButton: FC<{ quote?: Quote, isQuoteLoading: boolean }> = ({ quote: quoteData, isQuoteLoading }) => {
    const { values } = useFormikContext<SwapFormValues>();
    const { provider } = useWallet(values.from, 'withdrawal')
    const wallet = provider?.activeWallet
    const { gas } = useSWRGas(wallet?.address, values.from, values.fromAsset)
    const LsFeeAmountInUsd = quoteData?.quote.total_fee_in_usd
    const gasFeeAmountInUsd = (quoteData?.quote.source_network?.token && gas) ? gas * quoteData?.quote.source_network?.token?.price_in_usd : null;
    const feeAmountInUsd = (LsFeeAmountInUsd || 0) + (gasFeeAmountInUsd || 0)
    const displayFeeInUsd = feeAmountInUsd ? (feeAmountInUsd < 0.01 ? '<$0.01' : `$${feeAmountInUsd?.toFixed(2)}`) : null
    const averageCompletionTime = quoteData?.quote.avg_completion_time;

    if (isQuoteLoading) {
        return (
            <div className='h-[24px] w-30 inline-flex bg-gray-500 rounded-xs animate-pulse' />
        )
    }

    return (
        <div className='divide-x divide-primary-text-placeholder flex items-center  space-x-4'>
            {
                displayFeeInUsd &&
                <div className='inline-flex items-center gap-1 pr-4'>
                    <GasIcon />
                    <p>
                        {displayFeeInUsd}
                    </p>
                </div>
            }
            {
                averageCompletionTime &&
                <div className="text-right text-primary-text inline-flex items-center gap-1 pr-4">
                    <Clock />
                    <AverageCompletionTime avgCompletionTime={quoteData.quote.avg_completion_time} />
                </div>
            }
        </div>
    )
}