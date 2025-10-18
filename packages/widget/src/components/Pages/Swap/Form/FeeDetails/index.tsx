import ResizablePanel from '@/components/Common/ResizablePanel';
import { FC, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/shadcn/accordion';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { Quote } from '@/lib/apiClients/layerSwapApiClient';
import AverageCompletionTime from '@/components/Common/AverageCompletionTime';
import useSWRGas from "@/lib/gases/useSWRGas";
import useWallet from "@/hooks/useWallet";
import GasIcon from '@/components/Icons/GasIcon';
import Clock from '@/components/Icons/Clock';
import { Network } from '@/Models/Network';
import ExchangeGasIcon from '@/components/Icons/ExchangeGasIcon';
import useSWRNftBalance from '@/lib/nft/useSWRNftBalance';
import NumberFlow from '@number-flow/react';
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper';
import { useSelectedAccount } from '@/context/balanceAccounts';
import { SwapFormValues } from '../SwapFormValues';
import { CupIcon } from '@/components/Icons/CupIcon';
import { DetailedEstimates } from './SwapQuote/DetailedEstimates';

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
}

export default function QuoteDetails({ swapValues: values, quote: quoteData, isQuoteLoading }: QuoteComponentProps) {
    const { toAsset, fromAsset: fromCurrency, destination_address } = values || {};
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

    return (
        <>
            {
                quoteData &&
                <Accordion type='single' collapsible className='w-full' value={isAccordionOpen ? 'quote' : ''} onValueChange={(value) => { setIsAccordionOpen(value === 'quote') }}>
                    <AccordionItem value='quote' className='bg-secondary-500 rounded-2xl'>
                        <AccordionTrigger className={clsx(
                            'p-3.5 pr-5 w-full rounded-2xl flex items-center justify-between transition-colors duration-200 hover:bg-secondary-400',
                            {
                                'bg-secondary-500': !isAccordionOpen,
                                'bg-secondary-400': isAccordionOpen,
                                'animate-pulse-strong': isQuoteLoading && !isAccordionOpen
                            }
                        )}>
                            {
                                (isAccordionOpen) ?
                                    <p className='text-sm'>
                                        Details
                                    </p>
                                    :
                                    <DetailsButton quote={quoteData} isQuoteLoading={isQuoteLoading} swapValues={values} destination={values.to} destinationAddress={destination_address} />
                            }
                            <ChevronDown className='h-3.5 w-3.5 text-secondary-text' />
                        </AccordionTrigger>
                        <AccordionContent className='rounded-2xl'>
                            <ResizablePanel>
                                {
                                    (quoteData || isQuoteLoading) && fromCurrency && toAsset &&
                                    <DetailedEstimates
                                        swapValues={values}
                                        quote={quoteData}
                                    />
                                }
                            </ResizablePanel>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            }
        </>
    )
}


export const DetailsButton: FC<QuoteComponentProps> = ({ quote: quoteData, isQuoteLoading, swapValues: values, destination, destinationAddress }) => {
    const { quote, reward } = quoteData || {}
    const isCEX = !!values.fromExchange;
    const sourceAccountNetwork = !isCEX ? values.from : undefined
    const selectedSourceAccount = useSelectedAccount("from", sourceAccountNetwork?.name);
    const { wallets } = useWallet(quoteData?.quote?.source_network, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const { gasData: gasData } = useSWRGas(selectedSourceAccount?.address, values.from, values.fromAsset, values.amount, wallet)
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token, quote)
    const gasFeeInUsd = (gasData && gasTokenPriceInUsd) ? gasData.gas * gasTokenPriceInUsd : null;
    const averageCompletionTime = quote?.avg_completion_time;

    const shouldCheckNFT = reward?.campaign_type === "for_nft_holders" && !!reward?.nft_contract_address;
    const { balance: nftBalance, isLoading, error } = useSWRNftBalance(
        destinationAddress || '',
        destination,
        reward?.nft_contract_address || ''
    );

    return (
        <div className='flex items-center gap-1 space-x-3'>
            {
                gasFeeInUsd &&
                <>
                    <div className={clsx(
                        "inline-flex items-center gap-1",
                        { "animate-pulse-strong": isQuoteLoading }
                    )}>
                        <div className='p-0.5'>
                            {!values.fromExchange ?
                                <GasIcon className='h-4 w-4 text-secondary-text' /> : <ExchangeGasIcon className='h-5 w-5 text-secondary-text' />
                            }
                        </div>
                        <NumberFlow className="text-primary-text text-sm leading-6" value={gasFeeInUsd < 0.01 ? '0.01' : gasFeeInUsd} format={{ style: 'currency', currency: 'USD' }} prefix={gasFeeInUsd < 0.01 ? '<' : undefined} />

                    </div>
                    <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                </>
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
                        <AverageCompletionTime className="text-primary-text" avgCompletionTime={quote.avg_completion_time} />
                    </div>
                </>
            }
            {
                reward &&
                (!shouldCheckNFT || (!isLoading && !error && nftBalance !== undefined && nftBalance > 0)) &&
                <>
                    <div className="w-px h-3 bg-primary-text-tertiary rounded-2xl" />
                    <div className='text-right text-primary-text inline-flex items-center gap-1'>
                        <CupIcon alt="Reward" width={16} height={16} />
                        <NumberFlow value={reward?.amount_in_usd < 0.01 ? '0.01' : reward?.amount_in_usd} format={{ style: 'currency', currency: 'USD' }} prefix={reward?.amount_in_usd < 0.01 ? '<' : undefined} />
                    </div>
                </>
            }
        </div>
    )
}
