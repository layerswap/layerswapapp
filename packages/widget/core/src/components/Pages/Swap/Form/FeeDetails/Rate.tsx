import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { truncateDecimals } from "@/components/utils/RoundDecimals"
import { NetworkRouteToken } from "@layerswap/widget-types";

export const RateElement = ({
    fromAsset,
    toAsset,
    rate
}: {
    fromAsset: NetworkRouteToken
    toAsset: NetworkRouteToken
    rate: number
}) => {
    const [flipped, setFlipped] = useState(false)

    const flippedRate = 1 / rate
    const rateTruncated = truncateDecimals(rate, toAsset?.precision || 6)
    const flippedRateTruncated = truncateDecimals(flippedRate, fromAsset?.precision || 6)

    return (
        <div
            className="flex text-sm ml-1 font-small items-center cursor-pointer"
            onClick={() => setFlipped(!flipped)}
        >
            {!flipped ? (
                <>
                    <p><span>1</span> <span>{fromAsset?.asset}</span></p>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <span>{rateTruncated} {toAsset?.asset}</span>
                </>
            ) : (
                <>
                    <p><span>1</span> <span>{toAsset?.asset}</span></p>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <span>{flippedRateTruncated} {fromAsset?.asset}</span>
                </>
            )}
        </div>
    )
}
