import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";

export class ImmutableXGasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.ImmutableXMainnet || KnownInternalNames.Networks.ImmutableXGoerli).includes(network.name)   
    }

    async getGas({network: Network, token: Token, address: string}): Promise<any> {
        return null;
    }
}