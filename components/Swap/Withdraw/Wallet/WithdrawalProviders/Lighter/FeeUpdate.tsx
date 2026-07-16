type LighterFeeUpdateProps = {
    previousFee: number
    fee: string
    netAmount: string
    debitAmount: string
    hasExistingSwap: boolean
}

export function LighterFeeUpdate({ previousFee, fee, netAmount, debitAmount, hasExistingSwap }: LighterFeeUpdateProps) {
    return <div className="w-full pb-4 text-center">
        <h2 className="mb-3 text-xl font-medium text-primary-text"><span>Lighter fee updated</span></h2>
        <p className="text-base text-secondary-text">
            <span>Lighter currently charges </span>
            <span className="font-medium text-primary-text">{fee} USDC</span>
            <span>, instead of the earlier {previousFee} USDC quote. </span>
            <span>{netAmount} USDC will reach the Layerswap deposit address and your total Lighter debit will be {debitAmount} USDC.</span>
        </p>
        {!hasExistingSwap && <p className="mt-3 text-sm text-secondary-text">
            <span>Your destination quote will be recalculated using the exact deposit amount before anything is signed.</span>
        </p>}
    </div>
}
