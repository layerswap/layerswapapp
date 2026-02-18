
import { GasProps } from "../../../Models/Balance"
import { NetworkType, Network, Token } from "../../../Models/Network"
import { GasProvider } from "./types"
import { PublicClient, TransactionSerializedEIP1559, createPublicClient, encodeFunctionData, parseEther, serializeTransaction } from "viem";
import { erc20Abi } from "viem";
import { formatUnits } from "viem";
import { publicActionsL2 } from 'viem/op-stack'
import resolveChain from "../../resolveChain";
import { resolveFallbackTransport } from "../../resolveTransports";
import posthog from "posthog-js";

export class EVMGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.EVM && !!network.token
    }

    getGas = async ({ address, network, token, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe' }: GasProps) => {

        const chainId = Number(network?.chain_id)

        if (!network || !address || !chainId || !recipientAddress || !network.token) {
            return
        }

        const contract_address = token.contract as `0x${string}`

        try {

            const { createPublicClient } = await import("viem")
            const resolveNetworkChain = (await import("../../resolveChain")).default
            const publicClient = createPublicClient({
                chain: resolveNetworkChain(network),
                transport: resolveFallbackTransport(network.nodes),
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
                    destination: recipientAddress as `0x${string}`,
                    nativeToken: network.token
                }
            )

            const gas = await gasProvider.resolveGas()

            if (gas) {
                return { gas, token: network.token }
            }
        }
        catch (e) {
            console.log(e)
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
        }: {
            publicClient: PublicClient,
            chainId: number,
            contract_address: `0x${string}`,
            account: `0x${string}`,
            from: Network,
            currency: Token,
            destination: `0x${string}`,
            nativeToken: Token,
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
    }

    abstract resolveGas(): Promise<number | undefined>

    protected async resolveFeeData() {

        const [gasPrice, feesPerGas] = await Promise.all([
            this.getGasPrice(),
            this.estimateFeesPerGas()
        ]);

        let maxPriorityFeePerGas = feesPerGas?.maxPriorityFeePerGas
        if (!maxPriorityFeePerGas) maxPriorityFeePerGas = await this.estimateMaxPriorityFeePerGas()

        return {
            gasPrice,
            maxFeePerGas: feesPerGas?.maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas
        }

    }

    private async getGasPrice() {
        try {
            return await this.publicClient.getGasPrice()

        } catch (e) {
            const error = new Error(e)
            error.cause = e
            posthog.captureException(error, {
                $layerswap_exception_type: "Gas Price Error"
            })
        }
    }
    private async estimateFeesPerGas() {
        try {
            return await this.publicClient.estimateFeesPerGas()

        } catch (e) {
            const error = new Error(e)
            error.cause = e
            posthog.captureException(error, {
                $layerswap_exception_type: "Fees Per Gas Error"
            })
        }
    }
    private async estimateMaxPriorityFeePerGas() {
        try {
            return await this.publicClient.estimateMaxPriorityFeePerGas()
        } catch (e) {
            const error = new Error(e)
            error.cause = e
            posthog.captureException(error, {
                $layerswap_exception_type: "Max Priority Fee Per Gas Error"
            })
        }
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
        const [feeData, estimatedGasLimit] = await Promise.all([
            this.resolveFeeData(),
            this.contract_address
                ? this.estimateERC20GasLimit()
                : this.estimateNativeGasLimit()
        ])

        const multiplier = feeData.maxFeePerGas || feeData.gasPrice

        if (!multiplier)
            return undefined

        const totalGas = multiplier * estimatedGasLimit

        const formattedGas = Number(formatUnits(BigInt(totalGas), this.nativeToken?.decimals))
        return formattedGas
    }

}


export default class getOptimismGas extends getEVMGas {

    chain = resolveChain(this.from)
    client = createPublicClient({
        chain: this.chain,
        transport: resolveFallbackTransport(this.from.nodes),
    }).extend(publicActionsL2())

    resolveGas = async () => {
        const feeData = await this.resolveFeeData()

        const estimatedGasLimit = this.contract_address ?
            await this.estimateERC20GasLimit()
            : await this.estimateNativeGasLimit()

        const multiplier = feeData.maxFeePerGas || feeData.gasPrice

        if (!multiplier || !feeData.gasPrice)
            return undefined

        const l1OpFee = await this.GetOpL1Fee(feeData.gasPrice)

        let totalGas = (multiplier * estimatedGasLimit) + l1OpFee

        const formattedGas = Number(formatUnits(BigInt(totalGas), this.nativeToken?.decimals))
        return formattedGas
    }

    private GetOpL1Fee = async (gasPrice: bigint): Promise<bigint> => {
        const amount = BigInt(1000000000000)
        let serializedTransaction: TransactionSerializedEIP1559

        if (this.contract_address) {
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