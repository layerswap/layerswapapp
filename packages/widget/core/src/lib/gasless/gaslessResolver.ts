import { GaslessProvider, GaslessSignParams } from "@layerswap/widget-types";
import { Network } from "@layerswap/widget-types";

export class GaslessResolver {
    private providers: GaslessProvider[]

    constructor(providers?: GaslessProvider[]) {
        this.providers = providers || []
    }

    supportsNetwork(network: Network): boolean {
        return this.providers.some(p => p.supportsNetwork(network))
    }

    async signGaslessDeposit(params: GaslessSignParams): Promise<string> {
        const provider = this.providers.find(p => p.supportsNetwork(params.network))
        if (!provider) {
            const error = `No gasless provider found for network: ${params.network.name}`
            console.warn(error)
            throw error
        }

        return provider.signGaslessDeposit(params)
    }
}
