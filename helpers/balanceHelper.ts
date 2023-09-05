import { PublicClient, erc20ABI, usePublicClient } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem'
import { multicall, fetchBalance, fetchFeeData, FetchBalanceResult } from '@wagmi/core'
import { BaseL2Asset, Layer } from '../Models/Layer';
import { Currency } from '../Models/Currency';
import KnownInternalNames from '../lib/knownIds';
import { estimateFees } from '../lib/optimism/estimateFees';

export type ERC20ContractRes = ({
    error: Error;
    result?: undefined;
    status: "failure";
} | {
    error?: undefined;
    result: unknown;
    status: "success";
})

export type Balance = {
    network: string,
    amount: number,
    decimals: number,
    isNativeCurrency: boolean,
    token: string,
    request_time: string,
}

export type Gas = {
    token: string,
    gas: number,
}

export const resolveFeeData = async (chainId: number) => {
    try {
        const feeData = await fetchFeeData({
            chainId,
        })
        return feeData
    } catch (e) {
        //TODO: log the error to our logging service
        console.log(e)
        return null;
    }
}

export const resolveERC20Balances = async (
    multicallRes: ERC20ContractRes[],
    from: Layer & { isExchange: false },
) => {
    const contractBalances = multicallRes?.map((d, index) => {
        const currency = from?.assets?.filter(a => a.contract_address && a.status !== 'inactive')[index]
        return {
            network: from.internal_name,
            token: currency.asset,
            amount: formatAmount(d.result, currency?.decimals),
            request_time: new Date().toJSON(),
            decimals: currency.decimals,
            isNativeCurrency: false,
        }
    })
    return contractBalances
}

export const getErc20Balances = async (address: string, chainId: number, assets: BaseL2Asset[]): Promise<ERC20ContractRes[] | null> => {

    const contracts = assets?.filter(a => a.contract_address && a.status !== 'inactive').map(a => ({
        address: a?.contract_address as `0x${string}`,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address],
    }))

    try {
        const contractRes = await multicall({
            chainId: chainId,
            contracts: contracts
        })
        return contractRes
    }
    catch (e) {
        //TODO: log the error to our logging service
        console.log(e);
        return null;
    }

}

export const getNativeBalance = async (address: `0x${string}`, chainId: number): Promise<FetchBalanceResult | null> => {

    try {
        const nativeTokenRes = await fetchBalance({
            address,
            chainId
        })
        return nativeTokenRes
    } catch (e) {
        //TODO: log the error to our logging service
        console.log(e)
        return null
    }

}

export const resolveNativeBalance = async (
    from: Layer & { isExchange: false },
    nativeTokenRes: FetchBalanceResult
) => {
    const native_currency = from.assets.find(a => a.asset === from.native_currency)
    const nativeBalance: Balance = {
        network: from.internal_name,
        token: from.native_currency,
        amount: formatAmount(nativeTokenRes?.value, native_currency?.decimals),
        request_time: new Date().toJSON(),
        decimals: native_currency.decimals,
        isNativeCurrency: true,
    }

    return nativeBalance
}

export const estimateNativeGas = async (publicClient: PublicClient, account: `0x${string}`, destination?: `0x${string}`) => {

    const to = destination || account;

    let encodedData = encodeFunctionData({
        abi: erc20ABI,
        functionName: 'transfer',
        args: [
            to,
            parseEther("0.1"),
        ]
    });

    const hexed_sequence_number = (99999999).toString(16)
    const sequence_number_even = hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number

    encodedData = encodedData ? `${encodedData}${sequence_number_even}` as `0x${string}` : null;

    const gasEstimate = await publicClient.estimateGas({
        account: account,
        to: to,
        data: encodedData,
    })

    return gasEstimate
}

export const estimateGas = async (publicClient: PublicClient, contract_address: `0x${string}`, account: `0x${string}`, destination?: `0x${string}`) => {

    const estimatedERC20GasLimit = await publicClient.estimateContractGas({
        address: contract_address,
        abi: erc20ABI,
        functionName: 'transfer',
        account,
        args: [destination || account, BigInt(0)]
    });

    return estimatedERC20GasLimit;
}

export const resolveGas = async (publicClient: PublicClient, chainId: number, contract_address: `0x${string}`, account: `0x${string}`, balances: Balance[], from: string, currency: Currency) => {
    const nativeBalance = balances?.find(b =>
        b.network === from
        && b.isNativeCurrency)

    let fee: Gas

    switch (from) {
        case KnownInternalNames.Networks.OptimismMainnet:
            fee = await GetOptimismGas(publicClient, chainId, account, nativeBalance, currency)
            break;
        default:
            fee = await GetGas(publicClient, chainId, account, nativeBalance, currency, contract_address)
    }

    return fee
}

const GetOptimismGas = async (publicClient: PublicClient, chainId: number, account: `0x${string}`, nativeBalance: Balance, currency: Currency) => {

    var dummyAddress = "0x3535353535353535353535353535353535353535" as const;
    const amount = BigInt(100000000)

    const fee = await estimateFees({
        client: publicClient,
        functionName: 'transfer',
        abi: erc20ABI,
        args: [dummyAddress, amount],
        account: account,
        chainId: chainId,
        to: dummyAddress
    })

    return { gas: formatAmount(fee, nativeBalance?.decimals), token: currency?.asset }
}

const GetGas = async (publicClient: PublicClient, chainId: number, account: `0x${string}`, nativeBalance: Balance, currency: Currency, contract_address: `0x${string}`) => {
    const feeData = await resolveFeeData(Number(chainId))
    const estimatedGas = contract_address ?
        await estimateGas(publicClient, account, contract_address)
        : await estimateNativeGas(publicClient, account)

    const gasBigint = feeData.maxFeePerGas
        ? (feeData?.maxFeePerGas * estimatedGas)
        : (feeData?.gasPrice * estimatedGas)

    return { gas: formatAmount(gasBigint, nativeBalance?.decimals), token: currency?.asset }
}

export const formatAmount = (unformattedAmount: bigint | unknown, decimals: number) => {
    return (Number(BigInt(unformattedAmount?.toString() || 0)) / Math.pow(10, decimals))
}