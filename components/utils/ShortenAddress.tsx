export default function shortenAddress(address: string) {
    if (address?.startsWith('ronin:')) {
        var stringAddress = address.replace('ronin:', '')
        return `ronin:${InnerShortenAddress(stringAddress)}`
    } else if (address?.startsWith('zksync:')) {
        var stringAddress = address.replace('zksync:', '')
        return `zksync:${InnerShortenAddress(stringAddress)}`
    } else {
        return InnerShortenAddress(address)
    }

    function InnerShortenAddress(address: string) {
        return `${address?.substring(0, 5)}...${address?.substring(address?.length - 4, address?.length)}`
    }
}