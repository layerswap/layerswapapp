import React, { FC, useState, useEffect } from 'react'
import { Steps } from '../Models/Wizard';
import { StarknetWindowObject } from 'get-starknet';
import { UserExchangesData } from '../lib/layerSwapApiClient';
import { GenerateCurrencyMenuItems } from '../components/Input/CurrencyFormField';
import { erc20ABI, useAccount } from 'wagmi';
import { useQueryState } from './query';
import { useSettingsState } from './settings';
import { useFormikContext } from 'formik';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { FilterCurrencies } from '../helpers/settingsHelper';
import { multicall, fetchBalance } from '@wagmi/core'

const WalletStateContext = React.createContext(null);
const WalletStateUpdateContext = React.createContext(null);

export type WizardProvider<T> = {
    starknetAccount: StarknetWindowObject,
    authorizedCoinbaseAccount: UserExchangesData,
}

type UpdateInterface<T> = {
    setStarknetAccount: (account: StarknetWindowObject) => void,
    setAuthorizedCoinbaseAccount: (value: UserExchangesData) => void,
}

type Balances = {
    network: string,
    amount: any,
    token: string
}


export const WalletDatadProvider: FC = <T extends Steps>({ children }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    const [authorizedCoinbaseAccount, setAuthorizedCoinbaseAccount] = useState<UserExchangesData>()
    const [balances, setBalances] = useState<Balances[]>([{ network: '', amount: 0, token: '' }])

    const { address } = useAccount()
    const query = useQueryState();
    const { currencies, resolveImgSrc } = useSettingsState()
    const { values } = useFormikContext<SwapFormValues>();
    const { from, to } = values
    const lockedCurrency = query?.lockAsset ? currencies?.find(c => c?.asset?.toUpperCase() === query?.asset?.toUpperCase()) : null
    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : FilterCurrencies(currencies, from, to)
    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies,
        from,
        resolveImgSrc,
        lockedCurrency
    )

    const prepareToFetchERC20 = currencyMenuItems.filter(c => from?.assets?.find(a => a.asset.toUpperCase() === c?.baseObject?.asset?.toUpperCase())?.contract_address).map(c => ({
        address: from?.assets?.find(a => a.asset.toUpperCase() === c?.baseObject?.asset?.toUpperCase())?.contract_address as `0x${string}`,
        abi: erc20ABI,
        functionName: 'balanceOf',
        args: [address],
    }))

    
    //shit
    useEffect(() => {
        if (from?.isExchange === false) {

            const fetchERC20Balances = async () => {
                const ERC20data = await multicall({
                    chainId: Number(from?.isExchange === false && from?.chain_id),
                    contracts: prepareToFetchERC20
                })

                setBalances([...balances, { amount: ERC20data[0]?.result, token: currencyMenuItems.find(c => from?.assets?.find(a => a.asset.toUpperCase() === c?.baseObject?.asset?.toUpperCase()))?.baseObject?.asset, network: '' }])
            }
            const fetchNativeTokenBalance = async () => {
                const data = await fetchBalance({
                    address: address,
                    chainId: Number(from?.chain_id)
                })
                setBalances([...balances, { amount: data[0]?.result, token: currencyMenuItems.find(c => !from?.assets?.find(a => a.asset.toUpperCase() === c?.baseObject?.asset?.toUpperCase()))?.baseObject?.asset, network: '' }])
            }

            fetchNativeTokenBalance()
            fetchERC20Balances()
            console.log(balances)
        }

    }, [from, to, address])

    return (
        <WalletStateContext.Provider value={{
            starknetAccount,
            authorizedCoinbaseAccount
        }}>
            <WalletStateUpdateContext.Provider value={{
                setStarknetAccount,
                setAuthorizedCoinbaseAccount
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