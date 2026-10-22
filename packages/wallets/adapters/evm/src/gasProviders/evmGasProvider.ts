import { NetworkType } from '@layerswap/widget-types';
import { Network, Token } from "@layerswap/widget-types";
import { GasProvider, GasProps } from "@layerswap/widget-types";
import { PublicClient, TransactionSerializedEIP1559, createPublicClient, encodeFunctionData, serializeTransaction, formatUnits, erc20Abi } from "viem";
import { publicActionsL2 } from 'viem/op-stack'
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

            const getGas = network?.metadata?.evm_oracle_contract ? getOptimismGas : getEthereumGas

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

    chain = resolveChain(this.from)

    client: any = createPublicClient({
        chain: this.chain,
        transport: resolveFallbackTransport(this.from.nodes?.length > 0 ? this.from.nodes : [this.from.node_url]),
    }).extend(publicActionsL2())

    resolveGas = async () => {
        const feeData = await this.resolveFeeData()

        const estimatedGasLimit = await this.estimateGasLimit()

        const multiplier = feeData.maxFeePerGas || feeData.gasPrice

        if (!multiplier || !feeData.gasPrice)
            return undefined

        const l1OpFee = await this.GetOpL1Fee(feeData.gasPrice)

        let totalGas = (multiplier * estimatedGasLimit) + l1OpFee

        const formattedGas = Number(formatUnits(BigInt(totalGas), this.nativeToken?.decimals))
        return { gas: formattedGas }
    }

    private GetOpL1Fee = async (gasPrice: bigint): Promise<bigint> => {
        const amount = BigInt(1000000000000)
        let serializedTransaction: TransactionSerializedEIP1559

        if (this.transaction) {
            serializedTransaction = serializeTransaction({
                ...this.transaction,
                type: 'eip1559',
            }) as TransactionSerializedEIP1559
        }
        else if (this.contract_address) {
            let encodedData = encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [this.destination, amount]
            })

            if (encodedData) {
                encodedData = this.constructSweeplessTxData(encodedData)
            }

            serializedTransaction = serializeTransaction({
                client: this.client,
                abi: erc20Abi,
                functionName: "transfer",
                chainId: this.chainId,
                args: [this.destination, amount],
                to: this.contract_address,
                data: encodedData,
                type: 'eip1559',
            }) as TransactionSerializedEIP1559
        }
        else {
            serializedTransaction = serializeTransaction({
                client: this.client,
                chainId: this.chainId,
                to: this.destination,
                data: this.constructSweeplessTxData(),
                type: 'eip1559',
            }) as TransactionSerializedEIP1559
        }

        const fee = await this.client.estimateL1Fee({
            data: serializedTransaction,
            to: this.destination,
            account: this.account,
            gasPriceOracleAddress: this.from.metadata?.evm_oracle_contract as `0x${string}`,
            gasPrice: gasPrice as any
        })

        return fee;
    }

}
