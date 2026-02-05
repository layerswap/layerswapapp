import { Address } from "@ton/core";

type AddressFormatProps = {
    address: string;
    network?: { name: string } | null;
    providerName?: string
}

export function addressFormat(props: AddressFormatProps): string {
    const { address, network, providerName } = props

    if (
        network?.name.toLowerCase().startsWith("starknet")
        || network?.name.toLowerCase().startsWith("paradex")
        || providerName?.toLowerCase() == 'paradex'
        || providerName?.toLowerCase() == 'starknet'
    ) {
        const removeHexPrefix = (hex: string) => {
            return hex?.replace("0x", "");
        }
        const addHexPrefix = (hex: string) => {
            return `0x${hex}`
        }
        const addAddressPadding = (address: string) => {
            return addHexPrefix(removeHexPrefix(address)?.padStart(64, '0'))
        }

        return addAddressPadding(address?.toLowerCase());

    }
    else if (
        network?.name.toLowerCase().startsWith("ton")
        || providerName?.toLowerCase() == 'ton'
    ) {
        try {
            return Address.parse(address).toString({ bounceable: false, testOnly: false, urlSafe: true })
        } catch (error) {
            return address
        }
    }
    else if (
        network?.name.toLowerCase().startsWith("solana")
        || network?.name.toLowerCase().startsWith("eclipse")
        || network?.name.toLowerCase().startsWith("soon")
        || network?.name.toLowerCase().startsWith("tron")
        || network?.name.toLowerCase().startsWith("bitcoin")
        || providerName?.toLowerCase() == 'solana'
        || providerName?.toLowerCase() == 'tron'
        || providerName?.toLowerCase() == 'bitcoin'
    ) {
        return address
    }
    else {
        return address?.toLowerCase();
    }
}