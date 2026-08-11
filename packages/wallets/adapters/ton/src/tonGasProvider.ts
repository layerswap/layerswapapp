import { Network } from "@layerswap/widget-types";
import { GasProvider } from "@layerswap/widget-types";
import { KnownInternalNames } from "@layerswap/utils";

export class TonGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name)
    }

    async getGas({ address: string, network: Network, token: Token }): Promise<any> {
        return undefined;
    }
}