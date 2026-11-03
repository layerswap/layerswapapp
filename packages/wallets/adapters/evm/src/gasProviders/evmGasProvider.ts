import { NetworkType } from '@layerswap/widget-types';
import { Network, Token } from "@layerswap/widget-types";
import { GasProvider, GasProps } from "@layerswap/widget-types";
import { PublicClient, createPublicClient, encodeFunctionData, formatUnits, erc20Abi, parseUnits } from "viem";
import { resolveOpStackAdditionalFees } from './resolveOpStackAdditionalFees'
import resolveChain from "../evmUtils/resolveChain";
import NetworkSettings from "../NetworkSettings";
import { ErrorHandler } from "@layerswap/widget-types";
import { resolveFallbackTransport } from "../evmUtils/resolveTransports";
import { calculateGasFeeAmounts, resolveAccountBalanceReserve } from "./evmGasMath";
import { resolveEVMGasPolicy } from "./evmGasPolicies";
import { resolveEVMFeeData } from "./resolveEVMFeeData";
import { resolveEVMTransactionRequest } from "../transferProvider/resolveEVMTransactionRequest";

type GasTransaction = ReturnType<typeof resolveEVMTransactionRequest>

type ResolvedGas = {
    gas: number
    maxFee?: number
    reserve?: number
}

