import type { Network } from '@layerswap/widget-types'
import { createPublicClient, type Address, type Hex, type FeeValues, type PublicClient, parseGwei } from 'viem'
import { publicActionsL2 } from 'viem/op-stack'
import resolveChain from '../evmUtils/resolveChain'
import { resolveFallbackTransport } from '../evmUtils/resolveTransports'
import NetworkSettings from '../NetworkSettings'

export type TransferRequest = { account: Address; to: Address; data: Hex; value: bigint }

/** Use one gas/fee policy for Max and the request ultimately sent to the wallet. */
export async function estimateTransferFee(network: Network, request: TransferRequest, walletClient?: PublicClient): Promise<{ client: PublicClient; gas: bigint; fees: FeeValues; l1Fee: bigint; fee: bigint }> {
    const client: PublicClient = walletClient ?? createPublicClient({
        chain: resolveChain(network),
        transport: resolveFallbackTransport(network.nodes),
    })
    const block = await client.getBlock({ blockTag: 'latest' })
    // Legacy networks do not support eth_maxPriorityFeePerGas.
    const fees: FeeValues = block.baseFeePerGas == null
        ? { gasPrice: await client.getGasPrice() }
        : await client.estimateFeesPerGas()
    const minimum = NetworkSettings.KnownSettings[network.name]?.MinPriorityFeePerGasInGwei
    if ('maxPriorityFeePerGas' in fees && fees.maxPriorityFeePerGas != null && minimum) {
        const floor = parseGwei(String(minimum))
        if (fees.maxPriorityFeePerGas < floor) {
            fees.maxFeePerGas += floor - fees.maxPriorityFeePerGas
            fees.maxPriorityFeePerGas = floor
        }
    }
    const feePerGas = fees.maxFeePerGas ?? fees.gasPrice
    if (feePerGas == null) throw new Error('Network fee unavailable')
    const [gas, l1Fee] = await Promise.all([
        client.estimateGas({ ...request, ...fees }),
        network.metadata?.evm_oracle_contract
            ? client.extend(publicActionsL2()).estimateL1Fee({
                ...request,
                chain: client.chain,
                gasPriceOracleAddress: network.metadata.evm_oracle_contract as Address,
            })
            : Promise.resolve(0n),
    ])
    return { client, gas, fees, l1Fee, fee: gas * feePerGas + l1Fee }
}
