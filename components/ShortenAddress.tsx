export default function shortenAddress(address: string) {
    if (address?.startsWith('ronin:')) {
        var stringAddress = address.replace('ronin:', '')
        return `ronin:${stringAddress?.substring(0, 5)}...${stringAddress?.substring(stringAddress?.length - 4, stringAddress?.length - 1)}`
    } else if (address?.startsWith('zksync:')) {
        var stringAddress = address.replace('zksync:', '')
        return `zksync:${stringAddress?.substring(0, 5)}...${stringAddress?.substring(stringAddress?.length - 4, stringAddress?.length - 1)}`
    } else {
        return `${address?.substring(0, 5)}...${address?.substring(address?.length - 4, address?.length - 1)}`
    }
}