import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { LoadingBar } from "./DetailedEstimates"

export const RateElement = ({
    fromAsset,
    toAsset,
    requestAmount,
    receiveAmount,
}: {
    fromAsset:  string | undefined
    toAsset: string | undefined
    requestAmount: number | undefined
    receiveAmount: number | undefined
}) => {
    const [flipped, setFlipped] = useState(false)

    if (!requestAmount || !receiveAmount) {
        return null
    }

    const fromToRate = (receiveAmount / requestAmount).toFixed(6)
    const toFromRate = (requestAmount / receiveAmount).toFixed(6)

    return (
        <div
            className="flex text-sm ml-1 font-small items-center cursor-pointer"
            onClick={() => setFlipped(!flipped)}
        >
            {!flipped ? (
                <>
                    <span>1</span> {fromAsset}
                    <ArrowRight className="w-3 h-3 mx-1" />
                    {fromToRate} {toAsset}
                </>
            ) : (
                <>
                    <span>1</span> {toAsset}
                    <ArrowRight className="w-3 h-3 mx-1" />
                    {toFromRate} {fromAsset}
                </>
            )}
        </div>
    )
}
