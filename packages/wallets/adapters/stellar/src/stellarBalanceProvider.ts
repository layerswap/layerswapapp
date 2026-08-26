import { Horizon } from '@stellar/stellar-sdk'
import { BalanceProvider, insertIfNotExists } from '@layerswap/widget-types'
import { NetworkType } from '@layerswap/widget-types'
import {
    createStellarZeroBalance,
    createUnfundedStellarBalances,
    resolveStellarBalanceAmount,
} from './stellarBalances'
import { resolveStellarAsset } from './stellarNetwork'

function statusOf(error: unknown): number | undefined {
    const candidate = error as {
        status?: number
        response?: { status?: number }
        cause?: { status?: number; response?: { status?: number } }
    }
    return candidate?.status ?? candidate?.response?.status ?? candidate?.cause?.status ?? candidate?.cause?.response?.status
}

export class StellarBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = network => network.type === NetworkType.Stellar

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        const tokens = insertIfNotExists(network.tokens, network.token)
        const server = new Horizon.Server(network.node_url)

        try {
            const needsReserve = tokens.some(token => resolveStellarAsset(token).isNative())
            const [account, ledgerPage] = await Promise.all([
                server.loadAccount(address),
                needsReserve ? server.ledgers().order('desc').limit(1).call() : Promise.resolve(undefined),
            ])
            const baseReserveInStroops = ledgerPage?.records[0]?.base_reserve_in_stroops
            if (needsReserve && !Number.isSafeInteger(baseReserveInStroops)) {
                throw new Error('Horizon returned an invalid Stellar base reserve')
            }
            return tokens.map(token => {
                try {
                    return {
                        ...createStellarZeroBalance(token, network),
                        amount: resolveStellarBalanceAmount(
                            token,
                            account.balances,
                            resolveStellarAsset(token).isNative()
                                ? { account, baseReserveInStroops: baseReserveInStroops! }
                                : undefined,
                        ),
                    }
                } catch (error) {
                    return this.resolveTokenBalanceFetchError(error as Error, token, network)
                }
            })
        } catch (error) {
            if (statusOf(error) === 404) return createUnfundedStellarBalances(tokens, network)
            return tokens.map(token => this.resolveTokenBalanceFetchError(error as Error, token, network))
        }
    }
}
