'use client'
import { WalletProvider } from '@layerswap/widget/types';
import { useSettingsState, useWalletStore, useWalletProvidersList } from '@layerswap/widget/internal';
import { Context, FC, createContext, useCallback, useContext, useMemo, useState } from 'react';

type ActiveAccountState = {
    activeConnection?: Account
    setActiveAddress: (account: Account) => void
    evmProvider: WalletProvider
    starknetProvider: WalletProvider
}

export const ActiveParadexAccountContext = createContext<ActiveAccountState | undefined>(undefined);

type Account = {
    id: string
    l1Address: string,
    providerName: "Starknet" | "EVM"
}

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const ActiveParadexAccountProvider: FC<Props> = ({ children }) => {
    const [selectedAccount, setSelectedAccount] = useState<Account>()
    const { networks } = useSettingsState()

    const walletProviders = useWalletProvidersList()
    const evmProvider = walletProviders.find(provider => provider.id === 'evm')
    const starknetProvider = walletProviders.find(provider => provider.id === 'starknet')
    const evmConnectionProvider = evmProvider.walletConnectionProvider({ networks })
    const starknetConnectionProvider = starknetProvider.walletConnectionProvider({ networks })
    const paradexAccounts = useWalletStore((state) => state.paradexAccounts)
    const activeConnection: Account | undefined = useMemo(() => {
        if (!paradexAccounts) return undefined
        const l1Addresses = Object.keys(paradexAccounts || {})
        const selectedProvider = selectedAccount && (selectedAccount.providerName === "EVM" ? evmConnectionProvider : starknetConnectionProvider);
        const selectedAccountIsAvailable = selectedAccount && selectedProvider?.connectedWallets?.some(w => w.id === selectedAccount.id && w.addresses.some(wa => wa.toLowerCase() === selectedAccount.l1Address.toLowerCase()));
        if (selectedAccountIsAvailable) {
            return selectedAccount;
        }
        else {
            const evmWallet = evmConnectionProvider.connectedWallets?.find(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
            const starknetWallet = starknetConnectionProvider.connectedWallets?.find(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
            const defaultWallet = evmWallet || starknetWallet
            if (!defaultWallet) return undefined
            return {
                id: defaultWallet.id,
                providerName: defaultWallet.providerName as "Starknet" | "EVM",
                l1Address: defaultWallet.addresses.find(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase()))!
            }
        }
    }, [evmConnectionProvider, starknetConnectionProvider, paradexAccounts, selectedAccount])

    const setActiveAddress = useCallback((account: Account) => {
        setSelectedAccount(account)
    }, [])

    return (
        <ActiveParadexAccountContext.Provider value={{ activeConnection, setActiveAddress, evmProvider, starknetProvider }}>
            {children}
        </ActiveParadexAccountContext.Provider>
    )
}

export function useActiveParadexAccount() {
    const data = useContext(ActiveParadexAccountContext as Context<ActiveAccountState>)
    if (data === null) {
        throw new Error('useActiveParadexAccount must be used within a ActiveParadexAccountProvider')
    }
    return data
}