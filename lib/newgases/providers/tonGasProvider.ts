import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";

export class TonGasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name)
    }

    async getGas({address: string, network: Network, token: Token}): Promise<any> {
        return null;
    }
}