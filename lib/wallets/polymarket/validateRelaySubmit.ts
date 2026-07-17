import { decodeAbiParameters, decodeFunctionData, erc20Abi, size, zeroAddress, type Hex } from "viem";
import {
    POLYMARKET_COLLATERAL_OFFRAMP,
    POLYMARKET_DEPOSIT_WALLET_FACTORY,
    POLYMARKET_OFFRAMP_ABI,
    POLYMARKET_PUSD_ADDRESS,
    POLYMARKET_SAFE_MULTISEND,
    POLYMARKET_USDC_E_ADDRESS,
} from "./constants";
import { MULTISEND_ABI } from "./safeWithdraw";

/**
 * Validation of relayer `/submit` requests (pure, no I/O). The relay proxy is public
 * but relays on Layerswap's builder credentials, so it only accepts the exact batch
 * shape `buildPolymarketDepositCalls` produces — [approve → deposit] or
 * [approve → unwrap → approve → deposit] — with the token/factory/MultiSend targets
 * checked against the known contracts, the approve spender bound to the deposit leg's
 * target, and all amounts equal to the deposit amount. The depository address itself
 * is backend-resolved per swap, so it is deliberately not pinned here. Input is
 * untrusted JSON: everything is type-guarded and the validator never throws.
 */

export type RelayValidation =
    | { ok: true; kind: 'create' | 'deposit' }
    | { ok: false; reason: string }

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/
const HEX_RE = /^0x(?:[0-9a-fA-F]{2})*$/

const MAX_MULTISEND_BYTES = 16_384
const MAX_CALLS = 4

// depositERC20(bytes32 id, address token, address receiver, uint256 amount) — all static.
const DEPOSIT_ERC20_PARAMS = [{ type: 'bytes32' }, { type: 'address' }, { type: 'address' }, { type: 'uint256' }] as const

type DecodedCall = { target: string; data: Hex }

const isAddress = (v: unknown): v is string => typeof v === 'string' && ADDRESS_RE.test(v)
const isHex = (v: unknown): v is Hex => typeof v === 'string' && HEX_RE.test(v)
const sameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()
const isZeroString = (v: unknown): boolean => {
    if (typeof v !== 'string' || !v) return false
    try { return BigInt(v) === 0n } catch { return false }
}

/** Inverse of `encodeSafeMultiSend`: unwrap `multiSend(bytes)` and walk the packed
 * `op(1) | to(20) | value(32) | len(32) | data` entries. Only plain zero-value CALLs
 * are accepted — an inner delegatecall or malformed blob returns null. */
export function decodeSafeMultiSend(data: Hex): DecodedCall[] | null {
    if (size(data) > MAX_MULTISEND_BYTES) return null
    let packed: Hex
    try {
        const { functionName, args } = decodeFunctionData({ abi: MULTISEND_ABI, data })
        if (functionName !== 'multiSend') return null
        packed = args[0] as Hex
    } catch { return null }

    const blob = packed.slice(2)
    const calls: DecodedCall[] = []
    let i = 0
    while (i < blob.length) {
        if (calls.length >= MAX_CALLS) return null
        const op = blob.slice(i, i + 2); i += 2
        const to = blob.slice(i, i + 40); i += 40
        const value = blob.slice(i, i + 64); i += 64
        const lenHex = blob.slice(i, i + 64); i += 64
        if (op !== '00' || to.length !== 40 || value.length !== 64 || lenHex.length !== 64) return null
        if (BigInt(`0x${value}`) !== 0n) return null
        const len = Number(BigInt(`0x${lenHex}`))
        if (!Number.isSafeInteger(len) || len * 2 > blob.length - i) return null
        const callData = blob.slice(i, i + len * 2); i += len * 2
        calls.push({ target: `0x${to}`, data: `0x${callData}` as Hex })
    }
    return calls.length > 0 ? calls : null
}

const decodeApprove = (call: DecodedCall): { spender: string; amount: bigint } | null => {
    try {
        const { functionName, args } = decodeFunctionData({ abi: erc20Abi, data: call.data })
        if (functionName !== 'approve') return null
        return { spender: args[0] as string, amount: args[1] as bigint }
    } catch { return null }
}

type CallsVerdict = { ok: true } | { ok: false; reason: string }

