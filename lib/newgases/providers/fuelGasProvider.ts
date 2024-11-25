import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";

export class FuelGasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.FuelMainnet || KnownInternalNames.Networks.FuelTestnet).includes(network.name)
    }

    async getGas({address: string, network: Network, token: Token}): Promise<any> {
        return null;
    }
}