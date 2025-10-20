import { resolverService } from "@/lib/resolvers/resolverService";

export function addressFormat(address: string, network: { name: string } | null): string {
    if (!address || !network) {
        return address
    }
    try {
        const resolver = resolverService.getAddressUtilsResolver();
        return resolver.addressFormat(address, network);
    } catch (err) {
        return address
    }
}