import { Network } from "@layerswap/widget/types";
import { KnownInternalNames } from "@layerswap/widget/internal";

export class ImmutableXGasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.ImmutableXMainnet || KnownInternalNames.Networks.ImmutableXGoerli).includes(network.name)
    }

    async getGas({ address: string, network: Network, token: Token }): Promise<any> {
        return undefined;
    }
}