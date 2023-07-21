import React, { FC, useState, useEffect } from 'react'
import { StarknetWindowObject } from 'get-starknet';
import { UserExchangesData } from '../lib/layerSwapApiClient';
import { erc20ABI, useAccount } from 'wagmi';
import { multicall, fetchBalance, fetchFeeData } from '@wagmi/core'
import { NetworkAddressType } from '../Models/CryptoNetwork';
import { Layer } from '../Models/Layer';

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

type Balance = {
    network: string,
    amount: any,
    token: string,
    request_time: string
}

type Fee = {
    gasPrice: bigint
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    formatted: {
        gasPrice: string
        maxFeePerGas: string
        maxPriorityFeePerGas: string
    }
}


export const WalletDataProvider: FC<{ from?: Layer }> = ({ children, from }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    const [authorizedCoinbaseAccount, setAuthorizedCoinbaseAccount] = useState<UserExchangesData>()
    const [balances, setBalances] = useState<Balance[]>([])
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)

    const { address } = useAccount()
    const [feeData, setFeeData] = useState<Fee>()

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

    const isBalanceOutDated = new Date().getTime() - (new Date(balances?.find(b => b.network === from?.internal_name)?.request_time).getTime() || 0) > 60000

    useEffect(() => {
        if (from && address && from?.isExchange === false && from?.address_type === NetworkAddressType.evm && isBalanceOutDated) {

            (async () => {
                const feeData = await fetchFeeData({
                    chainId: Number(from.chain_id),
                })
                setFeeData(feeData)
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
                setIsBalanceLoading(true)
                try {
                    contractRes = await multicall({
                        chainId: Number(from?.chain_id),
                        contracts: prepareToFetchERC20
                    })
                } catch (e) { console.log(e) }

                try {
                    nativeTokenRes = await fetchBalance({
                        address: address,
                        chainId: Number(from?.chain_id)
                    })
                } catch (e) { console.log(e) }
                finally { setIsBalanceLoading(false) }
                const contractBalances = contractRes?.map((d, index) => ({
                    network: from.internal_name,
                    token: from?.assets?.filter(a => a.contract_address)[index].asset,
                    amount: formatAmount(d.result, from?.assets?.filter(a => a.contract_address)[index].asset),
                    request_time: new Date().toJSON()
                }))
                const nativeBalance = {
                    network: from.internal_name,
                    token: from.native_currency,
                    amount: formatAmount(nativeTokenRes.value, from.native_currency),
                    request_time: new Date().toJSON()
                }
                const filteredBalances = balances.some(b => b.network === from.internal_name) ? balances?.filter(b => b.network !== from.internal_name) : balances
                setBalances(filteredBalances.concat(contractBalances, nativeBalance))
            })()
        }
    }, [from, address])

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