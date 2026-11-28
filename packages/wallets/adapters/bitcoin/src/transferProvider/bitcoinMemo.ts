export function bitcoinMemo(callData: string): string {
    const separator = callData.indexOf(';')
    const sequence = separator === -1 ? callData : callData.slice(0, separator)
    const suffix = separator === -1 ? '' : callData.slice(separator)
    return BigInt(sequence).toString(16) + suffix
}
