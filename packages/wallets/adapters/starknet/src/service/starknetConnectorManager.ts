import type { Connector } from '@starknet-react/core'
import { useStarknetStore, type StarknetConnectorSnapshot } from './starknetStore'

class StarknetConnectorManager {
    private _connectors: Connector[] = []

    register(connectors: Connector[]): void {
        this._connectors = connectors
        const snapshots: StarknetConnectorSnapshot[] = connectors.map(c => ({
            id: c.id,
            name: c.name,
            icon: typeof c.icon === 'string' ? c.icon : (c.icon?.dark || ''),
        }))
        useStarknetStore.getState()._setConnectors(snapshots)
    }

    getConnectors(): readonly Connector[] {
        return this._connectors
    }

    getConnector(id: string): Connector | undefined {
        return this._connectors.find(c => c.id === id)
    }

    async disconnectAll(): Promise<void> {
        for (const connector of this._connectors) {
            try {
                if (typeof (connector as any).available === 'function' && !(connector as any).available()) continue
                await connector.disconnect()
            } catch { /* swallow */ }
        }
    }

    dispose(): void {
        this._connectors = []
    }
}

export const starknetConnectorManager = new StarknetConnectorManager()
