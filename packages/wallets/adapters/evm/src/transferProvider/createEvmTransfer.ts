import { createPublicClient, custom, type EIP1193Provider } from 'viem'
import resolveChain from '../evmUtils/resolveChain'
import { resolveWalletConnector } from '../service/resolveWalletConnector'
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
                async props => {
                    const connector = resolveWalletConnector(config, props.selectedWallet)
                    const walletProvider = await connector.getProvider({ chainId: Number(props.network.chain_id) })
                    const client = createPublicClient({
                        chain: resolveChain(props.network),
                        transport: custom(walletProvider as EIP1193Provider),
                    })
                    return transactionBuilder(props, client)
                },
            )
            return provider.executeTransfer(params)
        },
    }
}
