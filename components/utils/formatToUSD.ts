const amountToUsd = (unformattedAmount: number | unknown) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(unformattedAmount))
}

export default amountToUsd