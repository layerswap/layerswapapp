import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { truncateDecimals } from "../utils/RoundDecimals"
import { NetworkRouteToken } from "@/Models/Network"

export const RateElement = ({
    fromAsset,
    toAsset,
    requestAmount,
    receiveAmount,
    totalFeeInUsd
}: {
    fromAsset: NetworkRouteToken
    toAsset: NetworkRouteToken
    requestAmount: number
    receiveAmount: number
    totalFeeInUsd: number
}) => {
    const [flipped, setFlipped] = useState(false)

    if (toAsset.price_in_usd === 0) {
        return null
    }

    const totalFee = totalFeeInUsd ? totalFeeInUsd / toAsset.price_in_usd : 0

    const fromRate = (receiveAmount + totalFee) / requestAmount
    const toRate = requestAmount / (receiveAmount + totalFee)

    const fromRateTruncated = truncateDecimals(fromRate, fromAsset?.precision || 6)

    const dynamicToRatePrecision = getPrecisionWhereValueBelowCent(
        toRate,
        toAsset.price_in_usd
    );

    const toRateTruncated = truncateDecimals(
        toRate,
        Math.max(dynamicToRatePrecision, toAsset?.precision || 6)
    );

    return (
        <div
            className="flex text-sm ml-1 font-small items-center cursor-pointer"
            onClick={() => setFlipped(!flipped)}
        >
            {!flipped ? (
                <>
                    <p><span>1</span> <span>{fromAsset?.symbol}</span></p>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <span>{fromRateTruncated} {toAsset?.symbol}</span>
                </>
            ) : (
                <>
                    <p><span>1</span> <span>{toAsset?.symbol}</span></p>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <span>{toRateTruncated} {fromAsset?.symbol}</span>
                </>
            )}
        </div>
    )
}

const getPrecisionWhereValueBelowCent = (rate: number, priceInUsd: number) => {
    if (!priceInUsd) return 6; 

    for (let decimals = 1; decimals <= 18; decimals++) {
        const truncated = Number(rate.toFixed(decimals));
        const usdValue = truncated * priceInUsd;

        if (usdValue < 0.01) {
            return decimals;
        }
    }

    return 18; 
};