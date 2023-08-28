import React, { FC, useState, useEffect } from 'react'
import { StarknetWindowObject } from 'get-starknet';
import { UserExchangesData } from '../lib/layerSwapApiClient';
import { useAccount } from 'wagmi';
import { NetworkAddressType } from '../Models/CryptoNetwork';
import { Layer } from '../Models/Layer';
import { Currency } from '../Models/Currency';
import { Balance, estimateGas, estimateNativeGas, formatAmount, getErc20Balances, getNativeBalance, resolveERC20Balances, resolveFeeData, resolveNativeBalance } from '../helpers/balanceHelper';

const WalletStateContext = React.createContext(null);
const WalletStateUpdateContext = React.createContext(null);

export type WizardProvider = {
    starknetAccount: StarknetWindowObject,
    authorizedCoinbaseAccount: UserExchangesData,
    balances: Balance[],
    isBalanceLoading: boolean
}

type UpdateInterface = {
    setStarknetAccount: (account: StarknetWindowObject) => void,
    setAuthorizedCoinbaseAccount: (value: UserExchangesData) => void,
    getBalance: (from: Layer) => void,
    getGas: (from: Layer, currency: Currency) => void
}

export const WalletDataProvider: FC = ({ children }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    const [authorizedCoinbaseAccount, setAuthorizedCoinbaseAccount] = useState<UserExchangesData>()
    const [allBalances, setAllBalances] = useState<{ [address: string]: Balance[] }>({})
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)
    const { address } = useAccount()
    const balances = allBalances[address]

    async function getBalance(from: Layer) {
        const isBalanceOutDated = new Date().getTime() - (new Date(allBalances[address]?.find(b => b?.network === from?.internal_name)?.request_time).getTime() || 0) > 60000
        if (from && isBalanceOutDated && address && from?.isExchange === false && from?.address_type === NetworkAddressType.evm && !isNaN(Number(from?.chain_id))) {
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

            const nativeBalanceContractRes = await getNativeBalance(address, Number(from.chain_id))
            const nativeBalance = await resolveNativeBalance(from, nativeBalanceContractRes)
            const filteredBalances = allBalances[address]?.some(b => b?.network === from?.internal_name) ? allBalances[address]?.filter(b => b?.network !== from.internal_name) : allBalances[address] || []

            setAllBalances((data) => ({ ...data, [address]: filteredBalances?.concat(erc20Balances, nativeBalance) }))
            setIsBalanceLoading(false)
        }
    }

    async function getGas(from: Layer, currency: Currency) {
        const contract_address = from?.assets?.find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`
        const gasToChange = allBalances[address]
            ?.find((b) => {
                return from?.isExchange === false
                    && b?.network === from?.internal_name
                    && b?.token === currency?.asset
                    && b?.gas === null
            })
        const chainId = from?.isExchange === false && Number(from?.chain_id)

        if (gasToChange && chainId) {
            (async () => {

                setIsBalanceLoading(true)
                const feeData = await resolveFeeData(Number(from.chain_id))
                const estimatedGas = contract_address ?
                    await estimateGas(chainId, address, contract_address)
                    : await estimateNativeGas(chainId, address)

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
                            : (feeData?.gasPrice * estimatedGas)

                        item.gas = formatAmount(gasBigint, nativeBalance.decimals)
                        return { ...data }
                    })
                }
                setIsBalanceLoading(false)
            })()
        }
    }

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
                getBalance,
                getGas
            }}>
                {children}
            </WalletStateUpdateContext.Provider>
        </WalletStateContext.Provider >
    );
}

export function useWalletState<T>() {
    const data = React.useContext<WizardProvider>(WalletStateContext);
    if (data === undefined) {
        throw new Error('useWalletStateContext must be used within a WalletStateContext');
    }

    return data;
}

export function useWalletUpdate<T>() {
    const updateFns = React.useContext<UpdateInterface>(WalletStateUpdateContext);

    if (updateFns === undefined) {
        throw new Error('useWalletStateUpdateContext must be used within a WalletStateUpdateContext');
    }

    return updateFns;
}

