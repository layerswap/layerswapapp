import { MuxedAccount, StrKey } from '@stellar/stellar-sdk'
import type { SwapPrerequisiteContext, SwapPrerequisiteResult } from '@layerswap/widget-types'
import { resolveStellarAsset } from '../stellarNetwork'

export type RecipientAccount = {
    subentry_count: number
    num_sponsoring: number
    num_sponsored: number
    balances: readonly {
        asset_type: string
        balance: string
        asset_code?: string
        asset_issuer?: string
        limit?: string
        buying_liabilities?: string
        selling_liabilities?: string
        is_authorized?: boolean
    }[]
}

/** The API's numeric quote may serialize in scientific notation. Round required capacity up. */
export function stellarStroops(value: string, roundUp = false): bigint {
    const match = /^(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(value)
    if (!match) throw new Error('Invalid Stellar amount')
    const exponent = Number(match[3] ?? 0)
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 30 || value.length > 100) throw new Error('Invalid Stellar amount')
    const digits = BigInt(match[1] + (match[2] ?? ''))
    const shift = 7 + exponent - (match[2]?.length ?? 0)
    if (shift >= 0) return digits * 10n ** BigInt(shift)
    const divisor = 10n ** BigInt(-shift)
    if (!roundUp && digits % divisor !== 0n) throw new Error('Invalid Stellar amount precision')
    return digits / divisor + (roundUp && digits % divisor !== 0n ? 1n : 0n)
}

export function stellarAmount(stroops: bigint): string {
    const fraction = (stroops % 10_000_000n).toString().padStart(7, '0').replace(/0+$/, '')
    return `${stroops / 10_000_000n}${fraction ? `.${fraction}` : ''}`
}

export function stellarRecipientAddress(address: string): string {
    const normalized = address.trim().toUpperCase()
    if (StrKey.isValidEd25519PublicKey(normalized)) return normalized
    return MuxedAccount.fromAddress(normalized, '0').baseAccount().accountId()
}

export function evaluateStellarRecipient(
    context: SwapPrerequisiteContext,
    account: RecipientAccount | undefined,
    baseReserve: bigint,
    fee: bigint,
    canSign = true,
): SwapPrerequisiteResult {
    const { network, token, address } = context.destination
    const asset = resolveStellarAsset(token)
    if (asset.isNative()) return { status: 'ready' }
    const issuer = asset.getIssuer()
    if (!issuer) throw new Error('Stellar asset issuer is missing')
    const baseAddress = stellarRecipientAddress(address)
    const label = token.asset || token.symbol
    if (baseReserve <= 0n || fee <= 0n) throw new Error('Stellar reserve or fee is unavailable')
    if (!account) return {
        status: 'blocked',
        title: 'Stellar account not active',
        description: 'This Stellar account must be activated with XLM before it can receive tokens.',
    }
    // Issuers can receive (burn) their own asset without a trustline.
    if (baseAddress === asset.getIssuer()) return { status: 'ready' }
    const line = account.balances.find(balance => balance.asset_type === asset.getAssetType()
        && balance.asset_code === asset.getCode() && balance.asset_issuer === asset.getIssuer())
    if (line) {
        if (line.is_authorized !== true) return {
            status: 'blocked', title: `${label} is not authorized`,
            description: `Contact the token issuer to authorize this account to receive ${label}.`,
        }
        if (!line.limit) throw new Error('Stellar trustline limit is unavailable')
        const capacity = stellarStroops(line.limit) - stellarStroops(line.balance) - stellarStroops(line.buying_liabilities ?? '0')
        const required = context.receiveAmount == null ? 1n : stellarStroops(context.receiveAmount, true)
        if (capacity < required) return {
            status: 'blocked', title: `Increase your ${label} receiving limit`,
            description: 'Lower the transfer amount or increase the trustline limit in the destination wallet.',
        }
        return context.receiveAmount == null
            ? { status: 'ready', title: 'Available to receive', description: `${stellarAmount(capacity)} ${label}` }
            : { status: 'ready' }
    }
    const counts = [account.subentry_count, account.num_sponsoring, account.num_sponsored]
    if (counts.some(count => !Number.isSafeInteger(count) || count < 0)) throw new Error('Invalid Stellar reserve data')
    const reserveUnits = 2n + BigInt(account.subentry_count) + BigInt(account.num_sponsoring) - BigInt(account.num_sponsored)
    if (reserveUnits < 0n) throw new Error('Invalid Stellar reserve data')
    const native = account.balances.find(balance => balance.asset_type === 'native')
    if (!native) throw new Error('Stellar XLM balance is unavailable')
    const shortfall = (reserveUnits + 1n) * baseReserve + fee + stellarStroops(native.selling_liabilities ?? '0') - stellarStroops(native.balance)
    if (shortfall > 0n) return {
        status: 'blocked', title: `Add XLM to enable ${label}`,
        description: `Add at least ${stellarAmount(shortfall)} XLM to this account to enable ${label}.`,
    }
    return {
        status: 'required', title: `Enable ${label}`,
        description: canSign
            ? `Add a one-time Stellar trustline so this account can receive ${label}.`
            : `Add the ${label} trustline in the destination account's Stellar wallet.`,
        action: canSign ? { id: 'add-trustline', label: 'Add trustline', wallet: { network, address: baseAddress, role: 'destination' } } : undefined,
    }
}
