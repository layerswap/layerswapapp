import AlertIcon from "@/components/Icons/AlertIcon";
import { useAsyncModal } from "@/context/asyncModal";
import { getLimits } from "@/hooks/useFee";
import { FC } from "react";
import { SwapFormValues } from "../Form/SwapFormValues";

interface QuoteUpdatedProps {
    isBelowMin?: boolean;
    minAllowedAmount: number | undefined;
    maxAllowedAmount: number | undefined;
    network: string | undefined;
    token: string | undefined;
}

export const QuoteUpdated: FC<QuoteUpdatedProps> = (props) => {

    return (
        <div>
            <div className="p-3 bg-secondary-500 rounded-lg mb-3 w-fit mx-auto">
                <AlertIcon className="h-11 w-11" />
            </div>

            {/* Header */}
            <h2 className="text-primary-text text-xl font-medium text-center mb-3">
                <span>{props.isBelowMin ? "Minimum" : "Maximum"}</span>{" "}
                <span>Amount Adjusted</span>
            </h2>

            {/* Description */}
            <p className="text-center text-secondary-text text-base mb-6">

                <span>The </span>
                <span>{props.isBelowMin ? "minimum" : "maximum"}</span>
                <span> amount you can send using </span>
                <span>{props.network}</span>
                <span> is </span>
                <span>{props.isBelowMin ? props?.minAllowedAmount : props?.maxAllowedAmount}</span>
                <span> {props.token}. We’ll adjust your transfer to this limit to proceed.</span>
            </p>
        </div>
    );
};

/**
 * Unified handler to fetch limits, detect quote/limit changes, confirm with user, and adjust amount.
 */
export async function handleLimitsUpdate(params: {
    swapValues: SwapFormValues;
    network?: { display_name: string };
    token?: { symbol: string };
    getConfirmation: ReturnType<typeof useAsyncModal>['getConfirmation'];
}): Promise<void> {
    const { swapValues, network, token } = params;

    const { minAllowedAmount, maxAllowedAmount } = await getLimits({
        sourceNetwork: swapValues.from?.name,
        sourceToken: swapValues.fromAsset?.symbol,
        destinationNetwork: swapValues.to?.name,
        destinationToken: swapValues.toAsset?.symbol,
        useDepositAddress: swapValues.depositMethod == 'deposit_address',
        refuel: params.swapValues.refuel
    });

    const requestedAmount = parseFloat(swapValues.amount || "0");

    const belowMin =
        minAllowedAmount !== undefined && requestedAmount < minAllowedAmount;
    const aboveMax =
        maxAllowedAmount !== undefined && requestedAmount > maxAllowedAmount;
    const needsLimitConfirm = belowMin || aboveMax;

    if (!needsLimitConfirm) {
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
                minAllowedAmount={minAllowedAmount}
                maxAllowedAmount={maxAllowedAmount}
                isBelowMin={belowMin}
                network={network?.display_name}
                token={token?.symbol}
            />
        ),
        submitText: "Continue",
        dismissText: "Cancel",
    });

    if (!confirmed) {
        throw new Error("User cancelled the operation.");
    }

    if (needsLimitConfirm) {
        swapValues.amount = newAmount.toString();
    }
}
