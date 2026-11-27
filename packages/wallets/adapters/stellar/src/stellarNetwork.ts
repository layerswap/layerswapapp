import { AppSettings } from '@layerswap/utils'
import { Asset, StrKey } from '@stellar/stellar-sdk'
import type { LayerswapNetwork, LayerswapToken } from '@layerswap/widget-types'

export const STELLAR_PUBLIC_PASSPHRASE = 'Public Global Stellar Network ; September 2015'
export const STELLAR_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'

export function resolveStellarNetworkPassphrase(network: LayerswapNetwork): string {
    const expected = AppSettings.isTestnet() ? STELLAR_TESTNET_PASSPHRASE : STELLAR_PUBLIC_PASSPHRASE
    const configured = network.chain_id
    if (!configured) throw new Error('Stellar network passphrase is missing from chain_id')
    if (configured !== expected) throw new Error('Stellar network passphrase does not match the network ID')
    return configured
}

export function resolveStellarAsset(token: LayerswapToken): Asset {
    if (token.decimals !== 7) throw new Error(`Stellar assets must use 7 decimals: ${token.symbol}`)
    if (!token.contract) {
        if (token.symbol !== 'XLM') throw new Error(`Unsupported native Stellar asset: ${token.symbol}`)
        return Asset.native()
    }
    if (token.symbol.length < 1 || token.symbol.length > 12 || !/^[a-zA-Z0-9]+$/.test(token.symbol)) {
        throw new Error(`Stellar issued-asset code is invalid: ${token.symbol}`)
    }
    if (!StrKey.isValidEd25519PublicKey(token.contract)) {
        throw new Error(`Stellar issued-asset issuer is invalid: ${token.symbol}`)
    }
    return new Asset(token.symbol, token.contract)
}
