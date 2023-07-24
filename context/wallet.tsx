import React, { FC, useState, useEffect } from 'react'
import { StarknetWindowObject } from 'get-starknet';
import { UserExchangesData } from '../lib/layerSwapApiClient';
import { erc20ABI, useAccount, useNetwork } from 'wagmi';
import { createPublicClient, http, createWalletClient, getContract, parseUnits } from 'viem'
import { multicall, fetchBalance, fetchFeeData, FetchFeeDataResult } from '@wagmi/core'
import { NetworkAddressType } from '../Models/CryptoNetwork';
import { Layer } from '../Models/Layer';
import { supportedChains } from '../lib/chainConfigs';
import { Currency } from '../Models/Currency';

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
    setBalances: (balances: Balance[]) => void,
    setIsBalanceLoading: (loading: boolean) => void,
}

export type Balance = {
    network: string,
    amount: any,
    token: string,
    request_time: string,
    gas: number
}


export const WalletDataProvider: FC<{ from?: Layer, currency?: Currency }> = ({ children, from, currency }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    const [authorizedCoinbaseAccount, setAuthorizedCoinbaseAccount] = useState<UserExchangesData>()
    const [balances, setBalances] = useState<Balance[]>([])
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)

    const { address } = useAccount()

    const publicClient = createPublicClient({
        chain: supportedChains?.find(ch => ch.id === (from?.isExchange === false && Number(from?.chain_id))) ?? supportedChains[0],
        transport: http()
    })

    const walletClient = createWalletClient({
        chain: supportedChains?.find(ch => ch.id === (from?.isExchange === false && Number(from?.chain_id))) ?? supportedChains[0],
        transport: http()
    })

    const contract = getContract({
        address: from?.assets?.filter(a => a?.contract_address).find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`,
        abi: erc20ABI,
        walletClient,
        publicClient
    })

    const formatAmount = (unformattedAmount: bigint | unknown, asset: string) => {
        const currency = from.assets.find(c => c.asset === asset)
        return (Number(BigInt(unformattedAmount.toString())) / Math.pow(10, currency?.decimals))
    }

    const prepareToFetchERC20 = from?.assets?.filter(a => a.contract_address && a.status !== 'inactive').map(a => ({
        address: a?.contract_address as `0x${string}`,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address],
    }))

    const isBalanceOutDated = new Date().getTime() - (new Date(balances?.find(b => b?.network === from?.internal_name)?.request_time).getTime() || 0) > 60000

    useEffect(() => {
        if (from && isBalanceOutDated && address && from?.isExchange === false && from?.address_type === NetworkAddressType.evm) {

            (async () => {
                let contractRes: ({
                    error: Error;
                    result?: undefined;
                    status: "failure";
                } | {
                    error?: undefined;
                    result: unknown;
                    status: "success";
                })[];
                let nativeTokenRes: {
                    decimals: number
                    formatted: string
                    symbol: string
                    value: bigint
                };
                let estimatedNativeGasLimit: bigint
                let estimatedERC20GasLimit: bigint
                let feeData: FetchFeeDataResult

                setIsBalanceLoading(true)
                try {
                    feeData = await fetchFeeData({
                        chainId: from?.isExchange === false && Number(from?.chain_id),
                    })
                } catch (e) { console.log(e) }
                try {
                    contractRes = await multicall({
                        chainId: Number(from?.chain_id),
                        contracts: prepareToFetchERC20
                    })
                    if (contract.address) {
                        estimatedERC20GasLimit = await contract?.estimateGas?.transfer(
                            [address, BigInt(0)],
                            { account: address }
                        )
                    }
                } catch (e) { console.log(e) }

                try {
                    nativeTokenRes = await fetchBalance({
                        address: address,
                        chainId: Number(from?.chain_id)
                    })
                    estimatedNativeGasLimit = await publicClient.estimateGas({
                        account: address,
                        to: address,
                    })
                } catch (e) { console.log(e) }
                finally { setIsBalanceLoading(false) }
                const contractBalances = contractRes?.map((d, index) => {
                    const token = from?.assets?.filter(a => a.contract_address && a.status !== 'inactive')[index].asset
                    return {
                        network: from.internal_name,
                        token: token,
                        amount: formatAmount(d.result, token),
                        request_time: new Date().toJSON(),
                        gas: (contract.address && token === currency.asset) ? formatAmount(feeData.maxFeePerGas ? (feeData?.maxFeePerGas * estimatedERC20GasLimit) : (estimatedNativeGasLimit * feeData?.gasPrice), from.native_currency) : 0
                    }
                })
                const nativeBalance = {
                    network: from.internal_name,
                    token: from.native_currency,
                    amount: formatAmount(nativeTokenRes.value, from.native_currency),
                    request_time: new Date().toJSON(),
                    gas: formatAmount(feeData?.maxFeePerGas ? (feeData?.maxFeePerGas * estimatedNativeGasLimit) : (estimatedNativeGasLimit * feeData?.gasPrice), from.native_currency)
                }

                const filteredBalances = balances?.some(b => b?.network === from?.internal_name) ? balances?.filter(b => b?.network !== from.internal_name) : balances
                setBalances(filteredBalances?.concat(contractBalances, nativeBalance))
            })()
        }
    }, [from, address, currency])

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
                setBalances,
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