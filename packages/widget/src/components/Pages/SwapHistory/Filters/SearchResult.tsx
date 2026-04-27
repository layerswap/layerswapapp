import { FC } from 'react'
import { RefreshCw } from 'lucide-react'
import HistorySummary from '../HistorySummary'
import SwapDetails from '../SwapDetailsComponent'
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/shadcn'
import { Wallet } from '@/types'

type SearchResultProps = {
    isLoading: boolean
    swap: SwapResponse | null
    wallets: Wallet[]
}

const SearchResult: FC<SearchResultProps> = ({ isLoading, swap, wallets }) => {
    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center py-16 text-secondary-text">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                <span>Searching by transaction hash…</span>
            </div>
        )
    }

    if (!swap) {
        return (
            <div className="w-full flex flex-col items-center justify-center py-16 text-center">
                <p className="text-secondary-text text-base">No swap found for this transaction hash</p>
            </div>
        )
    }

    const swapId = String(swap.swap?.id ?? 'search-result')

    return (
        <div className="mt-2">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={swapId} className="border-none bg-secondary-500 rounded-3xl">
                    <AccordionTrigger className="mb-3 last:mb-0 rounded-3xl">
                        <div className="cursor-pointer">
                            <HistorySummary swapResponse={swap} wallets={wallets} />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="-mt-3">
                        <div className="px-4 pb-2">
                            <SwapDetails swapResponse={swap} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}

export default SearchResult
