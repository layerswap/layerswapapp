import type { Network } from '@layerswap/widget-types'
import { parseAbi, type PublicClient } from 'viem'
import { estimateL1Fee } from 'viem/op-stack'
import { resolveEVMGasPolicy } from './evmGasPolicies.js'

const operatorFeeAbi = parseAbi(['function getOperatorFee(uint256 gasUsed) view returns (uint256)'])
type OpStackTransaction = { account: `0x${string}`; to: `0x${string}`; data?: `0x${string}`; value?: bigint }
type OpStackFeeContext = { publicClient: PublicClient; network: Network }

function resolveOracle(network: Network) {
    const policy = resolveEVMGasPolicy(Number(network.chain_id))
    return network.metadata?.evm_oracle_contract || policy.opStack?.gasPriceOracle
}

/** This fee depends on the payload, not the execution estimate, so start it early. */
export async function resolveOpStackL1Fee({ publicClient, network, transaction }: OpStackFeeContext & {
    transaction: OpStackTransaction
}): Promise<bigint> {
    const oracle = resolveOracle(network)
    if (!oracle) return 0n
    // viem serializes the request itself; supply the original calldata and value.
    return estimateL1Fee(publicClient, {
        ...transaction,
        chain: publicClient.chain,
        gasPriceOracleAddress: oracle as `0x${string}`,
    })
}

export async function resolveOpStackOperatorFee({ publicClient, network, gasLimit }: OpStackFeeContext & {
    gasLimit: bigint
}): Promise<bigint> {
    const policy = resolveEVMGasPolicy(Number(network.chain_id))
    const oracle = resolveOracle(network)
    if (!policy.opStack?.operatorFee || !oracle) return 0n
    // The oracle handles Isthmus/Jovian formulas. RPC failures must not become zero fees.
    return publicClient.readContract({
        address: oracle as `0x${string}`,
        abi: operatorFeeAbi,
        functionName: 'getOperatorFee',
        args: [gasLimit],
    })
}

/** Fees outside gasLimit * maxFeePerGas, shared by quoting and submission. */
export async function resolveOpStackAdditionalFees(args: OpStackFeeContext & {
    transaction: OpStackTransaction
    gasLimit: bigint
}): Promise<bigint> {
    const [l1Fee, operatorFee] = await Promise.all([
        resolveOpStackL1Fee(args),
        resolveOpStackOperatorFee(args),
    ])
    return l1Fee + operatorFee
}
