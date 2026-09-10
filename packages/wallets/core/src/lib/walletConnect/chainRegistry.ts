import type { NetworkType } from '@layerswap/widget-types'

export type WalletConnectChainDefinition = Readonly<{ namespace: string, networkType: NetworkType, explorerChainIds: readonly string[] }>

export class WalletConnectChainRegistry {
    private readonly definitions = new Map<string, WalletConnectChainDefinition>()

    register(definition: WalletConnectChainDefinition): void {
        if (!definition.namespace) throw new Error('WalletConnect chain namespace is required')
        this.definitions.set(definition.namespace, definition)
    }

    get(namespace: string): WalletConnectChainDefinition | undefined { return this.definitions.get(namespace) }
}

export const defaultWalletConnectChainRegistry = new WalletConnectChainRegistry()
