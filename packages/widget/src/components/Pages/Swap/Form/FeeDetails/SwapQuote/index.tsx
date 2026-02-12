import { FC, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/shadcn/accordion'
import { ChevronDown } from 'lucide-react'
import useWallet from '@/hooks/useWallet'
import { Quote } from '@/lib/apiClients/layerSwapApiClient'
import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import { Network } from '@/Models/Network'
import { SummaryRow } from './SummaryRow'
import { DetailedEstimates } from './DetailedEstimates'
import { Address } from '@/lib/address/Address'
import { useSelectedAccount } from '@/context/swapAccounts'
import { Partner } from '@/Models/Partner'

interface SwapValues extends Omit<SwapFormValues, 'from' | 'to'> {
    from?: Network;
    to?: Network;
}

interface QuoteComponentProps {
    quote: Quote;
    isQuoteLoading?: boolean;
    swapValues: SwapValues;
    destination?: Network,
    destinationAddress?: string;
    sourceAddress?: string;
    onOpen?: () => void;
    isAccordionOpen?: boolean;
    partner?: Partner;
}

const SwapQuoteComp: FC<QuoteComponentProps> = ({ swapValues: values, quote: quoteData, isQuoteLoading, partner }) => {
    const [isOpen, setIsOpen] = useState(false)
    const { wallets: destWallets } = useWallet(values.to, 'autofill')
    const wallet = (values?.to && values?.destination_address) ? destWallets?.find(w => w.addresses?.some(a => Address.equals(a, values.destination_address!, values.to!))) : undefined
    const selectedSourceAccount = useSelectedAccount("from", values?.from?.name);

    return (
        <Accordion
            type="single"
            collapsible
            className="w-full"
            value={isOpen ? 'quote' : ''}
            onValueChange={(v) => setIsOpen(v === 'quote')}
        >
            <AccordionItem value="quote" className="bg-secondary-500 rounded-2xl">
                <AccordionTrigger
                    onClick={(e) => e.preventDefault()}
                    className="w-full rounded-2xl flex items-center justify-between cursor-auto"
                >
                    <SummaryRow
                        isQuoteLoading={isQuoteLoading}
                        values={values}
                        wallet={wallet}
                        quoteData={quoteData}
                        onOpen={() => setIsOpen(true)}
                        isOpen={isOpen}
                        sourceAddress={selectedSourceAccount?.address}
                        partner={partner}
                    />
                </AccordionTrigger>

                <AccordionContent className="rounded-2xl">
                    <DetailedEstimates
                        swapValues={values}
                        quote={quoteData?.quote}
                        reward={quoteData?.reward}
                        variant='base'
                    />
                </AccordionContent>

                {isOpen && (
                    <div className="px-3.5 pb-3">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="mx-auto flex items-center justify-center gap-1 text-sm text-secondary-text hover:text-primary-text"
                        >
                            <span>Close details</span>
                            <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform" />
                        </button>
                    </div>
                )}
            </AccordionItem>
        </Accordion>
    )
}

export default SwapQuoteComp