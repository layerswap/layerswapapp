import { AuthorizeWithdrawalProps, TransferProvider, TransferProps, TransferProgress, Wallet, WithdrawalAuthorization } from "@/types"

export class TransferResolver {
    private providers: TransferProvider[]

    constructor(providers?: TransferProvider[]) {
        this.providers = providers || []
    }

    async executeTransfer(params: TransferProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string | undefined> {
        const provider = this.providers.find(p => p.supportsNetwork(params.network))
        if (!provider) {
            const error = `No transfer provider found for network: ${params.network.name}`
            console.warn(error)
            throw error
        }

        return provider.executeTransfer(params, wallet, onProgress)
    }

    /**
     * Run a provider's optional pre-swap authorization (see
     * `TransferProvider.authorizeWithdrawal`). Returns undefined when the provider for
     * this network doesn't implement it, so callers can treat "no authorization step"
     * and "authorized" uniformly and go straight to swap creation.
     */
    async authorizeWithdrawal(params: AuthorizeWithdrawalProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<WithdrawalAuthorization | undefined> {
        const provider = this.providers.find(p => p.supportsNetwork(params.network))
        if (!provider) {
            const error = `No transfer provider found for network: ${params.network.name}`
            console.warn(error)
            throw error
        }
        if (!provider.authorizeWithdrawal) return undefined

        return provider.authorizeWithdrawal(params, wallet, onProgress)
    }
}
