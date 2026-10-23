import { createPublicClient, custom, type PublicClient, type EIP1193Provider } from 'viem'
import { normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import resolveChain from '../evmUtils/resolveChain'
import { resolveFallbackTransport } from '../evmUtils/resolveTransports'
import { NetworkType } from '@layerswap/widget-types';
import type { TransferProvider } from "@layerswap/widget-types";
import { getEvmConfig } from '../service/getEvmConfig'
import { createEVMTransferProvider } from './createEVMTransferProvider'
import { transactionBuilder } from './transactionBuilder'

const READ_DEADLINE_MS = 5_000

const isReadFailure = (error: unknown) => {
    const reason = normalizeWalletErrorCode(error)
    return reason === 'network_error' || reason === 'timeout' || reason === 'unsupported_method'
}

// Optional capability probes can fail without saying anything about the
// transaction. Preserve actionable wallet/session failures rather than retrying.
const isOptionalProbeFailure = (error: unknown) => {
    const reason = normalizeWalletErrorCode(error)
    return isReadFailure(error) || reason === 'internal_rpc_error' || reason === 'unknown_error'
}

// Bound the entire read phase, including wallets that never settle a read.
// Late read results must not publish an adjustment after we hand off to signing.
async function withReadDeadline<T>(read: (isActive: () => boolean) => Promise<T>): Promise<T> {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            read(() => active),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(Object.assign(new Error('Transfer preparation timed out'), { name: 'TimeoutError' })), READ_DEADLINE_MS)
            }),
        ])
    } finally {
        active = false
        clearTimeout(timer)
    }
}

export function createEvmTransfer(): TransferProvider {
    const supportsNetwork = (network: Parameters<TransferProvider['supportsNetwork']>[0]) =>
        network.type === NetworkType.EVM && !!network.token

    return {
        supportsNetwork,
        executeTransfer(params) {
            const config = getEvmConfig()
            const provider = createEVMTransferProvider(
                config,
                supportsNetwork,
                async (props, connector) => {
                    // Read against the requested chain, independent of the wallet's
                    // current chain and read-method support (notably WalletConnect).
                    const estimate = (client: PublicClient, isActive: () => boolean) =>
                        transactionBuilder({
                            ...props,
                            onFeeEstimate: fee => { if (isActive()) props.onFeeEstimate?.(fee) },
                        }, client)
                    try {
                        return await withReadDeadline(isActive => estimate(createPublicClient({
                            chain: resolveChain(props.network),
                            transport: resolveFallbackTransport(props.network.nodes, { retryCount: 0, timeoutMs: 1_500 }),
                        }), isActive))
                    } catch (error) {
                        if (!isReadFailure(error)) throw error
                    }
                    try {
                        return await withReadDeadline(async isActive => {
                            let provider: EIP1193Provider
                            let chainId: unknown
                            try {
                                provider = await connector.getProvider({ chainId: Number(props.network.chain_id) }) as EIP1193Provider
                                chainId = await provider.request({ method: 'eth_chainId' })
                            } catch (error) {
                                if (!isOptionalProbeFailure(error)) throw error
                                return transactionBuilder(props)
                            }
                            // Never use balances or fee estimates from another chain.
                            if (Number(chainId) !== Number(props.network.chain_id)) return transactionBuilder(props)
                            return estimate(createPublicClient({
                                chain: resolveChain(props.network),
                                transport: custom(provider, { retryCount: 0 }),
                            }), isActive)
                        })
                    } catch (error) {
                        if (!isReadFailure(error)) throw error
                        // Read availability must not prevent the wallet from preparing
                        // the chain-bound transaction itself. No guessed fee caps.
                        return transactionBuilder(props)
                    }
                },
            )
            return provider.executeTransfer(params)
        },
    }
}
