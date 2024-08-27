const formatAmount = (unformattedAmount: bigint | unknown, decimals: number | undefined) => {
    return (Number(BigInt(unformattedAmount?.toString() || 0)) / Math.pow(10, decimals || 18))
}

export default formatAmount