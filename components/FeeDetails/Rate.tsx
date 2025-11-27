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
    fromAsset: NetworkRouteToken | undefined
    toAsset: NetworkRouteToken | undefined
    requestAmount: number | undefined
    receiveAmount: number | undefined
    totalFeeInUsd: number | undefined
}) => {
    const [flipped, setFlipped] = useState(false)

    if (!requestAmount || !receiveAmount) {
        return null
    }

    const totalFee = totalFeeInUsd ? totalFeeInUsd / (toAsset?.price_in_usd || 1) : 0

    const fromRate = (receiveAmount + totalFee) / requestAmount
    const toRate = requestAmount / (receiveAmount + totalFee)

    const fromRateTruncated = truncateDecimals(fromRate, fromAsset?.precision || 6)
    const toRateTruncated = truncateDecimals(toRate, toAsset?.precision || 6)

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
