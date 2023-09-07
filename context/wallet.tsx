import React, { FC, useState } from 'react'
import { StarknetWindowObject } from 'get-starknet';
import { useAccount, usePublicClient } from 'wagmi';
import { NetworkAddressType } from '../Models/CryptoNetwork';
import { Layer } from '../Models/Layer';
import { Currency } from '../Models/Currency';
import { Balance, Gas, getErc20Balances, getNativeBalance, resolveERC20Balances, resolveGas, resolveNativeBalance } from '../helpers/balanceHelper';

export const WalletStateContext = React.createContext(null);
const WalletStateUpdateContext = React.createContext(null);

export type WizardProvider = {
    starknetAccount: StarknetWindowObject,
    balances: Balance[],
    gases: { [network: string]: Gas[] },
    isBalanceLoading: boolean,
    isGasLoading: boolean
}

type UpdateInterface = {
    setStarknetAccount: (account: StarknetWindowObject) => void,
    getBalance: (from: Layer) => Promise<void>,
    getGas: (from: Layer, currency: Currency) => Promise<void>,
    MutateBalanceAndGas: (from: Layer, currency: Currency) => Promise<void>
}

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const WalletDataProvider: FC<Props> = ({ children }) => {
    const [starknetAccount, setStarknetAccount] = useState<StarknetWindowObject>()
    const [allBalances, setAllBalances] = useState<{ [address: string]: Balance[] }>({})
    const [allGases, setAllGases] = useState<{ [network: string]: Gas[] }>({})
    const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(false)
    const [isGasLoading, setIsGasLoading] = useState<boolean>(false)
    const { address } = useAccount()
    const balances = allBalances[address]
    const gases = allGases
    const publicClient = usePublicClient()

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

            const filteredBalances = balances?.some(b => b?.network === from?.internal_name) ? balances?.filter(b => b?.network !== from.internal_name) : balances || []

            setAllBalances((data) => ({ ...data, [address]: filteredBalances?.concat(erc20Balances, nativeBalance) }))
            setIsBalanceLoading(false)
        }
    }

    async function getGas(from: Layer, currency: Currency) {
        const contract_address = from?.assets?.find(a => a?.asset === currency?.asset)?.contract_address as `0x${string}`
        const shouldNotFetchGas = allGases[from?.internal_name]?.some(g => g.token === currency?.asset && g.gas && !isNaN(g.gas))
        const chainId = from?.isExchange === false && Number(from?.chain_id)

        if (!shouldNotFetchGas && chainId && currency) {
            (async () => {
                setIsGasLoading(true)
                try {

                    const gas = await resolveGas(publicClient, chainId, contract_address, address, balances, from.internal_name, currency)
                    const filteredGases = allGases[from.internal_name]?.some(b => b?.token === currency?.asset) ? allGases[from.internal_name].filter(g => g.token !== currency.asset) : allGases[from.internal_name] || []
                    if (gas) {
                        setAllGases((data) => ({ ...data, [from.internal_name]: filteredGases.concat(gas) }))
                    }
                }
                catch (e) { console.log(e) }
                finally { setIsGasLoading(false) }
            })()
        }
    }

    const MutateBalanceAndGas = async (from: Layer, currency: Currency) => {
        await getBalance(from)
        await getGas(from, currency)
    }

    return (
        <WalletStateContext.Provider value={{
            starknetAccount,
            balances,
            gases,
            isBalanceLoading,
            isGasLoading
        }}>
            <WalletStateUpdateContext.Provider value={{
                setStarknetAccount,
                getBalance,
                getGas,
                MutateBalanceAndGas
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

