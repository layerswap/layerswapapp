import { TransferProvider, TransferProps, Wallet } from "@/types"

export class TransferResolver {
    private providers: TransferProvider[]

    constructor(providers?: TransferProvider[]) {
        this.providers = providers || []
    }

    async executeTransfer(params: TransferProps, wallet?: Wallet): Promise<string | undefined> {
        const provider = this.providers.find(p => p.supportsNetwork(params.network))
        if (!provider) {
            console.warn(`No transfer provider found for network: ${params.network.name}`)
            return undefined
        }

        return provider.executeTransfer(params, wallet)
    }
}
