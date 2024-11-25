import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";

export class TonGasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name)
    }

    async getGas({network: Network, token: Token, address: string}): Promise<any> {
        return null;
    }
}