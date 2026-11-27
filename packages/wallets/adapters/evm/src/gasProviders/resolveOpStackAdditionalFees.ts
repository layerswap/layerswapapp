import type { LayerswapNetwork } from '@layerswap/widget-types'
import { parseAbi, type PublicClient } from 'viem'
import { estimateL1Fee } from 'viem/op-stack'
import type { EVMGasPolicy } from './evmGasPolicies.js'

const operatorFeeAbi = parseAbi(['function getOperatorFee(uint256 gasUsed) view returns (uint256)'])
type OpStackTransaction = { account: `0x${string}`; to: `0x${string}`; data?: `0x${string}`; value?: bigint }

export type OpStackFees = { oracle: `0x${string}`; operatorFee: boolean }

/** The oracle comes from network metadata; the `opStack` policy only opts into the operator fee. */
export function resolveOpStackFees(network: LayerswapNetwork, policy: EVMGasPolicy): OpStackFees | undefined {
    const oracle = network.metadata?.evm_oracle_contract as `0x${string}` | undefined
    if (!oracle) {
        return undefined
    }

    return { oracle, operatorFee: !!policy.opStack?.operatorFee }
}

export async function resolveOpStackL1Fee({ publicClient, oracle, transaction }: {
    publicClient: PublicClient
    oracle: `0x${string}`
    transaction: OpStackTransaction
}): Promise<bigint> {
    // viem serializes the request itself; supply the original calldata and value.
    return estimateL1Fee(publicClient, {
        ...transaction,
        chain: publicClient.chain,
        gasPriceOracleAddress: oracle,
    })
}

export async function resolveOpStackOperatorFee({ publicClient, oracle, gasLimit }: {
    publicClient: PublicClient
    oracle: `0x${string}`
    gasLimit: bigint
}): Promise<bigint> {
    // The oracle handles Isthmus/Jovian formulas. RPC failures must not become zero fees.
    return publicClient.readContract({
        address: oracle,
        abi: operatorFeeAbi,
        functionName: 'getOperatorFee',
        args: [gasLimit],
    })
}
