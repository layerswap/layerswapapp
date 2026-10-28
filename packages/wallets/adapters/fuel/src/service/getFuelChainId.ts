import { Provider, type FuelConnector } from '@fuel-ts/account'

/** Resolve the live connector network; older wallets may only provide its RPC URL. */
export async function getFuelChainId(connector: Pick<FuelConnector, 'currentNetwork'>): Promise<number> {
    const network = await connector.currentNetwork()
    // Discovery runs during wallet synchronization, so a stalled RPC must not
    // indefinitely prevent other connected Fuel wallets from being published.
    return network.chainId ?? new Provider(network.url, {
        timeout: 10_000,
        retryOptions: { maxRetries: 0 },
    }).getChainId()
}
