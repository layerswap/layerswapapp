import { PublicClient, encodeFunctionData } from "viem";
import { erc20ABI } from "wagmi";
import { NetworkCurrency } from "../../../Models/CryptoNetwork";
import { Layer } from "../../../Models/Layer";
import { Gas } from "../../../Models/Balance";

export default abstract class getEVMGas {

    protected publicClient: PublicClient
    protected chainId: number
    protected contract_address: `0x${string}`
    protected account: `0x${string}`
    protected from: Layer
    protected currency: NetworkCurrency
    protected destination: `0x${string}`
    protected nativeToken: NetworkCurrency
    protected isSweeplessTx: boolean
    constructor(
        publicClient: PublicClient,
        chainId: number,
        contract_address: `0x${string}`,
        account: `0x${string}`,
        from: Layer,
        currency: NetworkCurrency,
        destination: `0x${string}`,
        nativeToken: NetworkCurrency,
        isSweeplessTx: boolean
    ) {
        this.publicClient = publicClient
        this.chainId = chainId
        this.contract_address = contract_address
        this.account = account
        this.from = from
        this.currency = currency
        this.destination = destination
        this.nativeToken = nativeToken
        this.isSweeplessTx = isSweeplessTx
    }

    abstract resolveGas(): Promise<Gas | unknown> | undefined

    protected async resolveFeeData() {

        let gasPrice = await this.getGasPrice();
        let feesPerGas = await this.estimateFeesPerGas()
        let maxPriorityFeePerGas = await this.estimateMaxPriorityFeePerGas()

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
            //TODO: log the error to our logging service
            console.log(e)
        }
    }
    private async estimateFeesPerGas() {
        try {
            return await this.publicClient.estimateFeesPerGas()

        } catch (e) {
            //TODO: log the error to our logging service
            console.log(e)
        }
    }
    private async estimateMaxPriorityFeePerGas() {
        try {
            return await this.publicClient.estimateMaxPriorityFeePerGas()

        } catch (e) {
            //TODO: log the error to our logging service
            console.log(e)
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
            abi: erc20ABI,
            functionName: "transfer",
            args: [this.destination, BigInt(1000)]
        })

        if (encodedData && this.isSweeplessTx) {
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
        const hexed_sequence_number = (99999999).toString(16)
        const sequence_number_even = hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number
        return `${txData}${sequence_number_even}` as `0x${string}`;
    }

}