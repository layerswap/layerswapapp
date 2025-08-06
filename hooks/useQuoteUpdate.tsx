import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import sleep from "@/lib/wallets/utils/sleep";
import { useEffect, useState } from "react";

export function useQuoteUpdate(quoteData: Quote | undefined, requested_amount: string | undefined): { isUpdatingValues: boolean, quote: Quote | undefined } {
    const [isUpdatingValues, setIsUpdatingValues] = useState(false);
    const [newQuote, setNewQuote] = useState<Quote | undefined>(undefined)

    useEffect(() => {
        (async () => {
            if (!quoteData?.quote) return
            const requestedAmount = quoteData.quote.requested_amount
            const receiveAmount = quoteData.quote.receive_amount

            const quoteChanged =
                newQuote?.quote.requested_amount === requestedAmount &&
                newQuote?.quote.receive_amount !== receiveAmount;

            const refuelChanged =
                JSON.stringify(newQuote?.refuel) !== JSON.stringify(quoteData.refuel);

            if (quoteChanged || refuelChanged) {
                setIsUpdatingValues(true);
                await sleep(3000);
                setIsUpdatingValues(false);
            }
            setNewQuote(quoteData)
        })()
    }, [quoteData])

    const _quote = (requested_amount && newQuote?.quote.requested_amount == Number(requested_amount)) ? newQuote : quoteData

    return { isUpdatingValues, quote: _quote }
}
