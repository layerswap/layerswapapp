import { resolverService } from "@/lib/resolvers/resolverService";

export function addressFormat(address: string, network: { name: string } | null): string {
    if (!address || !network) {
        return address
    }
    try {
        const resolver = resolverService.getAddressUtilsResolver();
        return resolver.addressFormat(address, network);
        // if resolver returns undefined (no provider), fall through to local checks
    } catch (err) {
        return address
        // resolverService may not be initialized in some environments — fall back to local validation
    }
}