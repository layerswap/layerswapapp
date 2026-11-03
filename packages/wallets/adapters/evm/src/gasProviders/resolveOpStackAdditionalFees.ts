import type { Network } from '@layerswap/widget-types'
import { parseAbi, type PublicClient } from 'viem'
import { publicActionsL2 } from 'viem/op-stack'

const BASE_GAS_PRICE_ORACLE = '0x420000000000000000000000000000000000000F'
const operatorFeeAbi = parseAbi(['function getOperatorFee(uint256 gasUsed) view returns (uint256)'])

/** Fees outside gasLimit * maxFeePerGas, shared by quoting and submission. */
export async function resolveOpStackAdditionalFees({ publicClient, network, transaction, gasLimit }: {
    publicClient: PublicClient
    network: Network
    transaction: { account: `0x${string}`; to: `0x${string}`; data?: `0x${string}`; value?: bigint }
    gasLimit: bigint
}): Promise<bigint> {
    const isBase = Number(network.chain_id) === 8453
    const oracle = network.metadata?.evm_oracle_contract ?? (isBase ? BASE_GAS_PRICE_ORACLE : undefined)
    if (!oracle) return 0n

    const [l1Fee, operatorFee] = await Promise.all([
        // viem serializes this request itself. Passing serialized bytes as data
        // wraps a different transaction and loses the original transfer value.
        publicClient.extend(publicActionsL2()).estimateL1Fee({
            ...transaction,
            chain: publicClient.chain,
            gasPriceOracleAddress: oracle as `0x${string}`,
        }),
        // Ask the oracle rather than hard-coding Isthmus/Jovian fee formulas.
        // Base supports this getter; an RPC failure must not become a zero fee.
        isBase ? publicClient.readContract({
            address: oracle as `0x${string}`,
            abi: operatorFeeAbi,
            functionName: 'getOperatorFee',
            args: [gasLimit],
        }) : Promise.resolve(0n),
    ])
    return l1Fee + operatorFee
}
