export function addressFormat(address: string, network: { internal_name: string } | null): string {

    if (network?.internal_name.toLowerCase().startsWith("STARKNET".toLowerCase())) {
        const removeHexPrefix = (hex: string) => {
            return hex.replace("0x", "");
        }
        const addHexPrefix = (hex: string) => {
            return `0x${hex}`
        }
        const addAddressPadding = (address: string) => {
            return addHexPrefix(removeHexPrefix(address).padStart(64, '0'))
        }

        return addAddressPadding(address)

    }
    // else if (network?.internal_name.toLowerCase().startsWith("TON".toLowerCase())) {

    // }
    else if (network?.internal_name.toLowerCase().startsWith("SOLANA".toLowerCase())) {
        return address
    }
    else {
        return address.toLowerCase();
    }
}