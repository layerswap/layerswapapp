import { addressUtilsResolver } from "@/address/instance";

type AddressFormatProps = {
    address: string;
    network?: { name: string } | null;
    providerName?: string
}

export function addressFormat(props: AddressFormatProps): string {
    const { address, network, providerName } = props
    try {
        return addressUtilsResolver.addressFormat({ address, network, providerName });
    } catch (err) {
        return address
    }
}