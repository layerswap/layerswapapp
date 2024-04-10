import { PublicClient } from "viem"
import formatAmount from "../../formatAmount"
import { erc20ABI } from "wagmi"
import { multicall, fetchBalance, FetchBalanceResult } from '@wagmi/core'
import { Network, NetworkWithTokens, Token } from "../../../Models/Network"
import { Balance } from "../../../Models/Balance"

export type ERC20ContractRes = ({
    error: Error;
    result?: undefined | null;
    status: "failure";
} | {
    error?: undefined | null;
    result: unknown;
    status: "success";
})

export const resolveERC20Balances = async (
    multicallRes: ERC20ContractRes[],
    from: NetworkWithTokens,
) => {
    const assets = from?.tokens?.filter(a => a.contract)
    if (!assets)
        return null
    const contractBalances = multicallRes?.map((d, index) => {
        const currency = assets[index]
        return {
            network: from.name,
            token: currency.symbol,
            amount: formatAmount(d.result, currency.decimals),
            request_time: new Date().toJSON(),
            decimals: currency.decimals,
            isNativeCurrency: false,
        }
    })
    return contractBalances
}

type GetBalanceArgs = {
    address: string,
    chainId: number,
    assets: Token[],
    publicClient: PublicClient,
    hasMulticall: boolean
}

export const getErc20Balances = async ({
    address,
    chainId,
    assets,
    publicClient,
    hasMulticall = false
}: GetBalanceArgs): Promise<ERC20ContractRes[] | null> => {

    const contracts = assets?.filter(a => a.contract).map(a => ({
        address: a?.contract as `0x${string}`,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address],
    }))

    try {
        if (hasMulticall) {
            const contractRes = await multicall({
                chainId: chainId,
                contracts: contracts
            })
            return contractRes
        }
        else {
            const balances: ERC20ContractRes[] = []
            for (let i = 0; i < contracts.length; i++) {
                try {
                    const contract = contracts[i]
                    const balance = await publicClient.readContract({
                        address: contract?.address as `0x${string}`,
                        abi: erc20ABI,
                        functionName: 'balanceOf',
                        args: [address as `0x${string}`]
                    })
                    balances.push({
                        status: "success",
                        result: balance,
                        error: undefined
                    })
                }
                catch (e) {
                    balances.push({
                        status: "failure",
                        result: null,
                        error: e?.message
                    })
                }
            }
            return balances
        }
    }
    catch (e) {
        //TODO: log the error to our logging service
        console.log(e);
        return null;
    }

}

export const getTokenBalance = async (address: `0x${string}`, chainId: number, contract?: `0x${string}`): Promise<FetchBalanceResult | null> => {

    try {
        const res = await fetchBalance({
            address,
            chainId,
            ...(contract ? { token: contract } : {})
        })
        return res
    } catch (e) {
        //TODO: log the error to our logging service
        console.log(e)
        return null
    }

}

export const resolveBalance = async (
    network: Network,
    token: Token,
    balanceData: FetchBalanceResult
) => {

    const nativeBalance: Balance = {
        network: network.name,
        token: token.symbol,
        amount: formatAmount(balanceData?.value, token.decimals),
        request_time: new Date().toJSON(),
        decimals: token.decimals,
        isNativeCurrency: true,
    }

    return nativeBalance
}