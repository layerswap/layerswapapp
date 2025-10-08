
import { GasProps } from "../../Models/Balance";
import { GasProvider } from "../wallets/types/gas";

export class GasResolver {
    private providers: GasProvider[];

    constructor(providers?: GasProvider[]) {
        this.providers = providers || [];
    }

    getGas({ address, network, token, recipientAddress, wallet, amount }: GasProps) {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return;

        return provider.getGas({ address, network, token, recipientAddress, wallet, amount });
    }
}
