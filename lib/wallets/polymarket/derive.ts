import { concat, encodeAbiParameters, encodePacked, getCreate2Address, keccak256, pad, toHex } from "viem";
import {
    POLYMARKET_DEPOSIT_WALLET_FACTORY,
    POLYMARKET_DEPOSIT_WALLET_IMPLEMENTATION,
    POLYMARKET_PROXY_FACTORY,
    POLYMARKET_SAFE_FACTORY,
} from "./constants";

/**
 * Deterministic CREATE2 derivation of Polymarket funder wallets from an owner EOA.
 *
 * Reimplemented in pure viem (no @polymarket SDK) — these are exact ports of the
 * SDK's derive functions + constants, verified to match the SDK output AND a known
 * on-chain funder address. Safety-critical: a wrong address would read the wrong
 * balance and send funds to the wrong wallet, so the constants below must not drift
 * from Polymarket's contracts.
 */

// Gnosis-Safe / custom-proxy clone init-code hashes (Polymarket Contract Proxy Factory).
const SAFE_INIT_CODE_HASH = '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf'
const PROXY_INIT_CODE_HASH = '0xd21df8dc65880a8606f09fe0ce3df9b8869287ab0b058be05aa9e8af6330a00b'

// Solady v0.1.26 LibClone.initCodeHashERC1967 byte constants (minimal ERC-1967 proxy).
const ERC1967_CONST1 = '0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3'
const ERC1967_CONST2 = '0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076'
const ERC1967_PREFIX = 0x61003d3d8160233d3973n

/** Gnosis Safe funder (browser-wallet logins). */
export function derivePolymarketSafe(ownerEoa: string): `0x${string}` {
    return getCreate2Address({
        bytecodeHash: SAFE_INIT_CODE_HASH,
        from: POLYMARKET_SAFE_FACTORY,
        salt: keccak256(encodeAbiParameters([{ type: 'address' }], [ownerEoa as `0x${string}`])),
    })
}

/** Custom proxy funder (MagicLink/email logins). */
export function derivePolymarketProxy(ownerEoa: string): `0x${string}` {
    return getCreate2Address({
        bytecodeHash: PROXY_INIT_CODE_HASH,
        from: POLYMARKET_PROXY_FACTORY,
        salt: keccak256(encodePacked(['address'], [ownerEoa as `0x${string}`])),
    })
}

function depositWalletArgs(owner: string, factory: `0x${string}`): `0x${string}` {
    const walletId = pad(owner as `0x${string}`, { dir: 'left', size: 32 })
    return encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [factory, walletId])
}

/** keccak256 of the minimal ERC-1967 proxy init code for `implementation` + `args`. */
function initCodeHashERC1967(implementation: `0x${string}`, args: `0x${string}`): `0x${string}` {
    const n = BigInt((args.length - 2) / 2)
    const combined = ERC1967_PREFIX + (n << 56n)
    return keccak256(concat([toHex(combined, { size: 10 }), implementation, '0x6009', ERC1967_CONST2, ERC1967_CONST1, args]))
}

/** Modern ERC-1967 deposit-wallet funder (the default for current accounts; UUPS shape). */
export function derivePolymarketDepositWallet(ownerEoa: string): `0x${string}` {
    const args = depositWalletArgs(ownerEoa, POLYMARKET_DEPOSIT_WALLET_FACTORY)
    return getCreate2Address({
        from: POLYMARKET_DEPOSIT_WALLET_FACTORY,
        salt: keccak256(args),
        bytecodeHash: initCodeHashERC1967(POLYMARKET_DEPOSIT_WALLET_IMPLEMENTATION, args),
    })
}
