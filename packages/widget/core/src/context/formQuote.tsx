import { createContext, useContext, useEffect } from "react";
import { SwapQuote } from "@/lib/apiClients/layerSwapApiClient";

type ReportFormQuote = (quote: SwapQuote | undefined) => void;

/**
 * Lets a swap form hand its live quote up to `FormWrapper`, whose Formik
 * `onSubmit` runs the pre-submit confirmations (address checks, slow route)
 * and otherwise has no access to the quote the form is rendering.
 */
const FormQuoteReportContext = createContext<ReportFormQuote | null>(null);

export const FormQuoteReportProvider = FormQuoteReportContext.Provider;

/** Call from the form that owns `useQuoteData`; re-reports whenever the quote changes. */
export function useReportFormQuote(quote: SwapQuote | undefined) {
    const report = useContext(FormQuoteReportContext);
    useEffect(() => {
        report?.(quote);
        return () => report?.(undefined);
    }, [quote, report]);
}
