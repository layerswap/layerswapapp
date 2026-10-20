import { ErrorHandler, NetworkType, type GasProvider, type GasProps, type Network } from '@layerswap/widget-types'
import { encodeFunctionData, erc20Abi, formatUnits, parseUnits, type Address, type Hex } from 'viem'
import NetworkSettings from '../NetworkSettings'
import { estimateTransferFee } from './estimateTransferFee'

export class EVMGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.EVM && !!network.token
    }

    getGas = async ({ address, network, token, amount, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe' }: GasProps) => {
        if (!network?.token || !address || !network.chain_id) return
        try {
            // Before creation the backend memo/target are unavailable. Reserve for a
            // full 32-byte nonzero sequence, then validate the actual action at send.
            const memo = 'ff'.repeat(32)
            const data = token.contract
                ? `${encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [recipientAddress as Address, parseUnits((amount ?? 0).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: token.decimals }), token.decimals)] })}${memo}` as Hex
                : `0x${memo}` as Hex
            const estimate = await estimateTransferFee(network, {
                account: address as Address,
                to: (token.contract || recipientAddress) as Address,
                data,
                // Max probes the full balance: including value here makes the RPC
                // reject the probe before we can subtract fees. Send validates value.
                value: 0n,
            })
            const decimals = NetworkSettings.KnownSettings[network.name]?.FeeParsingDecimalPlaces ?? network.token.decimals
            return { gas: Number(formatUnits(estimate.fee, decimals)), token: network.token }
        } catch (cause) {
            const error = cause as Error
            ErrorHandler({ type: 'GasProviderError', message: error.message, name: error.name, stack: error.stack, cause })
        }
    }
}
