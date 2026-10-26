import { NetworkType } from '@layerswap/widget-types';
import { Network, Token } from "@layerswap/widget-types";
import { GasProvider, GasProps } from "@layerswap/widget-types";
import { PublicClient, createPublicClient, encodeFunctionData, formatUnits, erc20Abi } from "viem";
import { publicActionsL2 } from 'viem/op-stack'
import resolveChain from "../evmUtils/resolveChain";
import NetworkSettings from "../NetworkSettings";
import { ErrorHandler } from "@layerswap/widget-types";
import { resolveFallbackTransport } from "../evmUtils/resolveTransports";
import { calculateGasFeeAmounts, resolveAccountBalanceReserve } from "./evmGasMath";
import { resolveEVMGasPolicy } from "./evmGasPolicies";
import { resolveEVMFeeData } from "./resolveEVMFeeData";
import { resolveEVMTransactionRequest } from "../transferProvider/resolveEVMTransactionRequest";

type TransferRequest = ReturnType<typeof resolveEVMTransactionRequest>

/**
 * Stand-ins for the parts of a deposit that only exist once the swap is created.
 * The recipient is an externally owned account, so value does not change its
 * execution gas. The memo is the longest sequence number a deposit can carry.
 */
const REPRESENTATIVE_RECIPIENT = '0x2fc617e933a52713247ce25730f6695920b3befe' as const
const REPRESENTATIVE_MEMO = (() => {
    const hex = (99999999999999999999999999999999999999999999999999999999999999999999999999999n).toString(16)
    return hex.length % 2 ? `0${hex}` : hex
})()

/** The transfer the wallet will sign, or the closest stand-in before the deposit action exists. */
const resolveTransferRequest = ({ network, token, account, amount, amountInBaseUnits, recipientAddress, callData }: {
    network: Network, token: Token, account: `0x${string}`, amount: number | undefined, amountInBaseUnits?: string,
    recipientAddress?: string, callData?: string,
}): { request: TransferRequest, exact: boolean } => {
    if (recipientAddress != null && callData != null && amount != null) {
        return {
            exact: true,
            request: resolveEVMTransactionRequest({ network, token, amount, amountInBaseUnits, callData, depositAddress: recipientAddress, account }),
        }
    }
    const callDataWithMemo = token.contract
        ? `${encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [REPRESENTATIVE_RECIPIENT, 1000n] })}${REPRESENTATIVE_MEMO}`
        : `0x${REPRESENTATIVE_MEMO}`
    return {
        exact: false,
        request: resolveEVMTransactionRequest({
            network, token, amount: amount ?? 0, callData: callDataWithMemo, account,
            depositAddress: token.contract ? token.contract : REPRESENTATIVE_RECIPIENT,
        }),
    }
}

const estimateGasLimit = async (publicClient: PublicClient, request: TransferRequest, exact: boolean, accountBalanceReserve: bigint) => {
    // A stand-in recipient cannot be funded for an unknown fee; its execution gas does not depend on the value.
    if (!exact) return publicClient.estimateGas({ ...request, value: 0n })

    if (request.value > 0n && accountBalanceReserve > 0n) {
        const balance = await publicClient.getBalance({ address: request.account })
        const minimumBalance = request.value + accountBalanceReserve
        if (balance < minimumBalance) {
            // Quote the exact call even when its value would violate the reserve.
            // Submission still estimates against the account's actual balance.
            return publicClient.estimateGas({
                ...request,
                stateOverride: [{ address: request.account, balance: minimumBalance }],
            })
        }
    }
    return publicClient.estimateGas(request)
}

/** The rollup's data-posting fee for this payload; zero on chains without a fee oracle. */
const estimateDataPostingFee = async (publicClient: PublicClient, network: Network, request: TransferRequest): Promise<bigint> => {
    const gasPriceOracleAddress = network.metadata?.evm_oracle_contract as `0x${string}` | undefined
    if (!gasPriceOracleAddress) return 0n
    const { to, value, data, account } = request
    return publicClient.extend(publicActionsL2()).estimateL1Fee({ to, value, data, account, gasPriceOracleAddress, chain: publicClient.chain })
}

/**
 * Quote the fee of the transfer the wallet will sign. `gas` is the expected
 * cost; `maxFee` is the ceiling Max reserves, which follows the chain's gas
 * policy (the gas-limit margin wallets sign and the fee cap) and includes the
 * rollup data fee; `reserve` is what the chain requires to stay in the account.
 */
export const quoteTransferFee = async (publicClient: PublicClient, network: Network, request: TransferRequest, exact: boolean) => {
    const policy = resolveEVMGasPolicy(request.chainId)
    const accountReserve = policy.accountBalanceReserve
        ? publicClient.getCode({ address: request.account }).then(accountCode => resolveAccountBalanceReserve({ policy, accountCode }))
        : Promise.resolve(0n)
    const [feeData, accountBalanceReserve, estimatedGas] = await Promise.all([
        resolveEVMFeeData(publicClient, network),
        accountReserve,
        accountReserve.then(reserve => estimateGasLimit(publicClient, request, exact, reserve)),
    ])
    const feeAmounts = calculateGasFeeAmounts({
        policy, estimatedGas, gasPrice: feeData.gasPrice, maxFeePerGas: feeData.maxFeePerGas,
    })
    if (!feeAmounts) return undefined
    const dataPostingFee = await estimateDataPostingFee(publicClient, network, request)
    return {
        estimatedFee: feeAmounts.estimatedFee + dataPostingFee,
        maximumFee: feeAmounts.maximumFee + dataPostingFee,
        accountBalanceReserve,
    }
}

export class EVMGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.EVM && !!network.token
    }

    getGas = async ({ address, network, token, recipientAddress, callData, amount, amountInBaseUnits }: GasProps) => {
        const nativeToken = network?.token
        if (!network || !address || !Number(network.chain_id) || !nativeToken) return

        try {
            const publicClient = createPublicClient({
                chain: resolveChain(network),
                transport: resolveFallbackTransport(network.nodes?.length > 0 ? network.nodes : [network.node_url]),
            })
            const { request, exact } = resolveTransferRequest({
                network, token, account: address as `0x${string}`, amount, amountInBaseUnits, recipientAddress, callData,
            })
            const quote = await quoteTransferFee(publicClient, network, request, exact)
            if (!quote) return

            const decimals = NetworkSettings.KnownSettings[network.name]?.FeeParsingDecimalPlaces || nativeToken.decimals
            const reserve = Number(formatUnits(quote.accountBalanceReserve, decimals))
            return {
                gas: Number(formatUnits(quote.estimatedFee, decimals)),
                maxFee: Number(formatUnits(quote.maximumFee, decimals)),
                ...(reserve > 0 ? { reserve } : {}),
                token: nativeToken,
            }
        }
        catch (e) {
            const error = e as Error;
            ErrorHandler({
                type: "GasProviderError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
    }
}
