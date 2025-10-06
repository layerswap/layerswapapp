import { FC, useMemo, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shadcn/accordion'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import ResizablePanel from '../../ResizablePanel'
import useWallet from '@/hooks/useWallet'
import useSWR from 'swr'
import useSWRGas from '@/lib/gases/useSWRGas'
import useSWRNftBalance from '@/lib/nft/useSWRNftBalance'
import LayerSwapApiClient, { Campaign, Quote } from '@/lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '@/Models/ApiResponse'
import { SwapFormValues } from '../../DTOs/SwapFormValues'
import { Network } from '@/Models/Network'
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper'
import { deriveQuoteComputed } from './utils'
import { SummaryRow } from './SummaryRow'
import { DetailedEstimates } from './DetailedEstimates'
import { addressFormat } from '@/lib/address/formatter'
import { useSelectedAccount } from '@/context/balanceAccounts'

interface SwapValues extends Omit<SwapFormValues, 'from' | 'to'> {
    from?: Network;
    to?: Network;
}

interface QuoteComponentProps {
    quote: Quote | undefined;
    isQuoteLoading?: boolean;
    swapValues: SwapValues;
    destination?: Network,
    destinationAddress?: string;
    sourceAddress?: string;
    onOpen?: () => void;
    isAccordionOpen?: boolean;
}

const SwapQuoteComp: FC<QuoteComponentProps> = ({ swapValues: values, quote: quoteData, isQuoteLoading }) => {
    const [isOpen, setIsOpen] = useState(false)
    const isCEX = !!values.fromExchange
    const { wallets } = useWallet(!isCEX ? values.from : undefined, 'withdrawal')

    const selectedSourceAccount = useSelectedAccount("from", values.from?.name);
    const { gasData, isGasLoading } = useSWRGas(selectedSourceAccount?.address, values.from, values.fromAsset)

    const shouldCheckNFT = quoteData?.reward?.campaign_type === "for_nft_holders" && quoteData?.reward?.nft_contract_address;

    const { balance: nftBalance, isLoading, error } = useSWRNftBalance(
        values.destination_address || '',
        values.to,
        quoteData?.reward?.nft_contract_address || ''
    )

    const apiClient = new LayerSwapApiClient()
    const { data: campaignsData } = useSWR<ApiResponse<Campaign[]>>('/campaigns', apiClient.fetcher)

    const campaign = useMemo(() => {
        if (!campaignsData?.data || !values.to) return undefined
        const now = Date.now()
        return campaignsData.data.find((c) => c?.network.name === values.to?.name && new Date(c?.end_date).getTime() - now > 0)
    }, [campaignsData?.data, values.to])

    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token, quoteData?.quote)
    const computed = useMemo(
        () => deriveQuoteComputed({
            values,
            quote: quoteData?.quote,
            reward: quoteData?.reward,
            gasData,
            gasTokenPriceInUsd,
        }),
        [values, quoteData?.quote, quoteData?.reward, gasData, gasTokenPriceInUsd]
    )

    const wallet = (values?.to && values?.destination_address) ? wallets?.find(w => addressFormat(w.address, values?.to!) === addressFormat(values?.destination_address!, values?.to!)) : undefined

    if (!quoteData) return null

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
                    className={clsx(`${isOpen ? 'px-5 pb-2' : 'px-3.5 pb-3.5'}  pr-5 w-full rounded-2xl flex items-center justify-between cursor-auto`)}
                >
                    <SummaryRow
                        isQuoteLoading={isQuoteLoading}
                        values={values}
                        wallet={wallet}
                        computed={computed}
                        shouldCheckNFT={shouldCheckNFT}
                        nftBalance={nftBalance}
                        isLoading={isLoading}
                        error={error}
                        onOpen={() => setIsOpen(true)}
                        isOpen={isOpen}
                        sourceAddress={wallet?.address}
                    />
                </AccordionTrigger>

                <AccordionContent className="rounded-2xl">
                    <ResizablePanel>
                        <DetailedEstimates
                            isQuoteLoading={isQuoteLoading}
                            swapValues={values}
                            quote={quoteData}
                            destinationAddress={values.destination_address}
                            sourceAddress={wallet?.address}
                            gasData={gasData}
                            isGasLoading={isGasLoading}
                            shouldCheckNFT={shouldCheckNFT}
                            nftBalance={nftBalance}
                            isLoading={isLoading}
                            error={error}
                            campaign={campaign}
                            wallet={wallet}
                            computed={computed}
                            variant='extended'
                        />
                    </ResizablePanel>
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