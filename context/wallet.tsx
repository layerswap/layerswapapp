import React, { FC, useState, useEffect } from 'react'
import { StarknetWindowObject } from 'get-starknet';
import LayerSwapApiClient, { UserExchangesData } from '../lib/layerSwapApiClient';
import { erc20ABI, useAccount, useNetwork } from 'wagmi';
import { createPublicClient, http, createWalletClient, getContract, parseUnits, } from 'viem'
import { multicall, fetchBalance, fetchFeeData, FetchFeeDataResult, FetchBalanceResult } from '@wagmi/core'
import { NetworkAddressType } from '../Models/CryptoNetwork';
import { BaseL2Asset, Layer } from '../Models/Layer';
import { supportedChains } from '../lib/chainConfigs';
import { Currency } from '../Models/Currency';
import useSWR from 'swr'

const WalletStateContext = React.createContext(null);
const WalletStateUpdateContext = React.createContext(null);

export type WizardProvider<T> = {
    starknetAccount: StarknetWindowObject,
    authorizedCoinbaseAccount: UserExchangesData,
    balances: Balance[],
    isBalanceLoading: boolean
}

type UpdateInterface<T> = {
    setStarknetAccount: (account: StarknetWindowObject) => void,
    setAuthorizedCoinbaseAccount: (value: UserExchangesData) => void,
    setIsBalanceLoading: (loading: boolean) => void,
}

export type Balance = {
    network: string,
    amount: any,
    decimals: number,
    isNativeCurrency: boolean,
    token: string,
    request_time: string,
    gas: number
}

export const WalletDataProvider: FC<{ from?: Layer, currency?: Currency }> = ({ children, from, currency }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    const [authorizedCoinbaseAccount, setAuthorizedCoinbaseAccount] = useState<UserExchangesData>()
    const [allBalances, setAllBalances] = useState<{ [address: string]: Balance[] }>({})
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)
    const { address } = useAccount()
    const balances = allBalances[address]


    const contract_address = from?.assets?.filter(a => a?.contract_address).find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`

    const isBalanceOutDated = new Date().getTime() - (new Date(allBalances[address]?.find(b => b?.network === from?.internal_name)?.request_time).getTime() || 0) > 60000

    useEffect(() => {
        if (from && isBalanceOutDated && address && from?.isExchange === false && from?.address_type === NetworkAddressType.evm && !isNaN(Number(from?.chain_id))) {
            (async () => {
                setIsBalanceLoading(true)

                const erc20BalancesContractRes = await getErc20Balances(
                    address,
                    Number(from?.chain_id),
                    from.assets
                );

                const erc20Balances = await resolveERC20Balances(
                    erc20BalancesContractRes,
                    from
                );

                const nativeBalanceContractRes = await getNativeBalance(address, Number(from.chain_id), from.assets)
                const nativeBalance = await resolveNativeBalance(from, nativeBalanceContractRes)
                const balances = [...(erc20Balances || []), nativeBalance]
                setAllBalances((data) => ({ ...data, [address]: balances }))
                setIsBalanceLoading(false)

            })()
        }
    }, [from, address])

    const gasToChange = allBalances[address]
        ?.find((b) => {
            return from?.isExchange === false
                && b?.network === from?.internal_name
                && b?.token === currency?.asset
                && b?.gas === null
        })
    const chainId = from?.isExchange === false && Number(from?.chain_id)

    useEffect(() => {
        if (gasToChange && chainId) {
            (async () => {

                setIsBalanceLoading(true)
                const feeData = await resolveFeeData(Number(from.chain_id))
                const estimatedGas = await estimateGas(chainId, contract_address, address)

                if (estimatedGas) {
                    setAllBalances(data => {
                        const nativeBalance = data[address]?.find(b =>
                            b?.network === gasToChange?.network
                            && b.isNativeCurrency)

                        const item = data[address]?.find(b =>
                            b?.network === gasToChange?.network
                            && b?.token === gasToChange?.token)

                        const gasBigint = feeData.maxFeePerGas
                            ? (feeData?.maxFeePerGas * estimatedGas)
                            : (estimatedGas * feeData?.gasPrice)
                        item.gas = formatAmount(gasBigint, nativeBalance.decimals)
                        return { ...data }
                    })
                }
                setIsBalanceLoading(false)

            })()
        }
    }, [gasToChange, chainId, contract_address])
    console.log("balances", balances)
    return (
        <WalletStateContext.Provider value={{
            starknetAccount,
            authorizedCoinbaseAccount,
            balances,
            isBalanceLoading
        }}>
            <WalletStateUpdateContext.Provider value={{
                setStarknetAccount,
                setAuthorizedCoinbaseAccount,
                setIsBalanceLoading
            }}>
                {children}
            </WalletStateUpdateContext.Provider>
        </WalletStateContext.Provider >
    );
}

export function useWalletState<T>() {
    const data = React.useContext<WizardProvider<T>>((WalletStateContext as unknown) as React.Context<WizardProvider<T>>);
    if (data === undefined) {
        throw new Error('useWalletStateContext must be used within a WalletStateContext');
    }

    return data;
}

export function useWalletUpdate<T>() {
    const updateFns = React.useContext<UpdateInterface<T>>(WalletStateUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useWalletStateUpdateContext must be used within a WalletStateUpdateContext');
    }

    return updateFns;
}

type ERC20ContractRes = ({
    error: Error;
    result?: undefined;
    status: "failure";
} | {
    error?: undefined;
    result: unknown;
    status: "success";
})

const resolveFeeData = async (chainId: number) => {
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

const resolveERC20Balances = async (
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
            gas: null
        }
    })
    return contractBalances
}

const getErc20Balances = async (address: string, chainId: number, assets: BaseL2Asset[]): Promise<ERC20ContractRes[] | null> => {

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

const getNativeBalance = async (address: `0x${string}`, chainId: number, assets: BaseL2Asset[]): Promise<FetchBalanceResult | null> => {

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

const resolveNativeBalance = async (
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
        gas: null
    }

    return nativeBalance
}

const estimateGas = async (chainId: number, contract_address: `0x${string}`, address: `0x${string}`) => {
    const chain = supportedChains?.find(ch => ch.id === chainId) ?? supportedChains[0];
    const publicClient = createPublicClient({
        chain: chain,
        transport: http()
    })

    const walletClient = createWalletClient({
        chain: chain,
        transport: http()
    })

    const contract = getContract({
        address: contract_address,
        abi: erc20ABI,
        walletClient,
        publicClient
    })

    try {
        if (!contract.address)
            return null

        const estimatedERC20GasLimit = await contract?.estimateGas?.transfer(
            [address, BigInt(0)],
            { account: address }
        )
        return estimatedERC20GasLimit
    } catch (e) {
        //TODO: log the error to our logging service
        console.log(e)
        return null
    }

}

const formatAmount = (unformattedAmount: bigint | unknown, decimals: number) => {
    return (Number(BigInt(unformattedAmount?.toString() || 0)) / Math.pow(10, decimals))
}
