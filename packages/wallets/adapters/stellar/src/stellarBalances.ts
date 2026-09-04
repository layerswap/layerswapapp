import type { NetworkWithTokens, Token, TokenBalance } from '@layerswap/widget-types'
import { baseUnitsToNumber } from '@layerswap/utils/common'
import { resolveStellarAsset } from './stellarNetwork'

type StellarBalanceLine = {
    balance: string
    selling_liabilities?: string
    asset_type: string
    asset_code?: string
    asset_issuer?: string
    is_authorized?: boolean
}

export type StellarAccountReserveData = {
    subentry_count: number
    num_sponsoring: number
    num_sponsored: number
}

export function createStellarZeroBalance(
    token: Token,
    network: NetworkWithTokens,
): TokenBalance {
    const asset = resolveStellarAsset(token)
    return {
        network: network.name,
        token: token.symbol,
        amount: 0,
        request_time: new Date().toJSON(),
        decimals: token.decimals,
        isNativeCurrency: asset.isNative(),
    }
}

export function resolveStellarBalanceAmount(
    token: Token,
    balances: readonly StellarBalanceLine[],
    reserve?: { account: StellarAccountReserveData, baseReserveInStroops: number },
): number {
    const asset = resolveStellarAsset(token)
    const line = asset.isNative()
        ? balances.find(balance => balance.asset_type === 'native')
        : balances.find(balance => (
            balance.asset_type === asset.getAssetType()
            && balance.asset_code === asset.getCode()
            && balance.asset_issuer === asset.getIssuer()
        ))
    if (!line) return 0
    if (!asset.isNative() && line.is_authorized === false) {
        throw new Error(`The ${token.symbol} trustline is not authorized`)
    }

    let spendable = Number(line.balance) - Number(line.selling_liabilities ?? 0)
    if (asset.isNative()) {
        if (!reserve) throw new Error('Stellar base reserve is unavailable')
        const { account, baseReserveInStroops } = reserve
        const reserveUnits = 2 + account.subentry_count + account.num_sponsoring - account.num_sponsored
        spendable -= reserveUnits * baseUnitsToNumber(BigInt(baseReserveInStroops), token.decimals)
    }
    if (!Number.isFinite(spendable)) throw new Error(`Horizon returned an invalid ${token.symbol} balance`)
    return Math.max(0, spendable)
}

export function createUnfundedStellarBalances(
    tokens: readonly Token[],
    network: NetworkWithTokens,
): TokenBalance[] {
    return tokens.map(token => createStellarZeroBalance(token, network))
}