function validateDepositCalls(calls: DecodedCall[], funder: string): CallsVerdict {
    if (calls.length !== 2 && calls.length !== 4) return { ok: false, reason: `unexpected call count: ${calls.length}` }
    for (const c of calls) {
        if (!isAddress(c.target) || !isHex(c.data)) return { ok: false, reason: 'malformed call target/data' }
    }

    const deposit = calls[calls.length - 1]
    if (deposit.data.length !== 10 + 4 * 64) return { ok: false, reason: 'unexpected deposit calldata length' }
    let depositToken: string
    let depositAmount: bigint
    try {
        const [, token, , amount] = decodeAbiParameters(DEPOSIT_ERC20_PARAMS, `0x${deposit.data.slice(10)}` as Hex)
        depositToken = token as string
        depositAmount = amount as bigint
    } catch { return { ok: false, reason: 'undecodable deposit calldata' } }
    if (!sameAddress(depositToken, POLYMARKET_USDC_E_ADDRESS)) return { ok: false, reason: 'deposit token is not USDC.e' }
    if (depositAmount <= 0n) return { ok: false, reason: 'non-positive deposit amount' }

    const approveLeg = calls[calls.length - 2]
    const approveDepository = decodeApprove(approveLeg)
    if (!approveDepository
        || !sameAddress(approveLeg.target, POLYMARKET_USDC_E_ADDRESS)
        || !sameAddress(approveDepository.spender, deposit.target)
        || approveDepository.amount !== depositAmount)
        return { ok: false, reason: 'invalid depository approve leg' }

    if (calls.length === 4) {
        const approveOfframp = decodeApprove(calls[0])
        if (!approveOfframp
            || !sameAddress(calls[0].target, POLYMARKET_PUSD_ADDRESS)
            || !sameAddress(approveOfframp.spender, POLYMARKET_COLLATERAL_OFFRAMP)
            || approveOfframp.amount !== depositAmount)
            return { ok: false, reason: 'invalid offramp approve leg' }

        let unwrap: { asset: string; to: string; amount: bigint } | null = null
        try {
            const { functionName, args } = decodeFunctionData({ abi: POLYMARKET_OFFRAMP_ABI, data: calls[1].data })
            if (functionName === 'unwrap') unwrap = { asset: args[0] as string, to: args[1] as string, amount: args[2] as bigint }
        } catch { }
        if (!unwrap
            || !sameAddress(calls[1].target, POLYMARKET_COLLATERAL_OFFRAMP)
            || !sameAddress(unwrap.asset, POLYMARKET_USDC_E_ADDRESS)
            || !sameAddress(unwrap.to, funder)
            || unwrap.amount !== depositAmount)
            return { ok: false, reason: 'invalid unwrap leg' }
    }

    return { ok: true }
}

export function validateRelaySubmitRequest(request: unknown): RelayValidation {
    try {
        if (!request || typeof request !== 'object') return { ok: false, reason: 'request is not an object' }
        const r = request as Record<string, unknown>
        if (!isAddress(r.from)) return { ok: false, reason: 'invalid from address' }

        if (r.type === 'WALLET-CREATE') {
            if (!isAddress(r.to) || !sameAddress(r.to, POLYMARKET_DEPOSIT_WALLET_FACTORY))
                return { ok: false, reason: 'WALLET-CREATE target is not the deposit-wallet factory' }
            return { ok: true, kind: 'create' }
        }

        if (r.type === 'WALLET') {
            if (!isAddress(r.to) || !sameAddress(r.to, POLYMARKET_DEPOSIT_WALLET_FACTORY))
                return { ok: false, reason: 'WALLET target is not the deposit-wallet factory' }
            if (!r.depositWalletParams || typeof r.depositWalletParams !== 'object')
                return { ok: false, reason: 'missing depositWalletParams' }
            const params = r.depositWalletParams as Record<string, unknown>
            if (!isAddress(params.depositWallet)) return { ok: false, reason: 'invalid depositWallet' }
            if (!Array.isArray(params.calls) || params.calls.length === 0) return { ok: false, reason: 'missing calls' }
            const calls: DecodedCall[] = []
            for (const c of params.calls as Record<string, unknown>[]) {
                if (!c || typeof c !== 'object' || !isAddress(c.target) || !isHex(c.data) || !isZeroString(c.value))
                    return { ok: false, reason: 'malformed batch call' }
                calls.push({ target: c.target, data: c.data })
            }
            const verdict = validateDepositCalls(calls, params.depositWallet)
            if (!verdict.ok) return verdict
            return { ok: true, kind: 'deposit' }
        }

        if (r.type === 'SAFE') {
            if (!isAddress(r.to) || !sameAddress(r.to, POLYMARKET_SAFE_MULTISEND))
                return { ok: false, reason: 'SAFE target is not the MultiSend contract' }
            if (!isAddress(r.proxyWallet)) return { ok: false, reason: 'invalid proxyWallet' }
            if (!r.signatureParams || typeof r.signatureParams !== 'object')
                return { ok: false, reason: 'missing signatureParams' }
            const sp = r.signatureParams as Record<string, unknown>
            if (sp.operation !== '1'
                || !isZeroString(sp.gasPrice) || !isZeroString(sp.safeTxnGas) || !isZeroString(sp.baseGas)
                || !isAddress(sp.gasToken) || !sameAddress(sp.gasToken, zeroAddress)
                || !isAddress(sp.refundReceiver) || !sameAddress(sp.refundReceiver, zeroAddress))
                return { ok: false, reason: 'unexpected signatureParams' }
            if (!isHex(r.data)) return { ok: false, reason: 'invalid data' }
            const calls = decodeSafeMultiSend(r.data)
            if (!calls) return { ok: false, reason: 'undecodable MultiSend data' }
            const verdict = validateDepositCalls(calls, r.proxyWallet)
            if (!verdict.ok) return verdict
            return { ok: true, kind: 'deposit' }
        }

        return { ok: false, reason: `unsupported type: ${String(r.type)}` }
    } catch (e) {
        return { ok: false, reason: `validation error: ${(e as Error)?.message}` }
    }
}
