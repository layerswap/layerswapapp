import { erc20ABI } from 'wagmi';
import { encodeFunctionData, PublicClient, formatGwei, serializeTransaction, TransactionSerializedEIP1559 } from 'viem'
import { Layer, NetworkAsset } from '../../../Models/Layer';
import { Currency } from '../../../Models/Currency';
import { getL1Fee } from '../../optimism/estimateFees';
import NetworkSettings, { GasCalculation } from '../../NetworkSettings';
import formatAmount from '../../formatAmount';

type ResolveGasArguments = {
    publicClient: PublicClient,
    chainId: number,
    contract_address: `0x${string}`,
    account: `0x${string}`,
    from: Layer & { isExchange: false },
    currency: Currency,
    destination: `0x${string}`
    nativeToken: NetworkAsset,
    isSweeplessTx: boolean
}

export const resolveFeeData = async (publicClient: PublicClient) => {

    let gasPrice = await getGasPrice(publicClient);
    let feesPerGas = await estimateFeesPerGas(publicClient)
    let maxPriorityFeePerGas = await estimateMaxPriorityFeePerGas(publicClient)

    return {
        gasPrice,
        maxFeePerGas: feesPerGas?.maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas
    }
}

const getGasPrice = async (publicClient: PublicClient) => {
    try {
        return await publicClient.getGasPrice()

    } catch (e) {
        //TODO: log the error to our logging service
        console.log(e)
    }
}
const estimateFeesPerGas = async (publicClient: PublicClient) => {
    try {
        return await publicClient.estimateFeesPerGas()

    } catch (e) {
        //TODO: log the error to our logging service
        console.log(e)
    }
}
const estimateMaxPriorityFeePerGas = async (publicClient: PublicClient) => {
    try {
        return await publicClient.estimateMaxPriorityFeePerGas()

    } catch (e) {
        //TODO: log the error to our logging service
        console.log(e)
    }
}

export const estimateNativeGasLimit = async ({ publicClient, account, destination }: ResolveGasArguments) => {
    const to = destination;
    const gasEstimate = await publicClient.estimateGas({
        account: account,
        to: to,
        data: constructSweeplessTxData(),
    })

    return gasEstimate
}

export const estimateERC20GasLimit = async ({ publicClient, contract_address, account, destination, isSweeplessTx }: ResolveGasArguments) => {
    let encodedData = encodeFunctionData({
        abi: erc20ABI,
        functionName: "transfer",
        args: [destination, BigInt(1000)]
    })

    if (encodedData && isSweeplessTx) {
        encodedData = constructSweeplessTxData(encodedData)
    }

    const estimatedERC20GasLimit = await publicClient.estimateGas({
        data: encodedData,
        to: contract_address,
        account
    });

    return estimatedERC20GasLimit
}

const GetOpL1Fee = async ({ publicClient, chainId, destination, contract_address, isSweeplessTx }: ResolveGasArguments): Promise<bigint> => {
    const amount = BigInt(1000)
    let serializedTransaction: TransactionSerializedEIP1559

    if (contract_address) {
        let encodedData = encodeFunctionData({
            abi: erc20ABI,
            functionName: "transfer",
            args: [destination, amount]
        })

        if (encodedData && isSweeplessTx) {
            encodedData = constructSweeplessTxData(encodedData)
        }

        serializedTransaction = serializeTransaction({
            client: publicClient,
            abi: erc20ABI,
            functionName: "transfer",
            chainId: chainId,
            args: [destination, amount],
            to: contract_address,
            data: encodedData,
            type: 'eip1559',
        }) as TransactionSerializedEIP1559
    }
    else {
        serializedTransaction = serializeTransaction({
            client: publicClient,
            chainId: chainId,
            to: destination,
            data: constructSweeplessTxData(),
            type: 'eip1559',
        }) as TransactionSerializedEIP1559
    }

    const fee = await getL1Fee({
        data: serializedTransaction,
        client: publicClient,
    })

    return fee;
}

export const resolveGas = async (options: ResolveGasArguments) => {
    const feeData = await resolveFeeData(options.publicClient)

    const estimatedGasLimit = options.contract_address ?
        await estimateERC20GasLimit(options)
        : await estimateNativeGasLimit(options)

    const multiplier = feeData.maxFeePerGas || feeData.gasPrice

    if (!multiplier)
        return undefined

    let totalGas = multiplier * estimatedGasLimit

    const gasCalculationType = NetworkSettings.KnownSettings[options.from.internal_name].GasCalculationType

    if (gasCalculationType == GasCalculation.OptimismType) {
        totalGas += await GetOpL1Fee(options);
    }
    const formattedGas = formatAmount(totalGas, options.nativeToken?.decimals)
    return {
        gas: formattedGas,
        token: options.currency?.asset,
        gasDetails: {
            gasLimit: Number(estimatedGasLimit),
            maxFeePerGas: feeData?.maxFeePerGas ? Number(formatGwei(feeData?.maxFeePerGas)) : undefined,
            gasPrice: feeData?.gasPrice ? Number(formatGwei(feeData?.gasPrice)) : undefined,
            maxPriorityFeePerGas: feeData?.maxPriorityFeePerGas ? Number(formatGwei(feeData?.maxPriorityFeePerGas)) : undefined,
        },
        request_time: new Date().toJSON()
    }
}

// Data is just "0x" for a non-contract (native token) transaction
const constructSweeplessTxData = (txData: string = "0x") => {
    const hexed_sequence_number = (99999999).toString(16)
    const sequence_number_even = hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number
    return `${txData}${sequence_number_even}` as `0x${string}`;
}