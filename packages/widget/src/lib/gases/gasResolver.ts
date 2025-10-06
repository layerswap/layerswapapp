
import { GasProps } from "../../Models/Balance";
import { GasProvider } from "./providers/types";

export class GasResolver {
    private providers: GasProvider[];

    constructor(providers?: GasProvider[]) {
        this.providers = providers || [];
    }

    getGas({ address, network, token, recipientAddress }: GasProps) {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return;

        return provider.getGas({ address, network, token, recipientAddress });
    }
}
