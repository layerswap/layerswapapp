import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { truncateDecimals } from "../utils/RoundDecimals"
import { NetworkRouteToken } from "@/Models/Network"
import { Tooltip, TooltipTrigger, TooltipContent } from "../shadcn/tooltip"

export const RateElement = ({
    fromAsset,
    toAsset,
    requestAmount,
    receiveAmount,
}: {
    fromAsset: NetworkRouteToken | undefined
    toAsset: NetworkRouteToken | undefined
    requestAmount: number | undefined
    receiveAmount: number | undefined
}) => {
    const [flipped, setFlipped] = useState(false)

    if (!requestAmount || !receiveAmount) {
        return null
    }

    const fromToRate = receiveAmount / requestAmount
    const toFromRate = requestAmount / receiveAmount

    const displayFromToRate = truncateDecimals(fromToRate, fromAsset?.decimals || 6)
    const displayToFromRate = truncateDecimals(toFromRate, toAsset?.decimals || 6)

    return (
        <div
            className="flex text-sm ml-1 font-small items-center cursor-pointer"
            onClick={() => setFlipped(!flipped)}
        >
            {!flipped ? (
                <>
                    <p><span>1</span> <span>{fromAsset?.symbol}</span></p>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>{displayFromToRate} {toAsset?.symbol}</span>
                        </TooltipTrigger>
                        <TooltipContent className="!bg-secondary-300 !border-secondary-300 !text-primary-text">
                            <span>{fromToRate}</span>
                        </TooltipContent>
                    </Tooltip>
                </>
            ) : (
                <>
                    <p><span>1</span> <span>{toAsset?.symbol}</span></p>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                            <span>{displayToFromRate} {fromAsset?.symbol}</span>
                        </TooltipTrigger>
                        <TooltipContent className="!bg-secondary-300 !border-secondary-300 !text-primary-text">
                            <span>{toFromRate}</span>
                        </TooltipContent>
                    </Tooltip>
                </>
            )}
        </div>
    )
}
