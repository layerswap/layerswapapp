import React, { FC, useState, useEffect } from 'react'
import { Steps } from '../Models/Wizard';
import { StarknetWindowObject } from 'get-starknet';
import { UserExchangesData } from '../lib/layerSwapApiClient';
import { erc20ABI, useAccount } from 'wagmi';
import { useFormikContext } from 'formik';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { multicall, fetchBalance, fetchFeeData, fetchBlockNumber } from '@wagmi/core'
import { formatEther } from 'viem'
import { NetworkAddressType } from '../Models/CryptoNetwork';

const WalletStateContext = React.createContext(null);
const WalletStateUpdateContext = React.createContext(null);

export type WizardProvider<T> = {
    starknetAccount: StarknetWindowObject,
    authorizedCoinbaseAccount: UserExchangesData,
    balances: Balance[]
}

type UpdateInterface<T> = {
    setStarknetAccount: (account: StarknetWindowObject) => void,
    setAuthorizedCoinbaseAccount: (value: UserExchangesData) => void,
    setBalances: (balances: Balance[]) => void
}

type Balance = {
    network: string,
    amount: any,
    token: string
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


export const WalletDataProvider: FC = <T extends Steps>({ children }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    const [authorizedCoinbaseAccount, setAuthorizedCoinbaseAccount] = useState<UserExchangesData>()
    const [balances, setBalances] = useState<Balance[]>()

    const { address } = useAccount()
    const { values } = useFormikContext<SwapFormValues>();
    const { from } = values
    const [feeData, setFeeData] = useState<Fee>()

    const formatAmount = (unformattedAmount: bigint | unknown, asset: string) => {
        const currency = from.assets.find(c => c.asset === asset)
        return (Number(BigInt(unformattedAmount.toString())) / Math.pow(10, currency?.decimals))
    }


    const prepareToFetchERC20 = from?.assets?.filter(a => a.contract_address).map(a => ({
        address: a?.contract_address as `0x${string}`,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address],
    }))

    useEffect(() => {
        if (from && address && from?.isExchange === false && from.address_type === NetworkAddressType.evm) {

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
                const contractBalances = contractRes?.map((d, index) => ({
                    network: from.internal_name,
                    token: from?.assets?.filter(a => a.contract_address)[index].asset,
                    amount: formatAmount(d.result, from?.assets?.filter(a => a.contract_address)[index].asset)
                }))
                const nativeBalance = {
                    network: from.internal_name,
                    token: from.native_currency,
                    amount: formatAmount(nativeTokenRes.value, from.native_currency)
                }
                setBalances(contractBalances?.concat(nativeBalance))
            })()
        } else {
            setBalances(undefined)
        }
    }, [from, address])

    return (
        <WalletStateContext.Provider value={{
            starknetAccount,
            authorizedCoinbaseAccount,
            balances
        }}>
            <WalletStateUpdateContext.Provider value={{
                setStarknetAccount,
                setAuthorizedCoinbaseAccount,
                setBalances
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