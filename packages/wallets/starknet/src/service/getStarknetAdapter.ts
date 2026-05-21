import type { Connector } from '@starknet-react/core'

type StarknetAdapterApi = {
    getConnectors: () => readonly Connector[]
    disconnectAsync: () => Promise<void>
}

let _api: StarknetAdapterApi | null = null

export function setStarknetAdapterApi(api: StarknetAdapterApi | null): void {
    _api = api
}

export function getStarknetAdapterApi(): StarknetAdapterApi {
    if (!_api) {
        throw new Error('Starknet adapter API requested before StarknetProvider mounted')
    }
    return _api
}

export function hasStarknetAdapterApi(): boolean {
    return _api !== null
}
