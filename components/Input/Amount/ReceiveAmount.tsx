import { FC } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { PriceImpact } from "./PriceImpact";
import { useAmountModeStore } from "@/stores/amountModeStore";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote.receive_amount
    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined
    const quote = fee?.quote
    const { inputMode } = useAmountModeStore();
    const isUsdMode = inputMode === "usd";

    const primaryValue = isUsdMode ? Number(receiveAmountInUsd || 0) : (receive_amount || 0);
    const primaryPrefix = isUsdMode ? "$\u00A0" : undefined;
    const primaryMaxFractionDigits = isUsdMode ? 2 : (fee?.quote.destination_token?.decimals || 2);

    const secondaryValue = isUsdMode ? (receive_amount || 0) : Number(receiveAmountInUsd || 0);
    const secondaryPrefix = isUsdMode ? undefined : "$";
    const secondaryMaxFractionDigits = isUsdMode ? (fee?.quote.destination_token?.decimals || 2) : (receiveAmountInUsd ? 2 : 0);
    const secondarySuffix = isUsdMode ? ` ${destination_token?.symbol || ''}` : undefined;

    return (<>
        <div className="flex-col w-full flex min-w-0 font-normal border-0 text-[28px] leading-7 text-primary-text relative truncate">
            <div className="w-full flex items-center justify-start relative">
                <div className={clsx(
                    "w-full flex items-center py-[3px] pr-3",
                    { "animate-pulse-stronger": isFeeLoading },
                    { "text-secondary-text": !receive_amount }
                )}>
                    <NumberFlow value={primaryValue} trend={0} prefix={primaryPrefix} format={{ maximumFractionDigits: primaryMaxFractionDigits }} />
                </div>
            </div>
            <div className="flex items-baseline space-x-2">
                <span className="text-base leading-5 font-medium text-secondary-text h-5">
                    <NumberFlow className="p-0" value={secondaryValue} prefix={secondaryPrefix} suffix={secondarySuffix} format={{ maximumFractionDigits: secondaryMaxFractionDigits }} trend={0} />
                </span>
                <PriceImpact className="h-5 text-base leading-5" quote={quote} refuel={fee?.refuel} />
            </div>
        </div>
    </>)
}