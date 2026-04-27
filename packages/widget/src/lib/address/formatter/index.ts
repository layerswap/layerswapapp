import { resolverService } from "@/lib/resolvers/resolverService";

type AddressFormatProps = {
    address: string;
    network?: { name: string } | null;
    providerName?: string
}

export function addressFormat(props: AddressFormatProps): string {
    const { address, network, providerName } = props
    try {
        const resolver = resolverService.getAddressUtilsResolver();
        return resolver.addressFormat({ address, network, providerName });
    } catch (err) {
        return address
    }
}