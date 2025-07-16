import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import sleep from "@/lib/wallets/utils/sleep";
import { useEffect, useState } from "react";

export function useQuoteUpdate(quoteData: Quote | undefined, requested_amount: number | undefined): { isUpdatingValues: boolean, quote: Quote | undefined } {
    const [isUpdatingValues, setIsUpdatingValues] = useState(false);
    const [newQuote, setNewQuote] = useState<Quote | undefined>(undefined)

    useEffect(() => {
        (async () => {
            if (!quoteData) return
            const requestedAmount = quoteData.quote.requested_amount
            const receiveAmount = quoteData.quote.receive_amount
            if (newQuote?.quote.requested_amount == requestedAmount && newQuote?.quote.receive_amount !== receiveAmount) {
                setIsUpdatingValues(true);
                await sleep(3000);
                setIsUpdatingValues(false);
                setNewQuote(quoteData)
            }
            else {
                setNewQuote(quoteData)
            }
        })()
    }, [quoteData])


    const _quote = (requested_amount && newQuote?.quote.requested_amount == requested_amount) ? newQuote : quoteData

    return { isUpdatingValues, quote: _quote }
}
