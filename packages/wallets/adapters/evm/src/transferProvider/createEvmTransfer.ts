import { createPublicClient, custom, type EIP1193Provider } from 'viem'
import { normalizeWalletErrorCode } from '@layerswap/wallet-core/errors'
import resolveChain from '../evmUtils/resolveChain'
import { resolveFallbackTransport } from '../evmUtils/resolveTransports'
import { NetworkType } from '@layerswap/widget-types';
import type { TransferProvider } from "@layerswap/widget-types";
import { getEvmConfig } from '../service/getEvmConfig'
import { createEVMTransferProvider } from './createEVMTransferProvider'
import { transactionBuilder } from './transactionBuilder'

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
                    const client = createPublicClient({
                        chain: resolveChain(props.network),
                        transport: resolveFallbackTransport(props.network.nodes),
                    })
                    try {
                        return await transactionBuilder(props, client)
                    } catch (error) {
                        const reason = normalizeWalletErrorCode(error)
                        if (reason !== 'network_error' && reason !== 'timeout' && reason !== 'unsupported_method') throw error
                        // The app RPC need not be a new single point of failure.
                        // Only consult the wallet for reads after a transport failure,
                        // and never use its current-chain data for a different chain.
                        const provider = await connector.getProvider({ chainId: Number(props.network.chain_id) }) as EIP1193Provider
                        const chainId = await provider.request({ method: 'eth_chainId' })
                        if (Number(chainId) !== Number(props.network.chain_id)) throw error
                        return transactionBuilder(props, createPublicClient({
                            chain: resolveChain(props.network),
                            transport: custom(provider),
                        }))
                    }
                },
            )
            return provider.executeTransfer(params)
        },
    }
}
