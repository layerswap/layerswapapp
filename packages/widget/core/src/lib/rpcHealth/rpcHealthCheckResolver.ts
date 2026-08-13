import { Network } from "@layerswap/widget-types";
import { RpcHealthCheckProvider } from "@layerswap/widget-types";

export class RpcHealthCheckResolver {
    private providers: RpcHealthCheckProvider[]

    constructor(providers?: RpcHealthCheckProvider[]) {
        this.providers = providers || []
    }

    getProviderForNetwork(network: Network): RpcHealthCheckProvider | undefined {
        return this.providers.find(p => p.supportsNetwork(network))
    }
}