export class EVMGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.EVM && !!network.token
    }

    getGas = async ({ address, network, token, recipientAddress, callData, amount, amountInBaseUnits }: GasProps) => {

        const chainId = Number(network?.chain_id)
        const destination = recipientAddress ?? '0x2fc617e933a52713247ce25730f6695920b3befe'

        if (!network || !address || !chainId || !destination || !network.token) {
            return
        }

        const contract_address = token.contract as `0x${string}`

        try {

            const publicClient = createPublicClient({
                chain: resolveChain(network),
                transport: resolveFallbackTransport(network.nodes?.length > 0 ? network.nodes : [network.node_url]),
            })

            const getGas = (chainId === 8453 || network?.metadata?.evm_oracle_contract) ? getOptimismGas : getEthereumGas

            let nativeValue = 0n
            if (!token.contract && amountInBaseUnits != null) {
                nativeValue = BigInt(amountInBaseUnits)
            } else if (!token.contract && amount != null) {
                // toFixed keeps small amounts out of scientific notation.
                nativeValue = parseUnits(Number(amount).toFixed(token.decimals), token.decimals)
            }

            const gasProvider = new getGas(
                {
                    publicClient,
                    chainId,
                    contract_address,
                    account: address as `0x${string}`,
                    from: network,
                    currency: token,
                    destination: destination as `0x${string}`,
                    nativeToken: network.token,
                    nativeValue,
                    transaction: recipientAddress != null && callData != null && amount != null ? resolveEVMTransactionRequest({
                        network, token, amount, amountInBaseUnits, callData,
                        depositAddress: recipientAddress,
                        account: address as `0x${string}`,
                    }) : undefined,
                }
            )

            const resolvedGas = await gasProvider.resolveGas()

            if (resolvedGas) {
                return { ...resolvedGas, token: network.token }
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


abstract class getEVMGas {

    protected publicClient: PublicClient
    protected chainId: number
    protected contract_address: `0x${string}`
    protected account: `0x${string}`
    protected from: Network
    protected currency: Token
    protected destination: `0x${string}`
    protected nativeToken: Token
    protected nativeValue: bigint
    protected transaction?: GasTransaction
    constructor(
        {
            publicClient,
            chainId,
            contract_address,
            account,
            from,
            currency,
            destination,
            nativeToken,
            nativeValue,
            transaction,
        }: {
            publicClient: PublicClient,
            chainId: number,
            contract_address: `0x${string}`,
            account: `0x${string}`,
            from: Network,
            currency: Token,
            destination: `0x${string}`,
            nativeToken: Token,
            nativeValue: bigint,
            transaction?: GasTransaction,
        }
    ) {
        this.publicClient = publicClient
        this.chainId = chainId
        this.contract_address = contract_address
        this.account = account
        this.from = from
        this.currency = currency
        this.destination = destination
        this.nativeToken = nativeToken
        this.nativeValue = nativeValue
        this.transaction = transaction
    }

    abstract resolveGas(): Promise<ResolvedGas | undefined>

    protected async resolveFeeData() {
        return resolveEVMFeeData(this.publicClient, this.from)
    }

    protected async estimateGasLimit(accountBalanceReserve = 0n) {
        if (!this.transaction) {
            return this.contract_address ? this.estimateERC20GasLimit() : this.estimateNativeGasLimit()
        }

        if (this.transaction.value > 0n && accountBalanceReserve > 0n) {
            const balance = await this.publicClient.getBalance({ address: this.account })
            const minimumBalance = this.transaction.value + accountBalanceReserve
            if (balance < minimumBalance) {
                // Quote the exact call even when its value would violate the reserve.
                // Submission still estimates against the account's actual balance.
                return this.publicClient.estimateGas({
                    ...this.transaction,
                    stateOverride: [{ address: this.account, balance: minimumBalance }],
                })
            }
        }

        return this.publicClient.estimateGas(this.transaction)
    }

    protected async estimateNativeGasLimit() {
        const to = this.destination;
        const gasEstimate = await this.publicClient.estimateGas({
            account: this.account,
            to: to,
            data: this.constructSweeplessTxData(),
        })

        return gasEstimate
    }

    protected async estimateERC20GasLimit() {
        let encodedData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [this.destination, BigInt(1000)]
        })

        if (encodedData) {
            encodedData = this.constructSweeplessTxData(encodedData)
        }

        const estimatedERC20GasLimit = await this.publicClient.estimateGas({
            data: encodedData,
            to: this.contract_address,
            account: this.account
        });

        return estimatedERC20GasLimit
    }

    protected constructSweeplessTxData = (txData: string = "0x") => {
        const hexed_sequence_number = (99999999999999999999999999999999999999999999999999999999999999999999999999999n).toString(16)
        const sequence_number_even = hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number
        return `${txData}${sequence_number_even}` as `0x${string}`;
    }

}

class getEthereumGas extends getEVMGas {
    resolveGas = async () => {
        const policy = resolveEVMGasPolicy(this.chainId)
        const accountReserve = policy.accountBalanceReserve
            ? this.publicClient.getCode({ address: this.account }).then(accountCode =>
                resolveAccountBalanceReserve({ policy, accountCode }))
            : Promise.resolve(0n)
        const [feeData, estimatedGasLimit, accountBalanceReserve] = await Promise.all([
            this.resolveFeeData(),
            this.transaction && this.transaction.value > 0n && policy.accountBalanceReserve
                ? accountReserve.then(reserve => this.estimateGasLimit(reserve))
                : this.estimateGasLimit(),
            accountReserve,
        ])

        const feeAmounts = calculateGasFeeAmounts({
            policy,
            estimatedGas: estimatedGasLimit,
            gasPrice: feeData.gasPrice,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        })

        if (!feeAmounts)
            return undefined

        const decimals = NetworkSettings.KnownSettings[this.from.name]?.FeeParsingDecimalPlaces || this.nativeToken?.decimals
        const gas = Number(formatUnits(feeAmounts.estimatedFee, decimals))
        const maxFee = Number(formatUnits(feeAmounts.maximumFee, decimals))
        const reserve = Number(formatUnits(accountBalanceReserve, decimals))

        return {
            gas,
            ...(policy.reserveMaximumFee ? { maxFee } : {}),
            ...(reserve > 0 ? { reserve } : {}),
        }
    }

}


export default class getOptimismGas extends getEVMGas {
    resolveGas = async () => {
        const policy = resolveEVMGasPolicy(this.chainId)
        const [feeData, estimatedGas] = await Promise.all([
            this.resolveFeeData(),
            this.estimateGasLimit(),
        ])
        const feeAmounts = calculateGasFeeAmounts({ policy, estimatedGas, ...feeData })
        if (!feeAmounts) return undefined

        const transaction = this.transaction ?? {
            account: this.account,
            to: this.contract_address || this.destination,
            value: this.contract_address ? 0n : this.nativeValue,
            data: this.constructSweeplessTxData(this.contract_address ? encodeFunctionData({
                abi: erc20Abi,
                functionName: 'transfer',
                args: [this.destination, 1000n],
            }) : '0x'),
        }
        const additionalFees = await resolveOpStackAdditionalFees({
            publicClient: this.publicClient,
            network: this.from,
            transaction,
            gasLimit: feeAmounts.gasLimit,
        })
        const gas = Number(formatUnits(feeAmounts.estimatedFee + additionalFees, this.nativeToken.decimals))
        const maxFee = Number(formatUnits(feeAmounts.maximumFee + additionalFees, this.nativeToken.decimals))
        return { gas, ...(policy.reserveMaximumFee ? { maxFee } : {}) }
    }
}
