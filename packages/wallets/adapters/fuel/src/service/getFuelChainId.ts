import { Provider, type FuelConnector } from '@fuel-ts/account'

/** Resolve the live connector network; older wallets may only provide its RPC URL. */
export async function getFuelChainId(connector: Pick<FuelConnector, 'currentNetwork'>): Promise<number> {
    const network = await connector.currentNetwork()
    return network.chainId ?? new Provider(network.url).getChainId()
}
