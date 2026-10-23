import type { Network } from '@layerswap/widget-types'
import { createPublicClient, type Address, type Hex, type FeeValuesLegacy, type FeeValuesEIP1559, type PublicClient, parseGwei } from 'viem'
import { publicActionsL2 } from 'viem/op-stack'
import resolveChain from '../evmUtils/resolveChain'
import { resolveFallbackTransport } from '../evmUtils/resolveTransports'
import NetworkSettings from '../NetworkSettings'
import { normalizeWalletErrorCode, walletErrorDetails } from '@layerswap/wallet-core/errors'

type TransferFees = FeeValuesLegacy | FeeValuesEIP1559

export type TransferRequest = { account: Address; to: Address; data: Hex; value: bigint }

// Only retry without overrides when the RPC explicitly rejects that capability.
// Invalid calldata, reverts and transport failures must retain their meaning.
function rejectsStateOverride(error: unknown): boolean {
    const reason = normalizeWalletErrorCode(error)
    if (reason === 'contract_reverted' || reason === 'insufficient_funds' || reason === 'user_rejected') return false
    const { message } = walletErrorDetails(error)
    return /(?:state.?overrid|overrides?).{0,100}(?:unsupported|not supported|not available|not implemented)|(?:unsupported|does not support|not supported).{0,100}(?:state.?overrid|overrides?)|too many (?:arguments|params|parameters)|(?:want|expected|accepts?) (?:at most )?[12] (?:arguments|params|parameters)/i.test(message)
}

async function estimateExecutionGas(client: PublicClient, request: TransferRequest, fees: TransferFees, simulatedBalance: bigint): Promise<bigint> {
    try {
        // Change only the simulated sender balance. Preserve fee-sensitive EVM
        // execution and rollup gas accounting, including the real transfer value.
        return await client.estimateGas({
            ...request, ...fees,
            stateOverride: [{ address: request.account, balance: simulatedBalance }],
        })
    } catch (error) {
        if (!rejectsStateOverride(error)) throw error
        // Older RPCs can still estimate affordable transactions with real fees.
        // Never substitute zero fees/value or invent an estimate on failure.
        return client.estimateGas({ ...request, ...fees })
    }
}

/** Use one gas/fee policy for Max and the request ultimately sent to the wallet. */
export async function estimateTransferFee(network: Network, request: TransferRequest, readClient?: PublicClient): Promise<{ client: PublicClient; gas: bigint; fees: TransferFees; l1Fee: bigint; fee: bigint }> {
    const client: PublicClient = readClient ?? createPublicClient({
        chain: resolveChain(network),
        transport: resolveFallbackTransport(network.nodes),
    })
    const block = await client.getBlock({ blockTag: 'latest' })
    // Legacy networks do not support eth_maxPriorityFeePerGas.
    const fees: TransferFees = block.baseFeePerGas == null
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
    const [estimatedGas, l1Fee] = await Promise.all([
        // Cover up to twice the block gas limit without enormous balances
        // that can overflow rollup estimation internals.
        estimateExecutionGas(client, request, fees, request.value + feePerGas * (block.gasLimit ?? 30_000_000n) * 2n + 1n),
        network.metadata?.evm_oracle_contract
            ? client.extend(publicActionsL2()).estimateL1Fee({
                ...request,
                chain: client.chain,
                gasPriceOracleAddress: network.metadata.evm_oracle_contract as Address,
            })
            : Promise.resolve(0n),
    ])
    // Keep the original gas-unit estimate. Max already applies its 2% fee
    // reserve, and the chain's fee policy supplies its existing price multiplier.
    const gas = estimatedGas
    return { client, gas, fees, l1Fee, fee: gas * feePerGas + l1Fee }
}
