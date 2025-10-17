import { resolverService } from "@/lib/resolvers/resolverService";

export function isValidAddress(address?: string, network?: { name: string } | null): boolean {
    if (!address || !network || isBlacklistedAddress(address)) {
        return false
    }
    try {
        const resolver = resolverService.getAddressUtilsResolver();
        return resolver.isValidAddress(network, address);
        // if resolver returns undefined (no provider), fall through to local checks
    } catch (err) {
        return false
        // resolverService may not be initialized in some environments — fall back to local validation
    }
}

function isBlacklistedAddress(address: string): boolean {

    const BlacklistedAddresses = [
        "0xa9d38c3FB49074c00596a25CcF396402362C92C5",
        "0x4d70500858f9705ddbd56d007d13bbc92c9c67d1"
    ]

    let account = address

    if (account.includes(":")) {
        account = account.split(":")[1]
    }

    if (BlacklistedAddresses.find(a => a.toLowerCase() === account.toLowerCase())) return true
    else return false
}