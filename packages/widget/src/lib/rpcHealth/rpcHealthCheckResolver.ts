import { Network } from "@/Models/Network"
import { RpcHealthCheckProvider } from "@/types/rpcHealth"

export class RpcHealthCheckResolver {
    private providers: RpcHealthCheckProvider[]

    constructor(providers?: RpcHealthCheckProvider[]) {
        this.providers = providers || []
    }

    getProviderForNetwork(network: Network): RpcHealthCheckProvider | undefined {
        return this.providers.find(p => p.supportsNetwork(network))
    }
}
