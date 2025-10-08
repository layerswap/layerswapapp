import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";
import { GasProvider } from "@/lib/wallets/types/gas";

export class TonGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.TONMainnet.includes(network.name)
    }

    async getGas({address: string, network: Network, token: Token}): Promise<any> {
        return undefined;
    }
}