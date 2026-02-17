import { FC, useEffect, useMemo, useRef, useState } from "react";
import { Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { PriceImpact } from "./PriceImpact";
import { useUsdModeStore } from "@/stores/usdModeStore";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmount: FC<ReceiveAmountProps> = ({ destination_token, fee, isFeeLoading }) => {
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const receive_amount = fee?.quote.receive_amount
    const receiveAmountInUsd = useMemo(() => {
        if (!receive_amount || !destination_token || !fee.quote?.destination_token?.price_in_usd) {
            return undefined;
        }
        return (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2);
    }, [receive_amount, destination_token, fee?.quote?.destination_token?.price_in_usd]);
    const quote = fee?.quote
    const tokenDecimals = fee?.quote.destination_token?.decimals || 2

    const primaryEmpty = isUsdMode ? !receiveAmountInUsd : !receive_amount

    const containerRef = useRef<HTMLDivElement>(null);
    const priceImpactRef = useRef<HTMLSpanElement>(null);
    const numberSpanRef = useRef<HTMLSpanElement>(null);
    const [maxDecimals, setMaxDecimals] = useState(Math.min(tokenDecimals, 7));

    useEffect(() => {
        const container = containerRef.current;
        const numberSpan = numberSpanRef.current;
        if (!container || !numberSpan || !isUsdMode) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const calculate = () => {
            const containerWidth = container.clientWidth;
            const priceImpactWidth = priceImpactRef.current?.offsetWidth || 0;
            const gap = priceImpactWidth > 0 ? 8 : 0;
            const availableWidth = containerWidth - priceImpactWidth - gap;

            const style = getComputedStyle(numberSpan);
            ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

            const intPart = receive_amount ? Math.floor(receive_amount).toString() : '0';
            const suffix = ` ${destination_token?.symbol || ''}`;
            const fixedWidth = ctx.measureText(intPart + '.').width + ctx.measureText(suffix).width;

            if (fixedWidth >= availableWidth) {
                setMaxDecimals(0);
                return;
            }

            const digitWidth = ctx.measureText('0').width;
            const fittingDigits = Math.floor((availableWidth - fixedWidth) / digitWidth);
            setMaxDecimals(Math.max(0, Math.min(fittingDigits, tokenDecimals)));
        };

        calculate();

        const observer = new ResizeObserver(calculate);
        observer.observe(container);

        return () => observer.disconnect();
    }, [isUsdMode, receive_amount, destination_token?.symbol, tokenDecimals]);

    useEffect(() => {
        if (!isUsdMode) setMaxDecimals(Math.min(tokenDecimals, 7));
    }, [isUsdMode, tokenDecimals]);

    return (
        <div className="flex-col w-full flex min-w-0 font-normal border-0 text-[28px] leading-7 text-primary-text relative truncate">
            <div className="w-full flex items-center justify-start relative">
                <div className={clsx(
                    "w-full flex items-center py-[3px] pr-3",
                    { "animate-pulse-stronger": isFeeLoading },
                    { "text-secondary-text": primaryEmpty }
                )}>
                    {isUsdMode ? <>
                        <NumberFlow prefix="$" value={Number(receiveAmountInUsd) || 0} trend={0} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                    </> : (
                        <NumberFlow value={receive_amount || 0} trend={0} format={{ maximumFractionDigits: tokenDecimals }} />
                    )}
                </div>
            </div>
            <div ref={containerRef} className="flex items-baseline space-x-2">
                <span ref={numberSpanRef} className="text-base leading-5 font-medium text-secondary-text h-5 min-w-0">
                    {isUsdMode ? <>
                        <NumberFlow className="p-0" suffix={` ${destination_token?.symbol || ''}`} value={receive_amount || 0} trend={0} format={{ maximumFractionDigits: maxDecimals }} />
                    </> : (
                        <NumberFlow className="p-0" value={receiveAmountInUsd || 0} prefix="$" format={{ maximumFractionDigits: receiveAmountInUsd ? 2 : 0 }} trend={0} />
                    )}
                </span>
                <span ref={priceImpactRef} className="shrink-0">
                    <PriceImpact className="h-5 text-base leading-5" quote={quote} refuel={fee?.refuel} />
                </span>
            </div>
        </div>
    )
}
