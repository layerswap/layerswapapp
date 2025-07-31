import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import AlertIcon from "@/components/icons/AlertIcon";
import { useAsyncModal } from "@/context/asyncModal";
import { getLimits } from "@/hooks/useFee";
import { Quote, SwapQuote } from "@/lib/apiClients/layerSwapApiClient";
import { FC } from "react";

interface CommonProps {
    /** When true, show the Min/Max adjusted UI; when false or absent, show the quote details if available */
    isBelowMin?: boolean;
}

interface QuoteModeProps extends CommonProps {
    quote: SwapQuote;
    /** optional limits can accompany quote, but no network or token key */
    minAllowedAmount?: number;
    maxAllowedAmount?: number;
    network?: string | undefined;
    token?: string | undefined;
}

interface AmountAdjustedModeProps extends CommonProps {
    quote?: never;
    minAllowedAmount: number;
    maxAllowedAmount: number;
    network: string | undefined;
    token: string | undefined;
}

type QuoteUpdatedProps = QuoteModeProps | AmountAdjustedModeProps;

export const QuoteUpdated: FC<QuoteUpdatedProps> = (props) => {
    const isQuoteMode = Boolean((props as QuoteModeProps).quote);

    return (
        <div>
            <div className="p-3 bg-secondary-500 rounded-lg mb-3 w-fit mx-auto">
                <AlertIcon className="h-11 w-11" />
            </div>

            {/* Header */}
            <h2 className="text-primary-text text-xl font-medium text-center mb-3">
                {isQuoteMode ? (
                    "Quote updated"
                ) : (
                    <>
                        <span>{props.isBelowMin ? "Minimum" : "Maximum"}</span>{" "}
                        <span>Amount Adjusted</span>
                    </>
                )}
            </h2>

            {/* Description */}
            <p className="text-center text-secondary-text text-base mb-6">
                {isQuoteMode ? (
                    "Some details were changed from the last time you viewed, please confirm the new quote to continue"
                ) : (
                    <>
                        <span>The </span>
                        <span>{props.isBelowMin ? "minimum" : "maximum"}</span>
                        <span> amount you can send using </span>
                        <span>{props.network}</span>
                        <span> is </span>
                        <span>{props.isBelowMin ? props.minAllowedAmount : props.maxAllowedAmount}</span>
                        <span> {props.token}. We’ll adjust your transfer to this limit to proceed.</span>
                    </>
                )}
            </p>

            {/* Details for quote mode */}
            {isQuoteMode && (
                <div className="flex flex-col gap-3">
                    <div className="p-3 rounded-xl bg-secondary-600 w-full flex items-center justify-between">
                        <p className="text-secondary-text">Gas Fee</p>
                        <p>${(props as QuoteModeProps).quote.total_fee_in_usd.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary-600 w-full flex items-center justify-between">
                        <p className="text-secondary-text">You will receive</p>
                        <p>
                            <span>{(props as QuoteModeProps).quote.receive_amount}</span>{" "}
                            <span>{(props as QuoteModeProps).quote.source_token?.symbol}</span>
                        </p>
                    </div>
                    {(props as QuoteModeProps).minAllowedAmount !== undefined && (
                        <div className="p-3 rounded-xl bg-secondary-600 w-full flex items-center justify-between">
                            <p className="text-secondary-text">Minimum Allowed</p>
                            <p>{(props as QuoteModeProps).minAllowedAmount}</p>
                        </div>
                    )}
                    {(props as QuoteModeProps).maxAllowedAmount !== undefined && (
                        <div className="p-3 rounded-xl bg-secondary-600 w-full flex items-center justify-between">
                            <p className="text-secondary-text">Maximum Allowed</p>
                            <p>{(props as QuoteModeProps).maxAllowedAmount}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Unified handler to fetch limits, detect quote/limit changes, confirm with user, and adjust amount.
 */
export async function handleQuoteAndLimits(params: {
    swapValues: SwapFormValues;
    formDataQuote?: SwapQuote;
    confirmedQuote?: SwapQuote;
    network?: { display_name: string };
    token?: { symbol: string };
    getConfirmation: ReturnType<typeof useAsyncModal>['getConfirmation'];
}): Promise<void> {
    const { minAllowedAmount, maxAllowedAmount } = await getLimits({
        sourceNetwork: params.swapValues.from?.name,
        sourceToken: params.swapValues.fromAsset?.symbol,
        destinationNetwork: params.swapValues.to?.name,
        destinationToken: params.swapValues.toAsset?.symbol,
        depositMethod: params.swapValues.depositMethod,
        refuel: params.swapValues.refuel
    });

    const requestedAmount = parseFloat(params.swapValues.amount || "0");

    const needsQuoteConfirm =
        params.confirmedQuote?.receive_amount !== params.formDataQuote?.receive_amount;

    const belowMin =
        minAllowedAmount !== undefined && requestedAmount < minAllowedAmount;
    const aboveMax =
        maxAllowedAmount !== undefined && requestedAmount > maxAllowedAmount;
    const needsLimitConfirm = belowMin || aboveMax;

    if (!needsQuoteConfirm && !needsLimitConfirm) {
        return;
    }

    const newAmount = needsLimitConfirm
        ? belowMin
            ? minAllowedAmount!
            : maxAllowedAmount!
        : requestedAmount;

    const confirmed = await params.getConfirmation({
        content: (
            <QuoteUpdated
                quote={params.formDataQuote!}
                minAllowedAmount={needsLimitConfirm ? minAllowedAmount : undefined}
                maxAllowedAmount={needsLimitConfirm ? maxAllowedAmount : undefined}
                isBelowMin={belowMin}
                network={params.network?.display_name}
                token={params.token?.symbol}
            />
        ),
        submitText: "Continue",
        dismissText: "Cancel",
    });

    if (!confirmed) {
        throw new Error(needsQuoteConfirm ? "Quote not confirmed" : "Transfer cancelled");
    }

    if (needsLimitConfirm) {
        params.swapValues.amount = newAmount.toString();
    }
}
